import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

export interface ScribeConfig {
    enabled: boolean;
    serverUrl: string;
    watchPatterns: string[];
    ignorePatterns: string[];
    syncDelay: number;
}

export class ConfigurationManager {
    private config: ScribeConfig;

    constructor(private context: vscode.ExtensionContext) {
        this.config = this.loadConfiguration();
        Logger.info('Configuration loaded', this.config);
    }

    private loadConfiguration(): ScribeConfig {
        const vsConfig = vscode.workspace.getConfiguration('scribe');
        
        return {
            enabled: vsConfig.get<boolean>('enabled', true),
            serverUrl: vsConfig.get<string>('serverUrl', 'http://localhost:3004'),
            watchPatterns: vsConfig.get<string[]>('watchPatterns', ['**/*.{js,ts,jsx,tsx,md}', '**/README.md']),
            ignorePatterns: vsConfig.get<string[]>('ignorePatterns', ['**/node_modules/**', '**/.git/**']),
            syncDelay: vsConfig.get<number>('syncDelay', 5000)
        };
    }

    reload(): void {
        const oldConfig = this.config;
        this.config = this.loadConfiguration();
        
        // Log configuration changes
        if (JSON.stringify(oldConfig) !== JSON.stringify(this.config)) {
            Logger.info('Configuration reloaded with changes', {
                old: oldConfig,
                new: this.config
            });
        }
    }

    isEnabled(): boolean {
        return this.config.enabled;
    }

    setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
        vscode.workspace.getConfiguration('scribe').update('enabled', enabled, true);
    }

    getServerUrl(): string {
        return this.config.serverUrl;
    }

    getWatchPatterns(): string[] {
        return this.config.watchPatterns;
    }

    getIgnorePatterns(): string[] {
        return this.config.ignorePatterns;
    }

    getSyncDelay(): number {
        return this.config.syncDelay;
    }

    getWorkspaceName(): string {
        return vscode.workspace.name || 'unknown';
    }

    getWorkspaceRoot(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
    }

    async getStoredToken(): Promise<string | undefined> {
        return this.context.secrets.get('scribe.token');
    }

    async storeToken(token: string): Promise<void> {
        await this.context.secrets.store('scribe.token', token);
        Logger.info('Token stored securely');
    }

    async clearToken(): Promise<void> {
        await this.context.secrets.delete('scribe.token');
        Logger.info('Token cleared');
    }

    // Get all configuration as a plain object
    getAll(): ScribeConfig {
        return { ...this.config };
    }

    // Update multiple settings at once
    async updateAll(updates: Partial<ScribeConfig>): Promise<void> {
        const config = vscode.workspace.getConfiguration('scribe');
        
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                await config.update(key, value, true);
            }
        }
        
        this.reload();
        Logger.info('Configuration updated', updates);
    }
}