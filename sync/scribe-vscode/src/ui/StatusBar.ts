import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

export type SyncStatus = 'ready' | 'syncing' | 'error' | 'offline' | 'paused' | 'authenticated' | 'unauthenticated';

export class StatusBar {
    private statusBarItem: vscode.StatusBarItem;
    private syncCount: number = 0;
    private lastSync?: Date;
    private currentStatus: SyncStatus = 'ready';
    private errorCount: number = 0;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'scribe.showStatus';
        this.statusBarItem.show();
        this.updateStatus('ready');
    }

    updateStatus(status: SyncStatus, details?: string): void {
        this.currentStatus = status;
        
        switch (status) {
            case 'ready':
                this.statusBarItem.text = '$(cloud) Scribe: Ready';
                this.statusBarItem.backgroundColor = undefined;
                this.statusBarItem.tooltip = this.createTooltip('Connected and ready to sync', details);
                break;
                
            case 'syncing':
                this.statusBarItem.text = '$(sync~spin) Scribe: Syncing...';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                this.statusBarItem.tooltip = this.createTooltip('Syncing files to Scribe MCP', details);
                break;
                
            case 'error':
                this.errorCount++;
                this.statusBarItem.text = `$(error) Scribe: Error (${this.errorCount})`;
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                this.statusBarItem.tooltip = this.createTooltip('Sync error occurred', details);
                break;
                
            case 'offline':
                this.statusBarItem.text = '$(cloud-offline) Scribe: Offline';
                this.statusBarItem.backgroundColor = undefined;
                this.statusBarItem.tooltip = this.createTooltip('Cannot connect to Scribe server', details);
                break;
                
            case 'paused':
                this.statusBarItem.text = '$(debug-pause) Scribe: Paused';
                this.statusBarItem.backgroundColor = undefined;
                this.statusBarItem.tooltip = this.createTooltip('Sync is paused', details);
                break;
                
            case 'authenticated':
                this.statusBarItem.text = '$(account) Scribe: Logged In';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
                this.statusBarItem.tooltip = this.createTooltip('Authenticated with Scribe', details);
                
                // Show briefly then return to ready
                setTimeout(() => {
                    if (this.currentStatus === 'authenticated') {
                        this.updateStatus('ready');
                    }
                }, 3000);
                break;
                
            case 'unauthenticated':
                this.statusBarItem.text = '$(account) Scribe: Login Required';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                this.statusBarItem.tooltip = this.createTooltip('Click to login to Scribe', details);
                this.statusBarItem.command = 'scribe.login';
                break;
        }
        
        Logger.debug(`Status bar updated: ${status}`, { details });
    }

    updateSyncCount(count: number): void {
        this.syncCount = count;
        
        if (count > 0) {
            const currentText = this.statusBarItem.text;
            const baseText = currentText.replace(/ \(\d+\)$/, '');
            this.statusBarItem.text = `${baseText} (${count})`;
        }
        
        this.updateTooltip();
    }

    updateLastSync(date: Date): void {
        this.lastSync = date;
        this.updateTooltip();
    }

    updateProgress(current: number, total: number): void {
        const percentage = Math.round((current / total) * 100);
        this.statusBarItem.text = `$(sync~spin) Scribe: Syncing... ${percentage}%`;
        this.statusBarItem.tooltip = `Syncing ${current}/${total} files`;
    }

    showTemporaryMessage(message: string, duration: number = 3000): void {
        const previousText = this.statusBarItem.text;
        const previousBg = this.statusBarItem.backgroundColor;
        const previousTooltip = this.statusBarItem.tooltip;
        
        this.statusBarItem.text = message;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        
        setTimeout(() => {
            this.statusBarItem.text = previousText;
            this.statusBarItem.backgroundColor = previousBg;
            this.statusBarItem.tooltip = previousTooltip;
        }, duration);
    }

    private createTooltip(primary: string, details?: string): string {
        const lines = [primary];
        
        if (details) {
            lines.push(`\n${details}`);
        }
        
        if (this.syncCount > 0) {
            lines.push(`\n📝 ${this.syncCount} files pending sync`);
        }
        
        if (this.lastSync) {
            const timeAgo = this.getTimeAgo(this.lastSync);
            lines.push(`\n⏰ Last sync: ${timeAgo}`);
        }
        
        if (this.errorCount > 0) {
            lines.push(`\n⚠️ ${this.errorCount} errors occurred`);
        }
        
        lines.push('\n\nClick for more details');
        
        return lines.join('');
    }

    private updateTooltip(): void {
        this.statusBarItem.tooltip = this.createTooltip(
            this.getStatusDescription(this.currentStatus)
        );
    }

    private getStatusDescription(status: SyncStatus): string {
        switch (status) {
            case 'ready':
                return 'Connected and ready to sync';
            case 'syncing':
                return 'Syncing files to Scribe MCP';
            case 'error':
                return 'Sync error occurred';
            case 'offline':
                return 'Cannot connect to Scribe server';
            case 'paused':
                return 'Sync is paused';
            case 'authenticated':
                return 'Authenticated with Scribe';
            case 'unauthenticated':
                return 'Authentication required';
            default:
                return 'Scribe MCP';
        }
    }

    private getTimeAgo(date: Date): string {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        
        if (seconds < 60) {
            return 'just now';
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (seconds < 86400) {
            const hours = Math.floor(seconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(seconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    }

    resetErrorCount(): void {
        this.errorCount = 0;
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}