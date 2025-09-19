import * as vscode from 'vscode';
import { FileWatcher } from './watchers/FileWatcher';
import { ScribeClient } from './api/ScribeClient';
import { ConfigurationManager } from './config/Configuration';
import { AuthManager } from './auth/AuthManager';
import { SyncQueue } from './sync/SyncQueue';
import { StatusBar } from './ui/StatusBar';
import { Logger } from './utils/logger';

export function registerCommands(
    context: vscode.ExtensionContext,
    fileWatcher: FileWatcher,
    scribeClient: ScribeClient,
    configManager: ConfigurationManager,
    authManager: AuthManager,
    syncQueue: SyncQueue,
    statusBar: StatusBar
): void {
    // Enable sync command
    const enableCmd = vscode.commands.registerCommand('scribe.enable', async () => {
        Logger.info('Enable command triggered');
        
        // Check authentication first
        if (!authManager.isAuthenticated()) {
            const choice = await vscode.window.showWarningMessage(
                'Authentication required to enable sync',
                'Login',
                'Cancel'
            );
            
            if (choice === 'Login') {
                const authenticated = await authManager.authenticate();
                if (!authenticated) {
                    return;
                }
            } else {
                return;
            }
        }
        
        configManager.setEnabled(true);
        await fileWatcher.start();
        statusBar.updateStatus('ready', 'File watching active');
        vscode.window.showInformationMessage('✅ Scribe sync enabled');
    });

    // Disable sync command
    const disableCmd = vscode.commands.registerCommand('scribe.disable', async () => {
        Logger.info('Disable command triggered');
        configManager.setEnabled(false);
        await fileWatcher.stop();
        syncQueue.pause();
        statusBar.updateStatus('paused', 'Sync disabled');
        vscode.window.showInformationMessage('⏸️ Scribe sync disabled');
    });

    // Show status command
    const statusCmd = vscode.commands.registerCommand('scribe.showStatus', async () => {
        Logger.info('Show status command triggered');
        
        const config = configManager.getAll();
        const connectionTest = await scribeClient.testConnection();
        const queueStatus = syncQueue.getStatus();
        const user = authManager.getCurrentUser();
        
        const statusMessage = `
🔍 Scribe MCP Status
━━━━━━━━━━━━━━━━━━━━
📊 Sync: ${config.enabled ? 'Enabled ✅' : 'Disabled ⏸️'}
👤 User: ${user ? `${user.email} (${user.role || 'member'})` : 'Not logged in'}
🌐 Server: ${config.serverUrl}
🔗 Connection: ${connectionTest.connected ? 'Connected ✅' : 'Disconnected ❌'}
📁 Workspace: ${configManager.getWorkspaceName()}
⏱️ Sync Delay: ${config.syncDelay}ms

📤 Sync Queue:
  • Status: ${queueStatus.isPaused ? 'Paused' : queueStatus.isProcessing ? 'Processing' : 'Ready'}
  • Pending: ${queueStatus.pendingCount} items
  • Failed: ${queueStatus.failedCount} items
  • History: ${queueStatus.historyCount} items synced

📂 Watch Patterns:
${config.watchPatterns.map(p => `  • ${p}`).join('\n')}

🚫 Ignore Patterns:
${config.ignorePatterns.map(p => `  • ${p}`).join('\n')}
`;
        
        // Create output channel for status
        const output = vscode.window.createOutputChannel('Scribe Status', 'markdown');
        output.clear();
        output.appendLine(statusMessage);
        output.show();
        
        if (!connectionTest.connected) {
            vscode.window.showWarningMessage(
                `Failed to connect to Scribe server: ${connectionTest.message}`
            );
        }
    });

    // Open settings command
    const settingsCmd = vscode.commands.registerCommand('scribe.openSettings', () => {
        Logger.info('Open settings command triggered');
        vscode.commands.executeCommand('workbench.action.openSettings', 'scribe');
    });

    // Sync now command
    const syncNowCmd = vscode.commands.registerCommand('scribe.syncNow', async () => {
        Logger.info('Sync now command triggered');
        
        if (!authManager.isAuthenticated()) {
            vscode.window.showWarningMessage('Please login to sync files');
            await vscode.commands.executeCommand('scribe.login');
            return;
        }
        
        await syncQueue.forceSync();
        statusBar.showTemporaryMessage('$(sync) Scribe: Sync triggered', 2000);
    });

    // Login command
    const loginCmd = vscode.commands.registerCommand('scribe.login', async () => {
        Logger.info('Login command triggered');
        
        const authenticated = await authManager.authenticate();
        if (authenticated) {
            const user = authManager.getCurrentUser();
            statusBar.updateStatus('authenticated', `Logged in as ${user?.email}`);
            vscode.window.showInformationMessage(`✅ Logged in as ${user?.email}`);
            
            // Start file watching if enabled
            if (configManager.isEnabled()) {
                await fileWatcher.start();
            }
        } else {
            statusBar.updateStatus('unauthenticated', 'Login failed');
            vscode.window.showErrorMessage('Failed to login to Scribe');
        }
    });

    // Logout command
    const logoutCmd = vscode.commands.registerCommand('scribe.logout', async () => {
        Logger.info('Logout command triggered');
        
        await authManager.logout();
        await fileWatcher.stop();
        syncQueue.pause();
        statusBar.updateStatus('unauthenticated', 'Logged out');
    });

    // Pause sync command
    const pauseCmd = vscode.commands.registerCommand('scribe.pauseSync', () => {
        Logger.info('Pause sync command triggered');
        syncQueue.pause();
        statusBar.updateStatus('paused');
        vscode.window.showInformationMessage('⏸️ Scribe sync paused');
    });

    // Resume sync command
    const resumeCmd = vscode.commands.registerCommand('scribe.resumeSync', () => {
        Logger.info('Resume sync command triggered');
        syncQueue.resume();
        statusBar.updateStatus('ready');
        vscode.window.showInformationMessage('▶️ Scribe sync resumed');
    });

    // Show sync history command
    const historyCmd = vscode.commands.registerCommand('scribe.showHistory', async () => {
        Logger.info('Show history command triggered');
        
        const history = syncQueue.getHistory();
        
        if (history.length === 0) {
            vscode.window.showInformationMessage('No sync history yet');
            return;
        }
        
        const items = history.map(item => ({
            label: `${item.status === 'success' ? '✅' : '❌'} ${vscode.workspace.asRelativePath(item.change.uri)}`,
            description: `${item.change.priority} priority`,
            detail: `${item.timestamp.toLocaleString()}${item.error ? ` - ${item.error}` : ''}`
        }));
        
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Sync History (recent first)',
            canPickMany: false
        });
        
        if (selected) {
            const index = items.indexOf(selected);
            const item = history[index];
            
            if (item.change.uri) {
                const doc = await vscode.workspace.openTextDocument(item.change.uri);
                await vscode.window.showTextDocument(doc);
            }
        }
    });

    // Clear sync queue command
    const clearQueueCmd = vscode.commands.registerCommand('scribe.clearQueue', async () => {
        Logger.info('Clear queue command triggered');
        
        const queueStatus = syncQueue.getStatus();
        if (queueStatus.queueLength === 0) {
            vscode.window.showInformationMessage('Sync queue is already empty');
            return;
        }
        
        const choice = await vscode.window.showWarningMessage(
            `Clear ${queueStatus.queueLength} items from sync queue?`,
            'Yes',
            'No'
        );
        
        if (choice === 'Yes') {
            syncQueue.clear();
            statusBar.updateSyncCount(0);
            vscode.window.showInformationMessage('Sync queue cleared');
        }
    });

    // Show logs command
    const logsCmd = vscode.commands.registerCommand('scribe.showLogs', () => {
        Logger.show();
    });

    // Register all commands
    context.subscriptions.push(
        enableCmd,
        disableCmd,
        statusCmd,
        settingsCmd,
        syncNowCmd,
        loginCmd,
        logoutCmd,
        pauseCmd,
        resumeCmd,
        historyCmd,
        clearQueueCmd,
        logsCmd
    );

    Logger.info('Commands registered successfully');
}