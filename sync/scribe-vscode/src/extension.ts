import * as vscode from 'vscode';
import { FileWatcher } from './watchers/FileWatcher';
import { ConfigurationManager } from './config/Configuration';
import { ScribeClient } from './api/ScribeClient';
import { AuthManager } from './auth/AuthManager';
import { SyncQueue } from './sync/SyncQueue';
import { StatusBar } from './ui/StatusBar';
import { Logger } from './utils/logger';
import { registerCommands } from './commands';
import { ScribeActivityProvider } from './ui/ScribeActivityProvider';
import { NotificationManager } from './ui/NotificationManager';
import { SettingsProvider } from './ui/SettingsProvider';

let fileWatcher: FileWatcher | undefined;
let scribeClient: ScribeClient | undefined;
let configManager: ConfigurationManager | undefined;
let authManager: AuthManager | undefined;
let syncQueue: SyncQueue | undefined;
let statusBar: StatusBar | undefined;
let activityProvider: ScribeActivityProvider | undefined;
let notificationManager: NotificationManager | undefined;
let settingsProvider: SettingsProvider | undefined;

export async function activate(context: vscode.ExtensionContext) {
    Logger.info('🚀 Scribe MCP extension is activating...');

    try {
        // Initialize status bar first for user feedback
        statusBar = new StatusBar();
        statusBar.updateStatus('ready', 'Initializing...');

        // Initialize notification manager
        notificationManager = new NotificationManager();

        // Initialize configuration manager
        configManager = new ConfigurationManager(context);
        
        // Initialize auth manager
        authManager = new AuthManager(context, configManager);
        
        // Initialize API client with auth
        scribeClient = new ScribeClient(configManager, authManager);
        
        // Initialize sync queue
        syncQueue = new SyncQueue(scribeClient, configManager);
        
        // Initialize settings provider
        settingsProvider = new SettingsProvider(context.extensionUri, configManager);
        
        // Register activity panel
        activityProvider = new ScribeActivityProvider(
            context.extensionUri,
            authManager,
            syncQueue,
            scribeClient,
            configManager
        );
        
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                'scribeActivity',
                activityProvider
            )
        );
        
        // Set up sync queue status updates
        syncQueue.onStatusChanged((status) => {
            if (status === 'Syncing...') {
                statusBar?.updateStatus('syncing');
                activityProvider?.updateSyncStatus();
            } else if (status === 'Ready') {
                statusBar?.updateStatus('ready');
                activityProvider?.updateSyncStatus();
            } else if (status === 'Paused') {
                statusBar?.updateStatus('paused');
                activityProvider?.updateSyncStatus();
            } else if (statusBar && syncQueue) {
                statusBar.updateSyncCount(syncQueue.getStatus().pendingCount);
                activityProvider?.updateSyncStatus();
            }
        });
        
        // Initialize file watcher with sync queue
        fileWatcher = new FileWatcher(configManager, syncQueue);
        
        // Register commands
        registerCommands(
            context, 
            fileWatcher, 
            scribeClient, 
            configManager,
            authManager,
            syncQueue,
            statusBar
        );
        
        // Check authentication status
        const isAuthenticated = authManager.isAuthenticated();
        if (!isAuthenticated) {
            statusBar.updateStatus('unauthenticated', 'Click to login');
            
            // Use notification manager for welcome message
            const choice = await notificationManager.showInfo(
                'Scribe MCP: Authentication required to sync files',
                'Login',
                'Later'
            );
            
            if (choice === 'Login') {
                await vscode.commands.executeCommand('scribe.login');
            }
        } else {
            const user = authManager.getCurrentUser();
            statusBar.updateStatus('authenticated', `Logged in as ${user?.email}`);
            notificationManager.showInfo(`Welcome back, ${user?.email}!`);
        }
        
        // Start watching if enabled and authenticated
        const enabled = configManager.isEnabled();
        if (enabled && isAuthenticated) {
            await fileWatcher.start();
            statusBar.updateStatus('ready', 'File watching active');
            Logger.info('✅ File watching started automatically');
        }
        
        // Listen for configuration changes
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('scribe')) {
                    handleConfigurationChange();
                }
            })
        );
        
        // Test server connection
        const connectionTest = await scribeClient.testConnection();
        if (!connectionTest.connected) {
            statusBar.updateStatus('offline', connectionTest.message);
            notificationManager.showWarning(
                `Scribe MCP: ${connectionTest.message}`,
                'Retry',
                'Settings'
            ).then(choice => {
                if (choice === 'Retry') {
                    vscode.commands.executeCommand('scribe.testConnection');
                } else if (choice === 'Settings') {
                    vscode.commands.executeCommand('scribe.openSettings');
                }
            });
        }
        
        Logger.info('✅ Scribe MCP extension activated successfully');
    } catch (error) {
        Logger.error('Failed to activate Scribe MCP extension', error);
        statusBar?.updateStatus('error', `Activation failed: ${error}`);
        if (error instanceof Error) {
            notificationManager?.showErrorWithDetails(error, 'Extension activation');
        } else {
            notificationManager?.showError(`Failed to activate Scribe MCP: ${error}`);
        }
    }
}

async function handleConfigurationChange() {
    Logger.info('Configuration changed, reloading...');
    
    if (!configManager || !fileWatcher) {
        return;
    }
    
    configManager.reload();
    
    const enabled = configManager.isEnabled();
    const isAuthenticated = authManager?.isAuthenticated() || false;
    
    if (enabled && isAuthenticated) {
        await fileWatcher.restart();
        statusBar?.updateStatus('ready', 'Configuration reloaded');
    } else {
        await fileWatcher.stop();
        if (!isAuthenticated) {
            statusBar?.updateStatus('unauthenticated', 'Login required');
        } else {
            statusBar?.updateStatus('paused', 'Sync disabled');
        }
    }
}

export function deactivate() {
    Logger.info('👋 Scribe MCP extension is deactivating...');
    
    if (fileWatcher) {
        fileWatcher.dispose();
    }
    
    if (scribeClient) {
        scribeClient.dispose();
    }
    
    if (authManager) {
        authManager.dispose();
    }
    
    if (syncQueue) {
        syncQueue.dispose();
    }
    
    if (statusBar) {
        statusBar.dispose();
    }
    
    if (activityProvider) {
        activityProvider.dispose();
    }
    
    if (settingsProvider) {
        settingsProvider.dispose();
    }
    
    Logger.info('✅ Scribe MCP extension deactivated');
}