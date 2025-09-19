# Phase 1: Foundation & Basic File Watching

**Duration**: Week 1 (5 days)
**Goal**: Create the VS Code extension foundation with basic file watching capabilities

## Objectives

1. Set up VS Code extension project structure
2. Implement basic file watcher with configurable patterns
3. Create configuration system for workspace/user settings
4. Build simple API client for Scribe MCP server
5. Establish logging and debugging infrastructure

## Technical Specifications

### Project Structure
```
scribe-vscode/
├── .vscode/
│   ├── launch.json         # Debug configurations
│   └── tasks.json          # Build tasks
├── src/
│   ├── extension.ts        # Main entry point
│   ├── watchers/
│   │   ├── FileWatcher.ts  # File watching service
│   │   └── ChangeDetector.ts # Change detection logic
│   ├── config/
│   │   ├── Configuration.ts # Configuration manager
│   │   └── defaults.ts     # Default settings
│   ├── api/
│   │   ├── ScribeClient.ts # API client
│   │   └── types.ts        # API type definitions
│   ├── utils/
│   │   └── logger.ts       # Logging utilities
│   └── test/
│       └── suite/          # Test files
├── package.json            # Extension manifest
├── tsconfig.json          # TypeScript config
├── webpack.config.js      # Build configuration
└── README.md              # Documentation
```

### Key Components

#### 1. Extension Activation
```typescript
// extension.ts
export async function activate(context: vscode.ExtensionContext) {
    // Initialize configuration
    const config = new ConfigurationManager(context);
    
    // Set up file watcher
    const watcher = new FileWatcher(config);
    
    // Initialize API client
    const client = new ScribeClient(config);
    
    // Register commands
    registerCommands(context, watcher, client);
    
    // Start watching
    await watcher.start();
}
```

#### 2. File Watcher Service
```typescript
// FileWatcher.ts
export class FileWatcher {
    private watchers: Map<string, vscode.FileSystemWatcher>;
    private changeQueue: ChangeEvent[];
    
    constructor(private config: Configuration) {}
    
    async start(): Promise<void> {
        const patterns = this.config.getWatchPatterns();
        patterns.forEach(pattern => this.createWatcher(pattern));
    }
    
    private createWatcher(pattern: string): void {
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        watcher.onDidChange(uri => this.handleChange(uri));
        watcher.onDidCreate(uri => this.handleCreate(uri));
        watcher.onDidDelete(uri => this.handleDelete(uri));
        this.watchers.set(pattern, watcher);
    }
}
```

#### 3. Configuration Schema
```json
{
    "scribe.enabled": {
        "type": "boolean",
        "default": true,
        "description": "Enable/disable Scribe sync"
    },
    "scribe.serverUrl": {
        "type": "string",
        "default": "https://scribe-mcp.vercel.app",
        "description": "Scribe MCP server URL"
    },
    "scribe.watchPatterns": {
        "type": "array",
        "default": ["**/*.{js,ts,jsx,tsx,md}", "**/README.md"],
        "description": "File patterns to watch"
    },
    "scribe.ignorePatterns": {
        "type": "array",
        "default": ["**/node_modules/**", "**/.git/**"],
        "description": "Patterns to ignore"
    },
    "scribe.syncDelay": {
        "type": "number",
        "default": 5000,
        "description": "Delay before syncing changes (ms)"
    }
}
```

## Deliverables

### Core Files
1. `src/extension.ts` - Main extension entry
2. `src/watchers/FileWatcher.ts` - File watching implementation
3. `src/config/Configuration.ts` - Settings management
4. `src/api/ScribeClient.ts` - Basic API client
5. `package.json` - Extension manifest with contributes

### Features
1. ✅ Extension activates on workspace open
2. ✅ Watches configured file patterns
3. ✅ Detects file changes/creates/deletes
4. ✅ Loads user/workspace configuration
5. ✅ Basic API client structure

### Commands
- `scribe.enable` - Enable sync
- `scribe.disable` - Disable sync
- `scribe.showStatus` - Show current status
- `scribe.openSettings` - Open settings

## Implementation Steps

### Day 1: Project Setup
- [ ] Initialize VS Code extension project
- [ ] Set up TypeScript configuration
- [ ] Configure webpack build
- [ ] Create basic extension structure
- [ ] Implement activation/deactivation

### Day 2: File Watcher
- [ ] Implement FileWatcher class
- [ ] Add change detection logic
- [ ] Create event queue system
- [ ] Add debouncing for changes
- [ ] Test with various file types

### Day 3: Configuration
- [ ] Define configuration schema
- [ ] Implement Configuration manager
- [ ] Add workspace/user settings
- [ ] Create settings validation
- [ ] Add configuration commands

### Day 4: API Client
- [ ] Create ScribeClient class
- [ ] Define API types
- [ ] Implement basic HTTP methods
- [ ] Add error handling
- [ ] Create mock responses for testing

### Day 5: Integration & Testing
- [ ] Connect all components
- [ ] Add logging throughout
- [ ] Write unit tests
- [ ] Manual integration testing
- [ ] Fix bugs and polish

## Testing Strategy

### Unit Tests
- FileWatcher: Pattern matching, event handling
- Configuration: Setting loading, validation
- API Client: Request formation, error handling

### Integration Tests
- File change → Queue → API call flow
- Configuration changes → Watcher updates
- Error scenarios and recovery

### Manual Testing
- Install in VS Code
- Test with real project
- Verify all file operations
- Check configuration changes
- Monitor performance

## Success Criteria

1. **Functionality**
   - Extension activates without errors
   - Detects all file changes accurately
   - Configuration loads and updates properly
   - API client can make basic requests

2. **Performance**
   - Activation < 100ms
   - File change detection < 50ms
   - Memory usage < 20MB
   - No UI blocking

3. **Code Quality**
   - TypeScript strict mode passes
   - ESLint no errors
   - 80% test coverage
   - Clear documentation

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| VS Code API learning curve | Study examples, use documentation |
| File watcher performance | Implement efficient patterns, debouncing |
| Configuration complexity | Start simple, iterate based on needs |
| Build system issues | Use proven webpack config templates |

## Dependencies

```json
{
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "^20.x",
    "typescript": "^5.3.0",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "ts-loader": "^9.5.1",
    "@vscode/test-electron": "^2.3.8"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "debounce": "^2.0.0"
  }
}
```

## Next Phase Preview

Phase 2 will build upon this foundation to add:
- Authentication flow with token management
- Sync queue with batching and retry logic
- Status bar indicator with sync status
- Error handling and recovery mechanisms

---

**Status**: Ready to implement
**Estimated effort**: 40 hours
**Priority**: P0 - Critical path