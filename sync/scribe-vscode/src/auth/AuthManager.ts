import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/Configuration';
import { Logger } from '../utils/logger';
import axios from 'axios';

export interface AuthToken {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: {
        id: string;
        email: string;
        role?: string;
    };
}

export class AuthManager {
    private token?: AuthToken;
    private refreshTimer?: NodeJS.Timeout;
    private isRefreshing: boolean = false;

    constructor(
        private context: vscode.ExtensionContext,
        private config: ConfigurationManager
    ) {
        this.loadStoredToken();
    }

    private async loadStoredToken(): Promise<void> {
        try {
            const storedToken = await this.context.secrets.get('scribe.authToken');
            if (storedToken) {
                this.token = JSON.parse(storedToken);
                
                // Check if token is expired
                if (this.isTokenExpired()) {
                    Logger.info('Stored token expired, attempting refresh');
                    await this.refreshToken();
                } else {
                    this.scheduleTokenRefresh();
                    Logger.info('Loaded valid token from storage');
                }
            }
        } catch (error) {
            Logger.error('Failed to load stored token', error);
            await this.clearToken();
        }
    }

    async authenticate(): Promise<boolean> {
        // Check if we already have a valid token
        if (this.token && !this.isTokenExpired()) {
            Logger.info('Using existing valid token');
            return true;
        }

        // If token is expired, try to refresh
        if (this.token?.refresh_token) {
            const refreshed = await this.refreshToken();
            if (refreshed) {
                return true;
            }
        }

        // No valid token, initiate OAuth flow
        return this.initiateOAuthFlow();
    }

    private async initiateOAuthFlow(): Promise<boolean> {
        Logger.info('Initiating OAuth flow');

        try {
            // For VS Code extension, we'll use device flow or direct login
            // Since we have Supabase, we'll implement a simplified flow
            
            // Show input box for email
            const email = await vscode.window.showInputBox({
                prompt: 'Enter your email address',
                placeHolder: 'user@example.com',
                validateInput: (value) => {
                    if (!value || !value.includes('@')) {
                        return 'Please enter a valid email address';
                    }
                    return null;
                }
            });

            if (!email) {
                return false;
            }

            // Show input box for password
            const password = await vscode.window.showInputBox({
                prompt: 'Enter your password',
                password: true,
                validateInput: (value) => {
                    if (!value || value.length < 6) {
                        return 'Password must be at least 6 characters';
                    }
                    return null;
                }
            });

            if (!password) {
                return false;
            }

            // Call login API
            const response = await axios.post(
                `${this.config.getServerUrl()}/api/auth/login`,
                { email, password },
                { 
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                }
            );

            if (response.data.token) {
                this.token = response.data.token;
                await this.storeToken();
                this.scheduleTokenRefresh();
                
                vscode.window.showInformationMessage('✅ Successfully logged in to Scribe MCP');
                Logger.info('Authentication successful', { email });
                return true;
            }

            throw new Error('No token received from server');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.message || error.message;
                vscode.window.showErrorMessage(`Authentication failed: ${message}`);
                Logger.error('Authentication failed', error.response?.data);
            } else {
                vscode.window.showErrorMessage('Authentication failed: Unknown error');
                Logger.error('Authentication failed', error);
            }
            return false;
        }
    }

    async refreshToken(): Promise<boolean> {
        if (!this.token?.refresh_token) {
            Logger.warn('No refresh token available');
            return false;
        }

        if (this.isRefreshing) {
            Logger.info('Token refresh already in progress');
            // Wait for the ongoing refresh to complete
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!this.isRefreshing) {
                        clearInterval(checkInterval);
                        resolve(!!this.token && !this.isTokenExpired());
                    }
                }, 100);
            });
        }

        this.isRefreshing = true;
        Logger.info('Refreshing authentication token');

        try {
            const response = await axios.post(
                `${this.config.getServerUrl()}/api/auth/refresh`,
                { refresh_token: this.token.refresh_token },
                { 
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                }
            );

            if (response.data.token) {
                this.token = response.data.token;
                await this.storeToken();
                this.scheduleTokenRefresh();
                
                Logger.info('Token refreshed successfully');
                return true;
            }

            throw new Error('No token received from refresh');
        } catch (error) {
            Logger.error('Failed to refresh token', error);
            await this.clearToken();
            return false;
        } finally {
            this.isRefreshing = false;
        }
    }

    private scheduleTokenRefresh(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        if (!this.token) {
            return;
        }

        // Schedule refresh 5 minutes before expiry
        const expiresIn = this.token.expires_at - Date.now();
        const refreshIn = Math.max(expiresIn - 5 * 60 * 1000, 60 * 1000); // At least 1 minute

        this.refreshTimer = setTimeout(() => {
            this.refreshToken().catch(error => {
                Logger.error('Scheduled token refresh failed', error);
            });
        }, refreshIn);

        Logger.info(`Token refresh scheduled in ${Math.round(refreshIn / 1000 / 60)} minutes`);
    }

    private isTokenExpired(): boolean {
        if (!this.token) {
            return true;
        }
        
        // Check if token expires in next 60 seconds
        return this.token.expires_at <= Date.now() + 60 * 1000;
    }

    async getAccessToken(): Promise<string | null> {
        if (!this.token) {
            const authenticated = await this.authenticate();
            if (!authenticated) {
                return null;
            }
        }

        if (this.isTokenExpired()) {
            const refreshed = await this.refreshToken();
            if (!refreshed) {
                return null;
            }
        }

        return this.token?.access_token || null;
    }

    async logout(): Promise<void> {
        Logger.info('Logging out');

        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        try {
            // Call logout endpoint if token exists
            if (this.token?.access_token) {
                await axios.post(
                    `${this.config.getServerUrl()}/api/auth/logout`,
                    {},
                    {
                        headers: {
                            'Authorization': `Bearer ${this.token.access_token}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 5000
                    }
                ).catch(error => {
                    // Ignore logout errors, just log them
                    Logger.warn('Logout API call failed', error);
                });
            }
        } finally {
            await this.clearToken();
            vscode.window.showInformationMessage('Logged out from Scribe MCP');
        }
    }

    private async storeToken(): Promise<void> {
        if (!this.token) {
            return;
        }

        await this.context.secrets.store('scribe.authToken', JSON.stringify(this.token));
        Logger.info('Token stored securely');
    }

    private async clearToken(): Promise<void> {
        this.token = undefined;
        await this.context.secrets.delete('scribe.authToken');
        
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = undefined;
        }
        
        Logger.info('Token cleared');
    }

    isAuthenticated(): boolean {
        return !!this.token && !this.isTokenExpired();
    }

    getCurrentUser(): { id: string; email: string; role?: string } | null {
        return this.token?.user || null;
    }

    dispose(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
    }
}