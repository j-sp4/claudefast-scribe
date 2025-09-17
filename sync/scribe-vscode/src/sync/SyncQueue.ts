import * as vscode from 'vscode';
import { ScribeClient } from '../api/ScribeClient';
import { ConfigurationManager } from '../config/Configuration';
import { Logger } from '../utils/logger';
import { SignificantChange } from '../watchers/ChangeDetector';

export interface SyncItem {
    id: string;
    change: SignificantChange;
    timestamp: Date;
    retryCount: number;
    status: 'pending' | 'syncing' | 'success' | 'failed';
    error?: string;
}

export interface SyncBatch {
    id: string;
    items: SyncItem[];
    priority: 'high' | 'medium' | 'low';
    createdAt: Date;
}

export class SyncQueue {
    private queue: SyncItem[] = [];
    private processing: boolean = false;
    private batchTimer?: NodeJS.Timeout;
    private syncHistory: SyncItem[] = [];
    private maxRetries: number = 3;
    private isPaused: boolean = false;
    private onStatusChange?: (status: string) => void;

    constructor(
        private client: ScribeClient,
        private config: ConfigurationManager
    ) {}

    add(change: SignificantChange): void {
        if (this.isPaused) {
            Logger.info('Sync queue is paused, skipping change');
            return;
        }

        // Check for duplicates
        const existingItem = this.queue.find(item => 
            item.change.uri.toString() === change.uri.toString() &&
            item.status === 'pending'
        );

        if (existingItem) {
            // Update existing item with latest change
            existingItem.change = change;
            existingItem.timestamp = new Date();
            Logger.debug(`Updated existing queue item for ${change.uri.fsPath}`);
        } else {
            // Add new item to queue
            const item: SyncItem = {
                id: this.generateId(),
                change,
                timestamp: new Date(),
                retryCount: 0,
                status: 'pending'
            };

            this.queue.push(item);
            Logger.info(`Added to sync queue: ${change.uri.fsPath} (priority: ${change.priority})`);
        }

        // Schedule batch processing
        this.scheduleBatch();
        this.notifyStatusChange();
    }

    private generateId(): string {
        return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private scheduleBatch(): void {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        if (this.processing || this.isPaused) {
            return;
        }

        const delay = this.config.getSyncDelay();
        this.batchTimer = setTimeout(() => {
            this.processBatch();
        }, delay);

        Logger.debug(`Batch processing scheduled in ${delay}ms`);
    }

    private async processBatch(): Promise<void> {
        if (this.processing || this.queue.length === 0 || this.isPaused) {
            return;
        }

        this.processing = true;
        this.notifyStatusChange();

        try {
            // Get items to process (max 10 per batch)
            const batchSize = 10;
            const pendingItems = this.queue
                .filter(item => item.status === 'pending')
                .sort((a, b) => {
                    // Sort by priority
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    const aPriority = priorityOrder[a.change.priority];
                    const bPriority = priorityOrder[b.change.priority];
                    return aPriority - bPriority;
                })
                .slice(0, batchSize);

            if (pendingItems.length === 0) {
                Logger.debug('No pending items to process');
                return;
            }

            Logger.info(`Processing batch of ${pendingItems.length} items`);

            // Mark items as syncing
            pendingItems.forEach(item => {
                item.status = 'syncing';
            });

            // Convert to changes array for API
            const changes = pendingItems.map(item => item.change);

            try {
                // Sync with server
                await this.client.syncChanges(changes);

                // Mark as success
                pendingItems.forEach(item => {
                    item.status = 'success';
                    this.moveToHistory(item);
                });

                Logger.info(`✅ Successfully synced ${pendingItems.length} items`);
                
                // Show success notification
                const fileCount = pendingItems.length;
                const message = fileCount === 1 
                    ? `Synced 1 file to Scribe`
                    : `Synced ${fileCount} files to Scribe`;
                vscode.window.setStatusBarMessage(`$(check) ${message}`, 3000);

            } catch (error) {
                Logger.error('Batch sync failed', error);
                
                // Handle failed items
                for (const item of pendingItems) {
                    await this.handleFailedItem(item, error);
                }
            }

            // Remove successful items from queue
            this.queue = this.queue.filter(item => item.status !== 'success');

            // Process next batch if there are more items
            if (this.queue.some(item => item.status === 'pending')) {
                setTimeout(() => this.processBatch(), 1000);
            }

        } finally {
            this.processing = false;
            this.notifyStatusChange();
        }
    }

    private async handleFailedItem(item: SyncItem, error: any): Promise<void> {
        item.retryCount++;
        item.error = error?.message || 'Unknown error';

        if (item.retryCount < this.maxRetries) {
            // Mark for retry
            item.status = 'pending';
            
            // Exponential backoff for retry
            const retryDelay = Math.min(1000 * Math.pow(2, item.retryCount), 30000);
            Logger.info(`Will retry ${item.change.uri.fsPath} in ${retryDelay}ms (attempt ${item.retryCount}/${this.maxRetries})`);
            
            setTimeout(() => {
                if (item.status === 'pending') {
                    this.scheduleBatch();
                }
            }, retryDelay);
        } else {
            // Max retries reached
            item.status = 'failed';
            this.moveToHistory(item);
            
            Logger.error(`Failed to sync ${item.change.uri.fsPath} after ${this.maxRetries} attempts`);
            vscode.window.showWarningMessage(
                `Failed to sync ${vscode.workspace.asRelativePath(item.change.uri)}: ${item.error}`
            );
        }
    }

    private moveToHistory(item: SyncItem): void {
        this.syncHistory.unshift(item);
        
        // Keep only last 100 items in history
        if (this.syncHistory.length > 100) {
            this.syncHistory = this.syncHistory.slice(0, 100);
        }
    }

    async forceSync(): Promise<void> {
        if (this.isPaused) {
            Logger.info('Resuming sync queue for force sync');
            this.isPaused = false;
        }

        // Cancel any pending batch timer
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = undefined;
        }

        // Process immediately
        await this.processBatch();
    }

    pause(): void {
        this.isPaused = true;
        
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = undefined;
        }

        Logger.info('Sync queue paused');
        this.notifyStatusChange();
    }

    resume(): void {
        this.isPaused = false;
        Logger.info('Sync queue resumed');
        
        if (this.queue.some(item => item.status === 'pending')) {
            this.scheduleBatch();
        }
        
        this.notifyStatusChange();
    }

    clear(): void {
        this.queue = [];
        
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = undefined;
        }
        
        Logger.info('Sync queue cleared');
        this.notifyStatusChange();
    }

    getStatus(): {
        isPaused: boolean;
        isProcessing: boolean;
        queueLength: number;
        pendingCount: number;
        failedCount: number;
        historyCount: number;
    } {
        return {
            isPaused: this.isPaused,
            isProcessing: this.processing,
            queueLength: this.queue.length,
            pendingCount: this.queue.filter(i => i.status === 'pending').length,
            failedCount: this.queue.filter(i => i.status === 'failed').length,
            historyCount: this.syncHistory.length
        };
    }

    getHistory(): SyncItem[] {
        return [...this.syncHistory];
    }

    getQueue(): SyncItem[] {
        return [...this.queue];
    }

    onStatusChanged(callback: (status: string) => void): void {
        this.onStatusChange = callback;
    }

    private notifyStatusChange(): void {
        if (!this.onStatusChange) {
            return;
        }

        const status = this.getStatus();
        let statusText = '';

        if (status.isPaused) {
            statusText = 'Paused';
        } else if (status.isProcessing) {
            statusText = 'Syncing...';
        } else if (status.pendingCount > 0) {
            statusText = `${status.pendingCount} pending`;
        } else {
            statusText = 'Ready';
        }

        this.onStatusChange(statusText);
    }

    dispose(): void {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
    }
}