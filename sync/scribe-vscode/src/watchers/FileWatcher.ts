import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/Configuration';
import { SyncQueue } from '../sync/SyncQueue';
import { Logger } from '../utils/logger';
import { ChangeDetector } from './ChangeDetector';
// @ts-ignore
const debounce = require('debounce');

export interface ChangeEvent {
    uri: vscode.Uri;
    type: 'create' | 'change' | 'delete';
    timestamp: Date;
}

export class FileWatcher {
    private watchers: Map<string, vscode.FileSystemWatcher> = new Map();
    private changeQueue: ChangeEvent[] = [];
    private changeDetector: ChangeDetector;
    private debouncedSync: () => void;
    private isActive: boolean = false;

    constructor(
        private config: ConfigurationManager,
        private syncQueue: SyncQueue
    ) {
        this.changeDetector = new ChangeDetector(config);
        
        // Create debounced sync function
        const syncDelay = config.getSyncDelay();
        this.debouncedSync = debounce(this.processQueue.bind(this), syncDelay);
    }

    async start(): Promise<void> {
        if (this.isActive) {
            Logger.warn('FileWatcher is already active');
            return;
        }

        Logger.info('🔍 Starting file watchers...');
        
        const patterns = this.config.getWatchPatterns();
        const ignorePatterns = this.config.getIgnorePatterns();
        
        Logger.info(`Watching patterns: ${patterns.join(', ')}`);
        Logger.info(`Ignoring patterns: ${ignorePatterns.join(', ')}`);
        
        for (const pattern of patterns) {
            this.createWatcher(pattern);
        }
        
        this.isActive = true;
        Logger.info('✅ File watchers started');
    }

    async stop(): Promise<void> {
        if (!this.isActive) {
            return;
        }

        Logger.info('⏹️ Stopping file watchers...');
        
        for (const [pattern, watcher] of this.watchers) {
            watcher.dispose();
            Logger.debug(`Disposed watcher for pattern: ${pattern}`);
        }
        
        this.watchers.clear();
        this.changeQueue = [];
        this.isActive = false;
        
        Logger.info('✅ File watchers stopped');
    }

    async restart(): Promise<void> {
        await this.stop();
        await this.start();
    }

    private createWatcher(pattern: string): void {
        try {
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);
            
            // Register event handlers
            watcher.onDidCreate((uri) => this.handleFileEvent(uri, 'create'));
            watcher.onDidChange((uri) => this.handleFileEvent(uri, 'change'));
            watcher.onDidDelete((uri) => this.handleFileEvent(uri, 'delete'));
            
            this.watchers.set(pattern, watcher);
            Logger.debug(`Created watcher for pattern: ${pattern}`);
        } catch (error) {
            Logger.error(`Failed to create watcher for pattern: ${pattern}`, error);
        }
    }

    private handleFileEvent(uri: vscode.Uri, type: 'create' | 'change' | 'delete'): void {
        // Check if file should be ignored
        if (this.shouldIgnore(uri)) {
            Logger.debug(`Ignoring ${type} event for: ${uri.fsPath}`);
            return;
        }
        
        Logger.info(`📝 File ${type}: ${uri.fsPath}`);
        
        // Add to change queue
        const event: ChangeEvent = {
            uri,
            type,
            timestamp: new Date()
        };
        
        this.changeQueue.push(event);
        
        // Trigger debounced sync
        this.debouncedSync();
    }

    private shouldIgnore(uri: vscode.Uri): boolean {
        const ignorePatterns = this.config.getIgnorePatterns();
        const filePath = uri.fsPath;
        
        for (const pattern of ignorePatterns) {
            // Convert glob pattern to regex for simple matching
            const regex = this.globToRegex(pattern);
            if (regex.test(filePath)) {
                return true;
            }
        }
        
        return false;
    }

    private globToRegex(glob: string): RegExp {
        // Simple glob to regex conversion
        let regex = glob.replace(/\*\*/g, '.*');
        regex = regex.replace(/\*/g, '[^/]*');
        regex = regex.replace(/\?/g, '.');
        return new RegExp(regex);
    }

    private async processQueue(): Promise<void> {
        if (this.changeQueue.length === 0) {
            return;
        }
        
        Logger.info(`🚀 Processing ${this.changeQueue.length} changes...`);
        
        // Group changes by type for efficient processing
        const grouped = this.groupChanges(this.changeQueue);
        
        // Clear the queue
        this.changeQueue = [];
        
        try {
            // Analyze changes
            const significantChanges = await this.changeDetector.analyzeChanges(grouped);
            
            if (significantChanges.length === 0) {
                Logger.info('No significant changes to sync');
                return;
            }
            
            // Add to sync queue
            for (const change of significantChanges) {
                this.syncQueue.add(change);
            }
            
            Logger.info(`✅ Added ${significantChanges.length} changes to sync queue`);
        } catch (error) {
            Logger.error('Failed to process change queue', error);
            vscode.window.showErrorMessage(`Scribe sync failed: ${error}`);
        }
    }

    private groupChanges(events: ChangeEvent[]): Map<string, ChangeEvent[]> {
        const grouped = new Map<string, ChangeEvent[]>();
        
        for (const event of events) {
            const key = event.uri.toString();
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(event);
        }
        
        return grouped;
    }

    dispose(): void {
        this.stop();
    }
}