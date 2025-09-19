# Phase 3: User Experience & UI

**Duration**: Week 3 (5 days)
**Goal**: Build comprehensive UI components for optimal user experience

## Objectives

1. Create activity panel with sync history
2. Build settings UI for easy configuration
3. Implement rich notification system
4. Add command palette integration
5. Support workspace-specific configurations

## Technical Specifications

### UI Architecture
```
┌─────────────────────────────────────────┐
│            Activity Bar                  │
│  ┌─────┐                                │
│  │ 📚 │ ← Scribe Icon                  │
│  └─────┘                                │
└─────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│         Activity Panel (Sidebar)         │
├─────────────────────────────────────────┤
│  📊 Sync Status                         │
│  ├─ Connected to: scribe-mcp.app       │
│  ├─ Last sync: 2 minutes ago           │
│  └─ Queue: 3 pending                   │
├─────────────────────────────────────────┤
│  📝 Recent Activity                     │
│  ├─ ✅ README.md synced (2m ago)       │
│  ├─ ✅ api/auth.ts synced (5m ago)     │
│  ├─ ⏳ components/Nav.tsx pending      │
│  └─ ❌ test.js failed (retry in 30s)   │
├─────────────────────────────────────────┤
│  📁 Watched Paths                       │
│  ├─ src/**/*.{ts,tsx}                  │
│  ├─ docs/**/*.md                       │
│  └─ README.md                          │
├─────────────────────────────────────────┤
│  ⚡ Quick Actions                       │
│  ├─ [Sync Now] [Pause] [Settings]      │
│  └─ [View Logs] [Clear Queue]          │
└─────────────────────────────────────────┘
```

### Key Components

#### 1. Activity Panel Provider
```typescript
// src/ui/ScribeActivityProvider.ts
export class ScribeActivityProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'scribe.activity';
    private _view?: vscode.WebviewView;
    
    constructor(
        private readonly extensionUri: vscode.Uri,
        private syncQueue: SyncQueue,
        private auth: AuthManager
    ) {}
    
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };
        
        webviewView.webview.html = this.getHtmlContent(webviewView.webview);
        this.setupMessageHandling(webviewView.webview);
        this.startDataUpdates();
    }
    
    private getHtmlContent(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'style.css')
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'activity.js')
        );
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
        </head>
        <body>
            <div id="sync-status" class="section">
                <h3>📊 Sync Status</h3>
                <div id="connection-info"></div>
                <div id="sync-stats"></div>
            </div>
            
            <div id="recent-activity" class="section">
                <h3>📝 Recent Activity</h3>
                <ul id="activity-list"></ul>
            </div>
            
            <div id="watched-paths" class="section">
                <h3>📁 Watched Paths</h3>
                <ul id="paths-list"></ul>
            </div>
            
            <div id="quick-actions" class="section">
                <h3>⚡ Quick Actions</h3>
                <button id="sync-now">Sync Now</button>
                <button id="pause">Pause</button>
                <button id="settings">Settings</button>
            </div>
            
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }
    
    private setupMessageHandling(webview: vscode.Webview): void {
        webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'syncNow':
                        this.syncQueue.forceSync();
                        break;
                    case 'pause':
                        this.syncQueue.pause();
                        break;
                    case 'openSettings':
                        vscode.commands.executeCommand('workbench.action.openSettings', 'scribe');
                        break;
                }
            }
        );
    }
    
    public updateActivity(activity: ActivityItem[]): void {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateActivity',
                data: activity
            });
        }
    }
}
```

#### 2. Settings UI Provider
```typescript
// src/ui/SettingsProvider.ts
export class SettingsProvider {
    constructor(private config: Configuration) {}
    
    public async showSettingsUI(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'scribeSettings',
            'Scribe Settings',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );
        
        panel.webview.html = this.getSettingsHtml(panel.webview);
        
        panel.webview.onDidReceiveMessage(
            async message => {
                if (message.command === 'saveSettings') {
                    await this.saveSettings(message.settings);
                    vscode.window.showInformationMessage('Scribe settings saved successfully!');
                }
            }
        );
    }
    
    private getSettingsHtml(webview: vscode.Webview): string {
        const currentSettings = this.config.getAllSettings();
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Scribe Settings</title>
            <style>
                body { padding: 20px; font-family: var(--vscode-font-family); }
                .setting-group { margin-bottom: 20px; }
                label { display: block; margin-bottom: 5px; }
                input, select { width: 100%; padding: 5px; margin-bottom: 10px; }
                button { padding: 10px 20px; background: var(--vscode-button-background); }
            </style>
        </head>
        <body>
            <h1>Scribe Settings</h1>
            
            <div class="setting-group">
                <h2>Connection</h2>
                <label for="serverUrl">Server URL</label>
                <input type="text" id="serverUrl" value="${currentSettings.serverUrl}" />
                
                <label for="apiKey">API Key</label>
                <input type="password" id="apiKey" placeholder="Enter API key" />
            </div>
            
            <div class="setting-group">
                <h2>File Watching</h2>
                <label for="watchPatterns">Watch Patterns (one per line)</label>
                <textarea id="watchPatterns" rows="5">${currentSettings.watchPatterns.join('\\n')}</textarea>
                
                <label for="ignorePatterns">Ignore Patterns (one per line)</label>
                <textarea id="ignorePatterns" rows="5">${currentSettings.ignorePatterns.join('\\n')}</textarea>
            </div>
            
            <div class="setting-group">
                <h2>Sync Behavior</h2>
                <label for="syncDelay">Sync Delay (ms)</label>
                <input type="number" id="syncDelay" value="${currentSettings.syncDelay}" />
                
                <label for="batchSize">Batch Size</label>
                <input type="number" id="batchSize" value="${currentSettings.batchSize}" />
                
                <label for="autoSync">
                    <input type="checkbox" id="autoSync" ${currentSettings.autoSync ? 'checked' : ''} />
                    Enable Auto-sync
                </label>
            </div>
            
            <button onclick="saveSettings()">Save Settings</button>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function saveSettings() {
                    const settings = {
                        serverUrl: document.getElementById('serverUrl').value,
                        apiKey: document.getElementById('apiKey').value,
                        watchPatterns: document.getElementById('watchPatterns').value.split('\\n').filter(p => p),
                        ignorePatterns: document.getElementById('ignorePatterns').value.split('\\n').filter(p => p),
                        syncDelay: parseInt(document.getElementById('syncDelay').value),
                        batchSize: parseInt(document.getElementById('batchSize').value),
                        autoSync: document.getElementById('autoSync').checked
                    };
                    
                    vscode.postMessage({
                        command: 'saveSettings',
                        settings
                    });
                }
            </script>
        </body>
        </html>`;
    }
}
```

#### 3. Notification Manager
```typescript
// src/ui/NotificationManager.ts
export class NotificationManager {
    private notificationHistory: NotificationItem[] = [];
    
    async showInfo(message: string, ...actions: string[]): Promise<string | undefined> {
        this.logNotification('info', message);
        return vscode.window.showInformationMessage(message, ...actions);
    }
    
    async showWarning(message: string, ...actions: string[]): Promise<string | undefined> {
        this.logNotification('warning', message);
        return vscode.window.showWarningMessage(message, ...actions);
    }
    
    async showError(message: string, ...actions: string[]): Promise<string | undefined> {
        this.logNotification('error', message);
        return vscode.window.showErrorMessage(message, ...actions);
    }
    
    showProgress<R>(
        title: string,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<R>
    ): Promise<R> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable: true
            },
            task
        );
    }
    
    async showSyncProgress(items: SyncItem[]): Promise<void> {
        await this.showProgress(
            'Syncing to Scribe',
            async (progress) => {
                const total = items.length;
                let completed = 0;
                
                for (const item of items) {
                    progress.report({
                        message: `Syncing ${item.path}...`,
                        increment: (1 / total) * 100
                    });
                    
                    await this.syncItem(item);
                    completed++;
                }
                
                this.showInfo(`Successfully synced ${completed} items`);
            }
        );
    }
}
```

#### 4. Command Palette Integration
```typescript
// src/commands/CommandRegistry.ts
export class CommandRegistry {
    static register(context: vscode.ExtensionContext, dependencies: Dependencies): void {
        const commands = [
            {
                command: 'scribe.quickSync',
                callback: () => dependencies.syncQueue.forceSync(),
                title: 'Scribe: Quick Sync All Changes'
            },
            {
                command: 'scribe.syncFile',
                callback: () => this.syncCurrentFile(dependencies),
                title: 'Scribe: Sync Current File'
            },
            {
                command: 'scribe.viewHistory',
                callback: () => this.showHistory(dependencies),
                title: 'Scribe: View Sync History'
            },
            {
                command: 'scribe.configureWorkspace',
                callback: () => this.configureWorkspace(dependencies),
                title: 'Scribe: Configure Workspace Settings'
            },
            {
                command: 'scribe.reportIssue',
                callback: () => this.reportIssue(),
                title: 'Scribe: Report an Issue'
            }
        ];
        
        commands.forEach(cmd => {
            const disposable = vscode.commands.registerCommand(cmd.command, cmd.callback);
            context.subscriptions.push(disposable);
        });
    }
    
    private static async syncCurrentFile(deps: Dependencies): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active file to sync');
            return;
        }
        
        await deps.syncQueue.syncSingle(editor.document.uri);
        deps.notifications.showInfo(`Synced ${editor.document.fileName}`);
    }
    
    private static async showHistory(deps: Dependencies): Promise<void> {
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = 'Sync History';
        quickPick.items = deps.syncQueue.getHistory().map(item => ({
            label: `${item.status === 'success' ? '✅' : '❌'} ${item.path}`,
            description: item.timestamp.toLocaleString(),
            detail: item.message
        }));
        quickPick.show();
    }
}
```

## Deliverables

### Core Files
1. `src/ui/ScribeActivityProvider.ts` - Main activity panel
2. `src/ui/SettingsProvider.ts` - Settings UI
3. `src/ui/NotificationManager.ts` - Notification system
4. `src/commands/CommandRegistry.ts` - Command palette
5. `src/ui/QuickPick.ts` - Quick pick menus
6. `media/style.css` - Panel styling
7. `media/activity.js` - Panel interactivity

### Features
1. ✅ Activity panel with live updates
2. ✅ Visual settings editor
3. ✅ Rich notifications with progress
4. ✅ Command palette integration
5. ✅ Workspace-specific configs
6. ✅ Quick pick menus
7. ✅ Keyboard shortcuts

### UI Components
- Activity sidebar panel
- Settings webview
- Progress notifications
- Quick pick menus
- Status tooltips
- Context menus

## Implementation Steps

### Day 1: Activity Panel
- [ ] Create webview provider
- [ ] Design panel layout
- [ ] Implement live updates
- [ ] Add styling
- [ ] Connect to sync queue

### Day 2: Settings UI
- [ ] Build settings webview
- [ ] Create form components
- [ ] Implement validation
- [ ] Add save/load logic
- [ ] Support workspace settings

### Day 3: Notifications
- [ ] Implement notification manager
- [ ] Add progress indicators
- [ ] Create notification history
- [ ] Add action buttons
- [ ] Implement dismissal

### Day 4: Command Palette
- [ ] Register all commands
- [ ] Create command handlers
- [ ] Add keyboard shortcuts
- [ ] Implement quick picks
- [ ] Add context menus

### Day 5: Polish & Integration
- [ ] Refine UI styling
- [ ] Add animations/transitions
- [ ] Implement themes support
- [ ] Add accessibility
- [ ] Complete integration testing

## User Experience Flows

### First-Time Setup
1. Extension installs
2. Welcome notification appears
3. User clicks "Get Started"
4. Settings UI opens
5. User enters server URL
6. OAuth flow initiates
7. Success notification
8. Activity panel opens

### Daily Usage
1. User opens workspace
2. Extension auto-activates
3. Status bar shows "Ready"
4. User makes changes
5. Changes queue automatically
6. Batch syncs after delay
7. Notification on completion

### Error Recovery
1. Sync fails
2. Error notification appears
3. User clicks "View Details"
4. Error panel shows issue
5. User fixes configuration
6. Clicks "Retry"
7. Success notification

## Testing Strategy

### UI Testing
- Webview rendering
- Message passing
- State updates
- Form validation
- Theme compatibility

### Integration Testing
- Panel ↔ Extension communication
- Settings persistence
- Command execution
- Notification flow

### User Acceptance Testing
- First-time setup flow
- Daily usage scenarios
- Error handling
- Performance impact

## Success Criteria

1. **Usability**
   - Setup < 2 minutes
   - No documentation needed
   - Intuitive UI elements

2. **Performance**
   - Panel updates < 100ms
   - No UI blocking
   - Smooth animations

3. **Accessibility**
   - Keyboard navigation
   - Screen reader support
   - High contrast theme

4. **Reliability**
   - No webview crashes
   - Settings persist
   - Commands always work

## Next Phase Preview

Phase 4 will add intelligent features:
- Auto-documentation extraction
- AI-powered suggestions
- Smart change detection
- Performance optimizations
- Advanced analytics

## Implementation Status ✅

### Completed Components
1. ✅ **Activity Panel Provider** - Full webview with live updates
2. ✅ **Settings UI Provider** - Visual settings editor with import/export
3. ✅ **Notification Manager** - Rich notifications with progress tracking
4. ✅ **Command Palette Integration** - All commands registered with icons
5. ✅ **Webview Assets** - Complete CSS/JS for both panels
6. ✅ **UI Integration** - Fully integrated into extension.ts

### Key Achievements
- Created comprehensive activity panel with real-time sync status
- Built full-featured settings UI with pattern management
- Implemented rich notification system with history tracking
- Added command palette with contextual availability
- Created professional CSS styling with VS Code theme integration
- Successfully compiled entire extension with no errors

---

**Status**: Completed ✅
**Actual effort**: ~35 hours
**Priority**: P1 - User Experience
**Dependencies**: Phase 2 completion