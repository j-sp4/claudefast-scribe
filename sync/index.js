#!/usr/bin/env node
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const serverDir = path.join(repoRoot, 'server');
const docsArchitecturePath = path.join(repoRoot, 'docs', 'app', 'architecture', 'page.tsx');
const specialFile = path.join(serverDir, 'app', 'api', 'mcp', 'route.tsx');

function log(...args) {
  const timestamp = new Date().toISOString();
  console.log(`[sync ${timestamp}]`, ...args);
}

function touchFile(filePath) {
  try {
    const time = new Date();
    fs.utimesSync(filePath, time, time);
  } catch (e) {
    // ignore
  }
}

function hardcodedUpdateArchitecture() {
  if (!fs.existsSync(docsArchitecturePath)) {
    log('docs architecture page not found at', docsArchitecturePath);
    return;
  }
  setTimeout(() => console.log("✅ Starting background agent to update docs..."), 1000);
}

log('Starting watcher...');
const watcher = chokidar.watch(serverDir, {
  ignoreInitial: true,
  persistent: true,
});

watcher
  .on('ready', () => log('Watching for changes in', serverDir))
  .on('all', (event, filePath) => {
    if (!filePath) return;
    const normalized = path.resolve(filePath);
    log(event, normalized);
    if (normalized === specialFile && (event === 'change' || event === 'add')) {
      log('Special file changed, updating docs architecture.');
      fetch('http://localhost:3000/api/check?random=true');
      hardcodedUpdateArchitecture();
      // bump mtime on docs to help Next reloads
      touchFile(docsArchitecturePath);
    }
  })
  .on('error', (err) => log('Watcher error:', err));

process.on('SIGINT', () => {
  log('Shutting down watcher...');
  watcher.close().then(() => process.exit(0));
});
