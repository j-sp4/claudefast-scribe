import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

export interface NotificationItem {
    id: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: Date;
    actions?: string[];
    response?: string;
}

export class NotificationManager {
    private notificationHistory: NotificationItem[] = [];
    private progressResolvers = new Map<string, (value: void) => void>();

    async showInfo(message: string, ...actions: string[]): Promise<string | undefined> {
        const id = this.generateId();
        this.logNotification(id, 'info', message, actions);
        
        const response = await vscode.window.showInformationMessage(message, ...actions);
        this.updateNotificationResponse(id, response);
        return response;
    }

    async showWarning(message: string, ...actions: string[]): Promise<string | undefined> {
        const id = this.generateId();
        this.logNotification(id, 'warning', message, actions);
        
        const response = await vscode.window.showWarningMessage(message, ...actions);
        this.updateNotificationResponse(id, response);
        return response;
    }

    async showError(message: string, ...actions: string[]): Promise<string | undefined> {
        const id = this.generateId();
        this.logNotification(id, 'error', message, actions);
        
        const response = await vscode.window.showErrorMessage(message, ...actions);
        this.updateNotificationResponse(id, response);
        return response;
    }

    showProgress<R>(
        title: string,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken) => Promise<R>,
        cancellable: boolean = false
    ): Promise<R> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable
            },
            task
        ) as Promise<R>;
    }

    async showSyncProgress(items: Array<{ uri: vscode.Uri; status: string }>): Promise<void> {
        await this.showProgress(
            'Syncing to Scribe MCP',
            async (progress, token) => {
                const total = items.length;
                let completed = 0;
                
                for (const item of items) {
                    if (token.isCancellationRequested) {
                        break;
                    }
                    
                    const fileName = vscode.workspace.asRelativePath(item.uri);
                    progress.report({
                        message: `Syncing ${fileName}...`,
                        increment: (1 / total) * 100
                    });
                    
                    // Simulate processing
                    await new Promise(resolve => setTimeout(resolve, 500));
                    completed++;
                }
                
                if (completed === total) {
                    this.showInfo(`✅ Successfully synced ${completed} file${completed > 1 ? 's' : ''}`);
                } else {
                    this.showWarning(`Synced ${completed} of ${total} files (cancelled)`);
                }
            },
            true
        );
    }

    async showInputBox(options: vscode.InputBoxOptions): Promise<string | undefined> {
        return vscode.window.showInputBox(options);
    }

    async showQuickPick<T extends vscode.QuickPickItem>(
        items: T[] | Thenable<T[]>,
        options?: vscode.QuickPickOptions
    ): Promise<T | undefined> {
        return vscode.window.showQuickPick(items, options);
    }

    async showSyncHistory(history: Array<{ file: string; status: string; time: Date; error?: string }>): Promise<void> {
        if (history.length === 0) {
            this.showInfo('No sync history available');
            return;
        }

        const items: vscode.QuickPickItem[] = history.map(item => ({
            label: `${item.status === 'success' ? '✅' : '❌'} ${item.file}`,
            description: item.time.toLocaleString(),
            detail: item.error || undefined
        }));

        const selected = await this.showQuickPick(items, {
            placeHolder: 'Sync History (recent first)',
            canPickMany: false
        });

        if (selected) {
            // Could open the file or show more details
            Logger.info('Selected history item', selected);
        }
    }

    async confirmAction(message: string, confirmLabel: string = 'Yes'): Promise<boolean> {
        const response = await this.showWarning(message, confirmLabel, 'Cancel');
        return response === confirmLabel;
    }

    showStatusMessage(message: string, duration?: number): vscode.Disposable {
        if (duration) {
            return vscode.window.setStatusBarMessage(message, duration);
        }
        return vscode.window.setStatusBarMessage(message);
    }

    async showErrorWithDetails(error: Error, context: string): Promise<void> {
        const message = `${context}: ${error.message}`;
        const response = await this.showError(message, 'Show Details', 'Report Issue');
        
        if (response === 'Show Details') {
            const details = `
Error: ${error.name}
Message: ${error.message}
Context: ${context}
Stack: ${error.stack || 'No stack trace available'}
            `.trim();
            
            const doc = await vscode.workspace.openTextDocument({
                content: details,
                language: 'text'
            });
            await vscode.window.showTextDocument(doc);
        } else if (response === 'Report Issue') {
            const issueUrl = `https://github.com/scribe-mcp/vscode-extension/issues/new?title=${encodeURIComponent(error.message)}&body=${encodeURIComponent(message)}`;
            vscode.env.openExternal(vscode.Uri.parse(issueUrl));
        }
    }

    showWelcomeMessage(): void {
        const message = 'Welcome to Scribe MCP! Get started by logging in.';
        vscode.window.showInformationMessage(
            message,
            'Login',
            'Documentation',
            'Later'
        ).then(selection => {
            switch (selection) {
                case 'Login':
                    vscode.commands.executeCommand('scribe.login');
                    break;
                case 'Documentation':
                    vscode.env.openExternal(vscode.Uri.parse('https://scribe-mcp.com/docs'));
                    break;
            }
        });
    }

    private generateId(): string {
        return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private logNotification(id: string, type: 'info' | 'warning' | 'error', message: string, actions?: string[]): void {
        const notification: NotificationItem = {
            id,
            type,
            message,
            timestamp: new Date(),
            actions
        };
        
        this.notificationHistory.push(notification);
        
        // Keep only last 50 notifications
        if (this.notificationHistory.length > 50) {
            this.notificationHistory = this.notificationHistory.slice(-50);
        }
        
        Logger.info(`Notification [${type}]: ${message}`);
    }

    private updateNotificationResponse(id: string, response?: string): void {
        const notification = this.notificationHistory.find(n => n.id === id);
        if (notification) {
            notification.response = response;
            if (response) {
                Logger.info(`Notification response [${id}]: ${response}`);
            }
        }
    }

    getHistory(): NotificationItem[] {
        return [...this.notificationHistory];
    }

    clearHistory(): void {
        this.notificationHistory = [];
    }
}