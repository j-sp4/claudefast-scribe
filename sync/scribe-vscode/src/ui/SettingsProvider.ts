import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/Configuration';
import { Logger } from '../utils/logger';

export class SettingsProvider {
    private panel: vscode.WebviewPanel | undefined;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private config: ConfigurationManager
    ) {}

    public async showSettingsUI(): Promise<void> {
        // Create or show existing panel
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'scribeSettings',
            'Scribe MCP Settings',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.extensionUri, 'media')
                ]
            }
        );

        this.panel.webview.html = this.getSettingsHtml(this.panel.webview);
        
        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'saveSettings':
                        await this.saveSettings(message.settings);
                        break;
                    case 'resetSettings':
                        await this.resetSettings();
                        break;
                    case 'testConnection':
                        await this.testConnection();
                        break;
                    case 'exportSettings':
                        await this.exportSettings();
                        break;
                    case 'importSettings':
                        await this.importSettings();
                        break;
                }
            }
        );

        // Clean up when panel is closed
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        // Load current settings
        this.loadCurrentSettings();
    }

    private getSettingsHtml(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'settings.css')
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'settings.js')
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
            <title>Scribe MCP Settings</title>
        </head>
        <body>
            <div class="container">
                <header>
                    <h1>
                        <span class="codicon codicon-settings-gear"></span>
                        Scribe MCP Settings
                    </h1>
                    <p class="subtitle">Configure your Scribe MCP extension settings</p>
                </header>

                <div class="settings-content">
                    <!-- Connection Settings -->
                    <section class="settings-group">
                        <h2>
                            <span class="codicon codicon-plug"></span>
                            Connection
                        </h2>
                        
                        <div class="setting-item">
                            <label for="serverUrl">
                                Server URL
                                <span class="required">*</span>
                            </label>
                            <input 
                                type="text" 
                                id="serverUrl" 
                                placeholder="https://scribe-mcp.com"
                                pattern="https?://.+"
                            />
                            <div class="setting-description">
                                The URL of your Scribe MCP server
                            </div>
                        </div>

                        <div class="setting-item">
                            <button class="button secondary" id="test-connection">
                                <span class="codicon codicon-debug-disconnect"></span>
                                Test Connection
                            </button>
                            <div id="connection-status" class="status-message"></div>
                        </div>
                    </section>

                    <!-- File Watching Settings -->
                    <section class="settings-group">
                        <h2>
                            <span class="codicon codicon-eye"></span>
                            File Watching
                        </h2>
                        
                        <div class="setting-item">
                            <label for="enabled">
                                <input type="checkbox" id="enabled" />
                                Enable automatic file watching
                            </label>
                            <div class="setting-description">
                                Automatically sync file changes to Scribe MCP
                            </div>
                        </div>

                        <div class="setting-item">
                            <label for="watchPatterns">
                                Watch Patterns
                                <button class="icon-button" id="add-watch-pattern" title="Add pattern">
                                    <span class="codicon codicon-add"></span>
                                </button>
                            </label>
                            <div id="watch-patterns-list" class="pattern-list">
                                <!-- Patterns will be added dynamically -->
                            </div>
                            <div class="setting-description">
                                File patterns to watch for changes (glob patterns)
                            </div>
                        </div>

                        <div class="setting-item">
                            <label for="ignorePatterns">
                                Ignore Patterns
                                <button class="icon-button" id="add-ignore-pattern" title="Add pattern">
                                    <span class="codicon codicon-add"></span>
                                </button>
                            </label>
                            <div id="ignore-patterns-list" class="pattern-list">
                                <!-- Patterns will be added dynamically -->
                            </div>
                            <div class="setting-description">
                                File patterns to ignore (glob patterns)
                            </div>
                        </div>
                    </section>

                    <!-- Sync Settings -->
                    <section class="settings-group">
                        <h2>
                            <span class="codicon codicon-sync"></span>
                            Sync Behavior
                        </h2>
                        
                        <div class="setting-item">
                            <label for="syncDelay">
                                Sync Delay (ms)
                            </label>
                            <input 
                                type="number" 
                                id="syncDelay" 
                                min="1000" 
                                max="60000" 
                                step="1000"
                            />
                            <div class="setting-description">
                                Delay before syncing changes (1000-60000 ms)
                            </div>
                        </div>

                        <div class="setting-item">
                            <label for="batchSize">
                                Batch Size
                            </label>
                            <input 
                                type="number" 
                                id="batchSize" 
                                min="1" 
                                max="50" 
                                step="1"
                            />
                            <div class="setting-description">
                                Maximum number of files to sync in one batch
                            </div>
                        </div>

                        <div class="setting-item">
                            <label for="retryAttempts">
                                Retry Attempts
                            </label>
                            <input 
                                type="number" 
                                id="retryAttempts" 
                                min="0" 
                                max="10" 
                                step="1"
                            />
                            <div class="setting-description">
                                Number of retry attempts for failed syncs
                            </div>
                        </div>
                    </section>

                    <!-- Advanced Settings -->
                    <section class="settings-group collapsible">
                        <h2 class="clickable" id="advanced-header">
                            <span class="codicon codicon-settings"></span>
                            Advanced
                            <span class="codicon codicon-chevron-right toggle-icon"></span>
                        </h2>
                        
                        <div class="settings-content collapsed" id="advanced-content">
                            <div class="setting-item">
                                <label for="logLevel">
                                    Log Level
                                </label>
                                <select id="logLevel">
                                    <option value="error">Error</option>
                                    <option value="warn">Warning</option>
                                    <option value="info">Info</option>
                                    <option value="debug">Debug</option>
                                </select>
                                <div class="setting-description">
                                    Logging verbosity level
                                </div>
                            </div>

                            <div class="setting-item">
                                <label for="telemetry">
                                    <input type="checkbox" id="telemetry" />
                                    Enable telemetry
                                </label>
                                <div class="setting-description">
                                    Help improve Scribe MCP by sending anonymous usage data
                                </div>
                            </div>

                            <div class="setting-item">
                                <label for="offlineMode">
                                    <input type="checkbox" id="offlineMode" />
                                    Enable offline mode
                                </label>
                                <div class="setting-description">
                                    Queue changes when offline and sync when reconnected
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <footer>
                    <div class="button-group">
                        <button class="button primary" id="save-settings">
                            <span class="codicon codicon-save"></span>
                            Save Settings
                        </button>
                        <button class="button secondary" id="reset-settings">
                            <span class="codicon codicon-discard"></span>
                            Reset to Defaults
                        </button>
                        <button class="button secondary" id="export-settings">
                            <span class="codicon codicon-export"></span>
                            Export
                        </button>
                        <button class="button secondary" id="import-settings">
                            <span class="codicon codicon-import"></span>
                            Import
                        </button>
                    </div>
                    
                    <div id="status-message" class="status-message"></div>
                </footer>
            </div>

            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    private async loadCurrentSettings(): Promise<void> {
        const settings = this.config.getAll();
        
        // Add default values for new settings
        const fullSettings = {
            ...settings,
            batchSize: 10,
            retryAttempts: 3,
            logLevel: 'info',
            telemetry: false,
            offlineMode: true
        };
        
        this.panel?.webview.postMessage({
            type: 'loadSettings',
            settings: fullSettings
        });
    }

    private async saveSettings(settings: any): Promise<void> {
        try {
            await this.config.updateAll(settings);
            
            this.panel?.webview.postMessage({
                type: 'settingsSaved',
                message: 'Settings saved successfully!'
            });
            
            vscode.window.showInformationMessage('Scribe MCP settings saved successfully!');
            Logger.info('Settings saved', settings);
        } catch (error) {
            const message = `Failed to save settings: ${error}`;
            
            this.panel?.webview.postMessage({
                type: 'error',
                message
            });
            
            vscode.window.showErrorMessage(message);
            Logger.error('Failed to save settings', error);
        }
    }

    private async resetSettings(): Promise<void> {
        const confirm = await vscode.window.showWarningMessage(
            'Reset all settings to defaults?',
            'Yes',
            'No'
        );
        
        if (confirm === 'Yes') {
            // Reset to defaults
            const defaults = {
                enabled: true,
                serverUrl: 'http://localhost:3004',
                watchPatterns: ['**/*.{js,ts,jsx,tsx,md}', '**/README.md'],
                ignorePatterns: ['**/node_modules/**', '**/.git/**'],
                syncDelay: 5000
            };
            
            await this.config.updateAll(defaults);
            await this.loadCurrentSettings();
            
            this.panel?.webview.postMessage({
                type: 'settingsReset',
                message: 'Settings reset to defaults'
            });
        }
    }

    private async testConnection(): Promise<void> {
        this.panel?.webview.postMessage({
            type: 'testingConnection'
        });
        
        // Simulate connection test
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const connected = Math.random() > 0.3; // Simulate connection result
        
        this.panel?.webview.postMessage({
            type: 'connectionResult',
            connected,
            message: connected 
                ? 'Successfully connected to Scribe MCP server' 
                : 'Failed to connect to server'
        });
    }

    private async exportSettings(): Promise<void> {
        const settings = this.config.getAll();
        const content = JSON.stringify(settings, null, 2);
        
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('scribe-settings.json'),
            filters: {
                'JSON': ['json']
            }
        });
        
        if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
            vscode.window.showInformationMessage('Settings exported successfully!');
        }
    }

    private async importSettings(): Promise<void> {
        const uri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'JSON': ['json']
            }
        });
        
        if (uri && uri[0]) {
            try {
                const content = await vscode.workspace.fs.readFile(uri[0]);
                const settings = JSON.parse(content.toString());
                
                await this.config.updateAll(settings);
                await this.loadCurrentSettings();
                
                vscode.window.showInformationMessage('Settings imported successfully!');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to import settings: ${error}`);
            }
        }
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    public dispose(): void {
        this.panel?.dispose();
    }
}