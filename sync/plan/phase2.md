# Phase 2: Core Sync & Authentication

**Duration**: Week 2 (5 days)
**Goal**: Implement authentication, sync queue management, and robust API integration

## Objectives

1. Implement OAuth2 authentication flow
2. Build sync queue with intelligent batching
3. Add retry logic and error recovery
4. Create status bar integration
5. Implement secure credential storage

## Technical Specifications

### Authentication Architecture
```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  VS Code Extension │────▶│  OAuth2 Provider  │────▶│  Scribe MCP API  │
│                    │     │  (Supabase Auth)  │     │                  │
│  - Token Manager   │◀────│  - Access Token   │◀────│  - Verify Token  │
│  - Secure Storage  │     │  - Refresh Token  │     │  - User Context  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Key Components

#### 1. Authentication Manager
```typescript
// src/auth/AuthManager.ts
export class AuthManager {
    private accessToken?: string;
    private refreshToken?: string;
    private tokenExpiry?: Date;
    
    constructor(
        private context: vscode.ExtensionContext,
        private config: Configuration
    ) {}
    
    async authenticate(): Promise<boolean> {
        // Check existing token
        const token = await this.getStoredToken();
        if (token && !this.isTokenExpired(token)) {
            return true;
        }
        
        // Initiate OAuth flow
        return this.initiateOAuthFlow();
    }
    
    private async initiateOAuthFlow(): Promise<boolean> {
        const authUrl = this.buildAuthUrl();
        await vscode.env.openExternal(vscode.Uri.parse(authUrl));
        
        // Start local server to receive callback
        const token = await this.waitForCallback();
        return this.storeToken(token);
    }
    
    private async getStoredToken(): Promise<Token | null> {
        return this.context.secrets.get('scribe.token');
    }
    
    private async storeToken(token: Token): Promise<boolean> {
        await this.context.secrets.store('scribe.token', JSON.stringify(token));
        return true;
    }
}
```

#### 2. Sync Queue Manager
```typescript
// src/sync/SyncQueue.ts
export class SyncQueue {
    private queue: SyncItem[] = [];
    private processing = false;
    private batchTimer?: NodeJS.Timeout;
    
    constructor(
        private client: ScribeClient,
        private config: Configuration
    ) {}
    
    add(item: SyncItem): void {
        // Check for duplicates
        if (!this.isDuplicate(item)) {
            this.queue.push(item);
            this.scheduleBatch();
        }
    }
    
    private scheduleBatch(): void {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        
        this.batchTimer = setTimeout(
            () => this.processBatch(),
            this.config.getSyncDelay()
        );
    }
    
    private async processBatch(): Promise<void> {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        const batch = this.queue.splice(0, this.config.getBatchSize());
        
        try {
            await this.syncBatch(batch);
        } catch (error) {
            await this.handleSyncError(error, batch);
        } finally {
            this.processing = false;
            if (this.queue.length > 0) {
                this.scheduleBatch();
            }
        }
    }
    
    private async syncBatch(items: SyncItem[]): Promise<void> {
        const grouped = this.groupByType(items);
        
        for (const [type, group] of grouped) {
            await this.client.syncDocuments({
                type,
                items: group,
                workspace: vscode.workspace.name
            });
        }
    }
}
```

#### 3. Status Bar Integration
```typescript
// src/ui/StatusBar.ts
export class StatusBar {
    private statusBarItem: vscode.StatusBarItem;
    private syncCount = 0;
    private lastSync?: Date;
    
    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'scribe.showSyncStatus';
        this.updateStatus('ready');
    }
    
    updateStatus(status: SyncStatus): void {
        switch (status) {
            case 'ready':
                this.statusBarItem.text = '$(cloud) Scribe: Ready';
                this.statusBarItem.backgroundColor = undefined;
                break;
            case 'syncing':
                this.statusBarItem.text = '$(sync~spin) Scribe: Syncing...';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            case 'error':
                this.statusBarItem.text = '$(error) Scribe: Error';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
            case 'offline':
                this.statusBarItem.text = '$(cloud-offline) Scribe: Offline';
                this.statusBarItem.backgroundColor = undefined;
                break;
        }
        this.statusBarItem.show();
    }
    
    updateSyncCount(count: number): void {
        this.syncCount = count;
        this.statusBarItem.tooltip = `${count} items pending sync\nLast sync: ${this.getLastSyncTime()}`;
    }
}
```

#### 4. Enhanced API Client
```typescript
// src/api/ScribeClient.ts
export class ScribeClient {
    private retryCount = 0;
    private maxRetries = 3;
    
    constructor(
        private auth: AuthManager,
        private config: Configuration
    ) {}
    
    async syncDocuments(payload: SyncPayload): Promise<SyncResponse> {
        return this.executeWithRetry(async () => {
            const token = await this.auth.getAccessToken();
            
            const response = await fetch(`${this.config.getServerUrl()}/api/sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new ApiError(response.status, await response.text());
            }
            
            return response.json();
        });
    }
    
    private async executeWithRetry<T>(
        operation: () => Promise<T>
    ): Promise<T> {
        try {
            const result = await operation();
            this.retryCount = 0;
            return result;
        } catch (error) {
            if (this.shouldRetry(error)) {
                this.retryCount++;
                await this.delay(this.getBackoffDelay());
                return this.executeWithRetry(operation);
            }
            throw error;
        }
    }
    
    private shouldRetry(error: any): boolean {
        if (this.retryCount >= this.maxRetries) return false;
        
        // Retry on network errors or 5xx status codes
        return error.code === 'ECONNREFUSED' ||
               error.code === 'ETIMEDOUT' ||
               (error.status >= 500 && error.status < 600);
    }
    
    private getBackoffDelay(): number {
        return Math.min(1000 * Math.pow(2, this.retryCount), 30000);
    }
}
```

## Deliverables

### Core Files
1. `src/auth/AuthManager.ts` - OAuth2 authentication
2. `src/sync/SyncQueue.ts` - Batch sync management
3. `src/ui/StatusBar.ts` - Status bar indicator
4. `src/api/ScribeClient.ts` - Enhanced API client
5. `src/sync/RetryManager.ts` - Retry logic

### Features
1. ✅ OAuth2 authentication flow
2. ✅ Secure token storage
3. ✅ Automatic token refresh
4. ✅ Intelligent sync batching
5. ✅ Retry with exponential backoff
6. ✅ Status bar with real-time updates
7. ✅ Offline mode detection

### Commands
- `scribe.login` - Initiate authentication
- `scribe.logout` - Clear credentials
- `scribe.syncNow` - Force immediate sync
- `scribe.showSyncStatus` - Display sync details
- `scribe.clearQueue` - Clear pending items

## Implementation Steps

### Day 1: Authentication Foundation
- [ ] Implement AuthManager class
- [ ] Set up OAuth2 flow
- [ ] Create callback receiver
- [ ] Implement secure storage
- [ ] Add token refresh logic

### Day 2: Sync Queue
- [ ] Build SyncQueue class
- [ ] Implement batching logic
- [ ] Add deduplication
- [ ] Create priority system
- [ ] Handle queue persistence

### Day 3: API Integration
- [ ] Enhance ScribeClient
- [ ] Add retry mechanism
- [ ] Implement backoff strategy
- [ ] Handle various error types
- [ ] Add request interceptors

### Day 4: Status Bar UI
- [ ] Create StatusBar component
- [ ] Add status indicators
- [ ] Implement tooltips
- [ ] Add click actions
- [ ] Create progress indication

### Day 5: Integration & Error Handling
- [ ] Connect all components
- [ ] Add comprehensive error handling
- [ ] Implement offline mode
- [ ] Add telemetry
- [ ] Perform integration testing

## Configuration Updates

```json
{
    "scribe.auth.clientId": {
        "type": "string",
        "description": "OAuth client ID"
    },
    "scribe.sync.batchSize": {
        "type": "number",
        "default": 10,
        "description": "Maximum items per sync batch"
    },
    "scribe.sync.retryAttempts": {
        "type": "number",
        "default": 3,
        "description": "Number of retry attempts"
    },
    "scribe.sync.offlineMode": {
        "type": "boolean",
        "default": true,
        "description": "Enable offline queue"
    }
}
```

## Testing Strategy

### Unit Tests
- AuthManager: Token management, refresh logic
- SyncQueue: Batching, deduplication, priority
- RetryManager: Backoff calculation, retry conditions
- StatusBar: State transitions, UI updates

### Integration Tests
- Full authentication flow
- Queue → API → Success/Failure paths
- Token refresh during sync
- Network failure recovery

### End-to-End Tests
- Login → Watch → Change → Sync → Verify
- Error scenarios and recovery
- Offline → Online transition
- Multiple workspace handling

## Success Criteria

1. **Authentication**
   - Successful OAuth flow < 10 seconds
   - Token refresh without user interaction
   - Secure credential storage

2. **Sync Performance**
   - Batch processing < 1 second
   - Queue capacity > 1000 items
   - Memory efficient batching

3. **Reliability**
   - 100% recovery from network failures
   - No data loss in offline mode
   - Graceful degradation

4. **User Experience**
   - Clear status indication
   - Responsive UI updates
   - Informative error messages

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| OAuth complexity | Use well-tested libraries, clear documentation |
| Token security | Use VS Code secret storage, never log tokens |
| Queue overflow | Implement size limits, old item pruning |
| API rate limits | Add rate limiting, respect server headers |
| Network failures | Comprehensive retry logic, offline queue |

## Dependencies Updates

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "debounce": "^2.0.0",
    "p-queue": "^7.4.1",
    "keytar": "^7.9.0",
    "express": "^4.18.2"
  }
}
```

## Next Phase Preview

Phase 3 will enhance user experience with:
- Full activity panel with sync history
- Settings UI for configuration
- Rich notifications system
- Command palette integration
- Workspace-specific settings

---

**Status**: Ready to implement
**Estimated effort**: 40 hours
**Priority**: P0 - Critical path
**Dependencies**: Phase 1 completion