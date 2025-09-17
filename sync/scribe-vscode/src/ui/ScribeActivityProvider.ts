import * as vscode from 'vscode';
import { SyncQueue } from '../sync/SyncQueue';
import { AuthManager } from '../auth/AuthManager';
import { ConfigurationManager } from '../config/Configuration';
import { ScribeClient } from '../api/ScribeClient';
import { Logger } from '../utils/logger';

export class ScribeActivityProvider implements vscode.WebviewViewProvider, vscode.Disposable {
    public static readonly viewType = 'scribe.activity';
    private _view?: vscode.WebviewView;
    private _updateTimer?: NodeJS.Timeout;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private authManager: AuthManager,
        private syncQueue: SyncQueue,
        private scribeClient: ScribeClient,
        private config: ConfigurationManager
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, 'media'),
                vscode.Uri.joinPath(this.extensionUri, 'out')
            ]
        };

        webviewView.webview.html = this.getHtmlContent(webviewView.webview);
        this.setupMessageHandling(webviewView.webview);
        this.startDataUpdates();

        // Handle visibility changes
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.startDataUpdates();
            } else {
                this.stopDataUpdates();
            }
        });

        // Initial data load
        this.updateWebviewData();
    }

    private getHtmlContent(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'activity.css')
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'activity.js')
        );
        const codiconsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'codicon.css')
        );

        const nonce = this.getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
            <link href="${codiconsUri}" rel="stylesheet">
            <link href="${styleUri}" rel="stylesheet">
            <title>Scribe Activity</title>
        </head>
        <body>
            <!-- Connection Status -->
            <div class="section" id="connection-section">
                <div class="section-header">
                    <span class="codicon codicon-cloud"></span>
                    <h3>Connection Status</h3>
                </div>
                <div class="section-content" id="connection-status">
                    <div class="status-item">
                        <span class="label">Server:</span>
                        <span class="value" id="server-url">Loading...</span>
                    </div>
                    <div class="status-item">
                        <span class="label">User:</span>
                        <span class="value" id="user-email">Not logged in</span>
                    </div>
                    <div class="status-item">
                        <span class="label">Last Sync:</span>
                        <span class="value" id="last-sync">Never</span>
                    </div>
                </div>
                <div class="actions">
                    <button class="action-button" id="login-btn" style="display:none;">
                        <span class="codicon codicon-account"></span> Login
                    </button>
                    <button class="action-button" id="logout-btn" style="display:none;">
                        <span class="codicon codicon-sign-out"></span> Logout
                    </button>
                </div>
            </div>

            <!-- Sync Queue -->
            <div class="section" id="queue-section">
                <div class="section-header">
                    <span class="codicon codicon-sync"></span>
                    <h3>Sync Queue</h3>
                    <span class="badge" id="queue-badge">0</span>
                </div>
                <div class="section-content">
                    <div class="queue-stats">
                        <div class="stat">
                            <span class="stat-value" id="pending-count">0</span>
                            <span class="stat-label">Pending</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value" id="synced-count">0</span>
                            <span class="stat-label">Synced</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value" id="failed-count">0</span>
                            <span class="stat-label">Failed</span>
                        </div>
                    </div>
                    <div class="actions">
                        <button class="action-button" id="sync-now-btn">
                            <span class="codicon codicon-sync"></span> Sync Now
                        </button>
                        <button class="action-button" id="pause-btn">
                            <span class="codicon codicon-debug-pause"></span> Pause
                        </button>
                        <button class="action-button" id="clear-btn">
                            <span class="codicon codicon-trash"></span> Clear
                        </button>
                    </div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="section" id="activity-section">
                <div class="section-header">
                    <span class="codicon codicon-history"></span>
                    <h3>Recent Activity</h3>
                </div>
                <div class="section-content">
                    <ul class="activity-list" id="activity-list">
                        <li class="empty-state">No activity yet</li>
                    </ul>
                </div>
            </div>

            <!-- Watched Paths -->
            <div class="section collapsible" id="paths-section">
                <div class="section-header clickable" id="paths-header">
                    <span class="codicon codicon-folder"></span>
                    <h3>Watched Paths</h3>
                    <span class="codicon codicon-chevron-down toggle-icon"></span>
                </div>
                <div class="section-content collapsed" id="paths-content">
                    <ul class="path-list" id="watch-paths">
                        <li>Loading...</li>
                    </ul>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="section" id="actions-section">
                <div class="section-header">
                    <span class="codicon codicon-zap"></span>
                    <h3>Quick Actions</h3>
                </div>
                <div class="section-content">
                    <div class="quick-actions">
                        <button class="quick-action" id="show-status">
                            <span class="codicon codicon-info"></span>
                            <span>Status</span>
                        </button>
                        <button class="quick-action" id="open-settings">
                            <span class="codicon codicon-settings-gear"></span>
                            <span>Settings</span>
                        </button>
                        <button class="quick-action" id="show-logs">
                            <span class="codicon codicon-output"></span>
                            <span>Logs</span>
                        </button>
                        <button class="quick-action" id="show-help">
                            <span class="codicon codicon-question"></span>
                            <span>Help</span>
                        </button>
                    </div>
                </div>
            </div>

            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    private setupMessageHandling(webview: vscode.Webview): void {
        webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'login':
                        await vscode.commands.executeCommand('scribe.login');
                        break;
                    case 'logout':
                        await vscode.commands.executeCommand('scribe.logout');
                        break;
                    case 'syncNow':
                        await vscode.commands.executeCommand('scribe.syncNow');
                        break;
                    case 'pause':
                        await vscode.commands.executeCommand('scribe.pauseSync');
                        break;
                    case 'resume':
                        await vscode.commands.executeCommand('scribe.resumeSync');
                        break;
                    case 'clear':
                        await vscode.commands.executeCommand('scribe.clearQueue');
                        break;
                    case 'showStatus':
                        await vscode.commands.executeCommand('scribe.showStatus');
                        break;
                    case 'openSettings':
                        await vscode.commands.executeCommand('scribe.openSettings');
                        break;
                    case 'showLogs':
                        await vscode.commands.executeCommand('scribe.showLogs');
                        break;
                    case 'showHelp':
                        vscode.env.openExternal(vscode.Uri.parse('https://scribe-mcp.com/docs'));
                        break;
                }
            }
        );
    }

    private startDataUpdates(): void {
        this.stopDataUpdates();
        
        // Update immediately
        this.updateWebviewData();
        
        // Then update every 2 seconds
        this._updateTimer = setInterval(() => {
            this.updateWebviewData();
        }, 2000);
    }

    private stopDataUpdates(): void {
        if (this._updateTimer) {
            clearInterval(this._updateTimer);
            this._updateTimer = undefined;
        }
    }

    private async updateWebviewData(): Promise<void> {
        if (!this._view) {
            return;
        }

        const user = this.authManager.getCurrentUser();
        const queueStatus = this.syncQueue.getStatus();
        const history = this.syncQueue.getHistory().slice(0, 10); // Last 10 items
        const config = this.config.getAll();

        const data = {
            type: 'update',
            connection: {
                serverUrl: config.serverUrl,
                user: user,
                isAuthenticated: this.authManager.isAuthenticated()
            },
            queue: {
                ...queueStatus,
                isPaused: queueStatus.isPaused
            },
            activity: history.map(item => ({
                file: vscode.workspace.asRelativePath(item.change.uri),
                status: item.status,
                time: item.timestamp.toLocaleTimeString(),
                error: item.error
            })),
            paths: {
                watch: config.watchPatterns,
                ignore: config.ignorePatterns
            }
        };

        await this._view.webview.postMessage(data);
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    public refresh(): void {
        this.updateWebviewData();
    }

    public updateSyncStatus(): void {
        this.updateWebviewData();
    }

    public dispose(): void {
        this.stopDataUpdates();
        this._view = undefined;
    }
}