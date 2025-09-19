# Scribe MCP - VS Code Extension

AI-powered documentation sync for VS Code. Automatically sync your code documentation to Scribe MCP server.

## Features

✨ **Smart File Watching** - Automatically detects documentation changes in your codebase
🔍 **Intelligent Change Detection** - Analyzes files to identify significant documentation changes  
📝 **Multi-Language Support** - Works with JavaScript, TypeScript, Python, Markdown, and more
⚡ **Efficient Syncing** - Batches changes and syncs them efficiently to the server
🎯 **Priority-Based Processing** - Prioritizes important files like README and API docs

## Installation

1. Install from VS Code Marketplace (coming soon)
2. Or install manually:
   ```bash
   cd sync/scribe-vscode
   npm install
   npm run compile
   ```

## Quick Start

1. Open VS Code with your project
2. The extension activates automatically
3. Use Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):
   - `Scribe: Enable Sync` - Start file watching
   - `Scribe: Show Status` - View current configuration and connection status
   - `Scribe: Sync Now` - Manually trigger sync

## Configuration

Configure through VS Code settings or `.vscode/settings.json`:

```json
{
  "scribe.enabled": true,
  "scribe.serverUrl": "http://localhost:3004",
  "scribe.watchPatterns": [
    "**/*.{js,ts,jsx,tsx,md}",
    "**/README.md"
  ],
  "scribe.ignorePatterns": [
    "**/node_modules/**",
    "**/.git/**"
  ],
  "scribe.syncDelay": 5000
}
```

## Commands

| Command | Description |
|---------|------------|
| `scribe.enable` | Enable automatic file watching and sync |
| `scribe.disable` | Disable file watching |
| `scribe.showStatus` | Display current status and configuration |
| `scribe.openSettings` | Open Scribe settings |
| `scribe.syncNow` | Manually trigger sync of all files |
| `scribe.showLogs` | Show extension logs |

## Development

### Prerequisites
- Node.js 18+
- VS Code 1.85+
- TypeScript 5.3+

### Setup
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Run tests
npm test
```

### Project Structure
```
scribe-vscode/
├── src/
│   ├── extension.ts       # Main entry point
│   ├── watchers/          # File watching logic
│   ├── config/            # Configuration management
│   ├── api/              # API client
│   ├── utils/            # Utilities
│   └── test/             # Tests
├── package.json          # Extension manifest
└── tsconfig.json         # TypeScript config
```

## Phase 1 Implementation Status ✅

### Completed Features
- ✅ Extension project structure
- ✅ TypeScript configuration  
- ✅ File watcher implementation
- ✅ Change detection logic
- ✅ Configuration management
- ✅ Basic API client
- ✅ Extension commands
- ✅ Logging system
- ✅ Unit test structure

### What's Working
- Extension activates on VS Code startup
- Watches configured file patterns for changes
- Detects documentation in multiple languages
- Prioritizes files based on importance
- Configurable through VS Code settings
- Commands available in Command Palette

## Next Steps (Phase 2)

- OAuth2 authentication flow
- Sync queue with batching
- Status bar integration
- Retry logic and error recovery
- Token management

## License

MIT

## Support

- GitHub Issues: [Report bugs](https://github.com/scribe-mcp/vscode-extension/issues)
- Documentation: [Full docs](https://scribe-mcp.com/docs)

---

Built with ❤️ for the Scribe MCP platform