# Scribe MCP Development Guide

## Quick Start from Project Root

### Running the VS Code Extension

You can now debug the VS Code extension directly from the project root:

1. **Open VS Code in the project root:**
   ```bash
   code /Users/james/Develop/claudefast/scribe
   ```

2. **Press Cmd+Shift+D** to open the Debug panel

3. **Select "Run VS Code Extension"** from the dropdown

4. **Press F5** or click the green play button

### Available Debug Configurations

From the project root, you have these debug options:

- **Run VS Code Extension** - Launches the extension in a new VS Code window
- **Debug Server** - Runs the Next.js server with debugging
- **Extension Tests** - Runs the extension test suite
- **Full Stack (Server + Extension)** - Runs both server and extension together

### Building from Root

```bash
# Build the VS Code extension
npm run build:extension

# Build the server
npm run build:server

# Install all dependencies
npm run install:all
```

### Development Scripts

All commands work from the project root:

```bash
# Start the server
npm run dev:server

# Watch extension changes
npm run dev:extension

# Build extension
npm run build:extension

# Clean build artifacts
npm run clean
```

## Project Structure

```
/Users/james/Develop/claudefast/scribe/
├── .vscode/
│   ├── launch.json         # Debug configurations (work from root!)
│   └── tasks.json          # Build tasks
├── server/                 # Next.js MCP server
├── sync/
│   └── scribe-vscode/      # VS Code extension
└── package.json            # Root package with convenience scripts
```

## Debugging Tips

### From Project Root (Recommended)
1. Open the Debug panel (Cmd+Shift+D)
2. Select "Run VS Code Extension"
3. Press F5

### What Happens
- Extension is automatically compiled
- New VS Code window opens with extension loaded
- You can set breakpoints in `/sync/scribe-vscode/src/` files
- Debug console shows extension logs

### Troubleshooting

If F5 shows "No debugger for JSON":
- Make sure you've selected "Run VS Code Extension" in the Debug panel dropdown
- Don't have a JSON file as the active editor

If extension doesn't load:
- Check that it compiled: `npm run build:extension`
- Look for errors in the Debug Console
- Ensure dependencies are installed: `npm run install:extension`

## Full Stack Development

To run both server and extension:
1. Select "Full Stack (Server + Extension)" from debug dropdown
2. Press F5
3. Both will start simultaneously

Or manually:
```bash
# Terminal 1
npm run dev:server

# Terminal 2 - Then debug extension
# Select "Run VS Code Extension" and press F5
```