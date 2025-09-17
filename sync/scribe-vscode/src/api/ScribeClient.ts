import axios, { AxiosInstance, AxiosError } from 'axios';
import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/Configuration';
import { AuthManager } from '../auth/AuthManager';
import { Logger } from '../utils/logger';
import { SignificantChange } from '../watchers/ChangeDetector';

export interface SyncPayload {
    workspace: string;
    changes: Array<{
        path: string;
        type: 'create' | 'change' | 'delete';
        content?: string;
        language?: string;
        hasDocumentation: boolean;
        priority: string;
    }>;
    timestamp: string;
}

export interface SyncResponse {
    success: boolean;
    synced: number;
    message?: string;
}

export class ScribeClient {
    private client: AxiosInstance;

    constructor(
        private config: ConfigurationManager,
        private auth: AuthManager
    ) {
        this.client = this.createClient();
    }

    private createClient(): AxiosInstance {
        const baseURL = this.config.getServerUrl();
        
        const client = axios.create({
            baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Scribe-VSCode/0.1.0'
            }
        });

        // Add request interceptor for authentication
        client.interceptors.request.use(
            async (config) => {
                const token = await this.auth.getAccessToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Add response interceptor for error handling
        client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                if (error.response?.status === 401) {
                    // Token expired or invalid
                    Logger.warn('Authentication failed, attempting refresh');
                    
                    // Try to refresh token
                    const refreshed = await this.auth.refreshToken();
                    if (!refreshed) {
                        vscode.window.showWarningMessage(
                            'Scribe authentication expired. Please login again.',
                            'Login'
                        ).then(selection => {
                            if (selection === 'Login') {
                                vscode.commands.executeCommand('scribe.login');
                            }
                        });
                    }
                }
                return Promise.reject(error);
            }
        );

        return client;
    }

    async checkConnection(): Promise<boolean> {
        try {
            const response = await this.client.get('/api/health');
            return response.status === 200;
        } catch (error) {
            Logger.error('Failed to connect to Scribe server', error);
            return false;
        }
    }

    async authenticate(): Promise<boolean> {
        return this.auth.authenticate();
    }

    async syncChanges(changes: SignificantChange[]): Promise<void> {
        if (!this.auth.isAuthenticated() && !await this.auth.authenticate()) {
            throw new Error('Authentication required');
        }

        const payload: SyncPayload = {
            workspace: this.config.getWorkspaceName(),
            changes: changes.map(change => ({
                path: vscode.workspace.asRelativePath(change.uri),
                type: change.type,
                content: change.content,
                language: change.language,
                hasDocumentation: change.hasDocumentation,
                priority: change.priority
            })),
            timestamp: new Date().toISOString()
        };

        Logger.info('Syncing changes to server', {
            workspace: payload.workspace,
            changeCount: payload.changes.length
        });

        try {
            const response = await this.client.post<SyncResponse>('/api/sync', payload);
            
            if (response.data.success) {
                Logger.info(`Successfully synced ${response.data.synced} changes`);
            } else {
                throw new Error(response.data.message || 'Sync failed');
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.message || error.message;
                Logger.error('Sync failed', { error: message });
                throw new Error(`Sync failed: ${message}`);
            }
            throw error;
        }
    }

    async testConnection(): Promise<{ connected: boolean; message: string }> {
        try {
            await this.client.get('/api/health');
            return {
                connected: true,
                message: `Connected to Scribe server at ${this.config.getServerUrl()}`
            };
        } catch (error) {
            return {
                connected: false,
                message: `Failed to connect to ${this.config.getServerUrl()}: ${error}`
            };
        }
    }

    dispose(): void {
        // Clean up any resources
        Logger.info('ScribeClient disposed');
    }
}