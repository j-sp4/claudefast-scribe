// Settings Panel JavaScript
(function() {
    const vscode = acquireVsCodeApi();
    
    // Current settings state
    let settings = {
        serverUrl: '',
        enabled: true,
        watchPatterns: ['**/*.{js,ts,jsx,tsx,md}'],
        ignorePatterns: ['**/node_modules/**', '**/.git/**'],
        syncDelay: 5000,
        batchSize: 10,
        retryAttempts: 3,
        logLevel: 'info',
        telemetry: false,
        offlineMode: true
    };
    
    // Initialize
    function init() {
        setupEventListeners();
        requestCurrentSettings();
    }
    
    // Setup all event listeners
    function setupEventListeners() {
        // Save button
        document.getElementById('save-settings')?.addEventListener('click', saveSettings);
        
        // Reset button
        document.getElementById('reset-settings')?.addEventListener('click', resetSettings);
        
        // Test connection button
        document.getElementById('test-connection')?.addEventListener('click', testConnection);
        
        // Export/Import buttons
        document.getElementById('export-settings')?.addEventListener('click', exportSettings);
        document.getElementById('import-settings')?.addEventListener('click', importSettings);
        
        // Pattern management
        document.getElementById('add-watch-pattern')?.addEventListener('click', () => addPattern('watch'));
        document.getElementById('add-ignore-pattern')?.addEventListener('click', () => addPattern('ignore'));
        
        // Advanced section toggle
        const advancedHeader = document.getElementById('advanced-header');
        const advancedContent = document.getElementById('advanced-content');
        if (advancedHeader && advancedContent) {
            advancedHeader.addEventListener('click', () => {
                advancedContent.classList.toggle('collapsed');
                advancedHeader.classList.toggle('expanded');
            });
        }
        
        // Input change tracking
        document.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', markDirty);
        });
    }
    
    // Request current settings from extension
    function requestCurrentSettings() {
        vscode.postMessage({ command: 'getSettings' });
    }
    
    // Save settings
    function saveSettings() {
        const newSettings = gatherSettings();
        
        if (!validateSettings(newSettings)) {
            return;
        }
        
        settings = newSettings;
        vscode.postMessage({
            command: 'saveSettings',
            settings: newSettings
        });
        
        clearDirty();
    }
    
    // Gather settings from form
    function gatherSettings() {
        return {
            serverUrl: document.getElementById('serverUrl').value,
            enabled: document.getElementById('enabled').checked,
            watchPatterns: getPatterns('watch'),
            ignorePatterns: getPatterns('ignore'),
            syncDelay: parseInt(document.getElementById('syncDelay').value) || 5000,
            batchSize: parseInt(document.getElementById('batchSize').value) || 10,
            retryAttempts: parseInt(document.getElementById('retryAttempts').value) || 3,
            logLevel: document.getElementById('logLevel').value,
            telemetry: document.getElementById('telemetry').checked,
            offlineMode: document.getElementById('offlineMode').checked
        };
    }
    
    // Validate settings
    function validateSettings(settings) {
        const errors = [];
        
        if (!settings.serverUrl) {
            errors.push('Server URL is required');
        } else if (!/^https?:\/\/.+/.test(settings.serverUrl)) {
            errors.push('Server URL must be a valid HTTP(S) URL');
        }
        
        if (settings.syncDelay < 1000 || settings.syncDelay > 60000) {
            errors.push('Sync delay must be between 1000ms and 60000ms');
        }
        
        if (settings.batchSize < 1 || settings.batchSize > 50) {
            errors.push('Batch size must be between 1 and 50');
        }
        
        if (settings.retryAttempts < 0 || settings.retryAttempts > 10) {
            errors.push('Retry attempts must be between 0 and 10');
        }
        
        if (errors.length > 0) {
            showStatus('error', errors.join(', '));
            return false;
        }
        
        return true;
    }
    
    // Reset settings to defaults
    function resetSettings() {
        vscode.postMessage({ command: 'resetSettings' });
    }
    
    // Test connection
    function testConnection() {
        const button = document.getElementById('test-connection');
        const statusDiv = document.getElementById('connection-status');
        
        if (button && statusDiv) {
            button.disabled = true;
            button.innerHTML = '<span class="loading"></span> Testing...';
            statusDiv.textContent = '';
            
            vscode.postMessage({ command: 'testConnection' });
        }
    }
    
    // Export settings
    function exportSettings() {
        vscode.postMessage({ command: 'exportSettings' });
    }
    
    // Import settings
    function importSettings() {
        vscode.postMessage({ command: 'importSettings' });
    }
    
    // Add pattern input
    function addPattern(type) {
        const list = document.getElementById(`${type}-patterns-list`);
        if (!list) return;
        
        const patternItem = document.createElement('div');
        patternItem.className = 'pattern-item';
        patternItem.innerHTML = `
            <input type="text" placeholder="Enter glob pattern" value="" />
            <button class="remove-button" title="Remove">
                <span class="codicon codicon-close"></span>
            </button>
        `;
        
        patternItem.querySelector('.remove-button').addEventListener('click', () => {
            patternItem.remove();
            markDirty();
        });
        
        patternItem.querySelector('input').addEventListener('change', markDirty);
        
        list.appendChild(patternItem);
        patternItem.querySelector('input').focus();
    }
    
    // Get patterns from list
    function getPatterns(type) {
        const patterns = [];
        const list = document.getElementById(`${type}-patterns-list`);
        if (!list) return patterns;
        
        list.querySelectorAll('input').forEach(input => {
            const value = input.value.trim();
            if (value) {
                patterns.push(value);
            }
        });
        
        return patterns;
    }
    
    // Load patterns into list
    function loadPatterns(type, patterns) {
        const list = document.getElementById(`${type}-patterns-list`);
        if (!list) return;
        
        list.innerHTML = '';
        patterns.forEach(pattern => {
            const patternItem = document.createElement('div');
            patternItem.className = 'pattern-item';
            patternItem.innerHTML = `
                <input type="text" value="${escapeHtml(pattern)}" />
                <button class="remove-button" title="Remove">
                    <span class="codicon codicon-close"></span>
                </button>
            `;
            
            patternItem.querySelector('.remove-button').addEventListener('click', () => {
                patternItem.remove();
                markDirty();
            });
            
            patternItem.querySelector('input').addEventListener('change', markDirty);
            
            list.appendChild(patternItem);
        });
    }
    
    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'loadSettings':
                loadSettings(message.settings);
                break;
                
            case 'settingsSaved':
                showStatus('success', message.message);
                break;
                
            case 'settingsReset':
                showStatus('info', message.message);
                break;
                
            case 'connectionResult':
                handleConnectionResult(message);
                break;
                
            case 'testingConnection':
                showStatus('info', 'Testing connection...');
                break;
                
            case 'error':
                showStatus('error', message.message);
                break;
        }
    });
    
    // Load settings into form
    function loadSettings(newSettings) {
        settings = { ...settings, ...newSettings };
        
        // Basic settings
        document.getElementById('serverUrl').value = settings.serverUrl || '';
        document.getElementById('enabled').checked = settings.enabled !== false;
        
        // Patterns
        loadPatterns('watch', settings.watchPatterns || []);
        loadPatterns('ignore', settings.ignorePatterns || []);
        
        // Sync settings
        document.getElementById('syncDelay').value = settings.syncDelay || 5000;
        document.getElementById('batchSize').value = settings.batchSize || 10;
        document.getElementById('retryAttempts').value = settings.retryAttempts || 3;
        
        // Advanced settings
        document.getElementById('logLevel').value = settings.logLevel || 'info';
        document.getElementById('telemetry').checked = settings.telemetry === true;
        document.getElementById('offlineMode').checked = settings.offlineMode !== false;
        
        clearDirty();
    }
    
    // Handle connection test result
    function handleConnectionResult(result) {
        const button = document.getElementById('test-connection');
        const statusDiv = document.getElementById('connection-status');
        
        if (button) {
            button.disabled = false;
            button.innerHTML = '<span class="codicon codicon-debug-disconnect"></span> Test Connection';
        }
        
        if (statusDiv) {
            statusDiv.textContent = result.message;
            statusDiv.className = result.connected ? 'status-message success show' : 'status-message error show';
            
            setTimeout(() => {
                statusDiv.className = 'status-message';
            }, 5000);
        }
    }
    
    // Show status message
    function showStatus(type, message) {
        const statusDiv = document.getElementById('status-message');
        if (!statusDiv) return;
        
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type} show`;
        
        setTimeout(() => {
            statusDiv.className = 'status-message';
        }, 5000);
    }
    
    // Mark form as dirty
    let isDirty = false;
    function markDirty() {
        if (!isDirty) {
            isDirty = true;
            const saveBtn = document.getElementById('save-settings');
            if (saveBtn) {
                saveBtn.textContent = 'Save Settings *';
            }
        }
    }
    
    // Clear dirty state
    function clearDirty() {
        isDirty = false;
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) {
            saveBtn.innerHTML = '<span class="codicon codicon-save"></span> Save Settings';
        }
    }
    
    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();