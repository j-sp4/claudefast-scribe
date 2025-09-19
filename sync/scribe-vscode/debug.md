# How to Debug the Scribe VS Code Extension

## Quick Start
1. Open the **Run and Debug** panel (Cmd+Shift+D)
2. Select **"Run Extension"** from the dropdown at the top
3. Press **F5** or click the green play button

## What You Should See
- A new VS Code window opens titled "Extension Development Host"
- The Scribe extension is loaded in that window
- You can see "Scribe MCP" in the status bar
- The Scribe icon appears in the Activity Bar

## Common Issues and Fixes

### "You don't have an extension for debugging JSON"
**Cause**: You have a JSON file open and VS Code is trying to debug it
**Fix**: 
- Use the Run and Debug panel (Cmd+Shift+D)
- Select "Run Extension" from dropdown
- Press F5

### Extension doesn't appear in new window
**Fix**: 
1. Check compilation: `npm run compile`
2. Check for errors in the Debug Console
3. Ensure you're in the correct directory

## Testing the Extension
In the Extension Development Host window:
1. Open Command Palette (Cmd+Shift+P)
2. Type "Scribe" to see all commands
3. Click the Scribe icon in the Activity Bar
4. Check the status bar for sync status

## Debugging Tips
- Set breakpoints in `src/extension.ts`
- Use Debug Console for output
- Check OUTPUT panel > "Scribe MCP" for logs