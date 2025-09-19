// Activity Panel JavaScript
(function() {
    const vscode = acquireVsCodeApi();
    
    // Elements
    const elements = {
        serverUrl: document.getElementById('server-url'),
        userEmail: document.getElementById('user-email'),
        lastSync: document.getElementById('last-sync'),
        loginBtn: document.getElementById('login-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        pendingCount: document.getElementById('pending-count'),
        syncedCount: document.getElementById('synced-count'),
        failedCount: document.getElementById('failed-count'),
        queueBadge: document.getElementById('queue-badge'),
        activityList: document.getElementById('activity-list'),
        watchPaths: document.getElementById('watch-paths'),
        syncNowBtn: document.getElementById('sync-now-btn'),
        pauseBtn: document.getElementById('pause-btn'),
        clearBtn: document.getElementById('clear-btn'),
        pathsHeader: document.getElementById('paths-header'),
        pathsContent: document.getElementById('paths-content')
    };
    
    let lastSyncTime = null;
    
    // Initialize
    function init() {
        setupEventListeners();
        startTimeUpdates();
    }
    
    // Setup event listeners
    function setupEventListeners() {
        elements.loginBtn?.addEventListener('click', () => {
            vscode.postMessage({ command: 'login' });
        });
        
        elements.logoutBtn?.addEventListener('click', () => {
            vscode.postMessage({ command: 'logout' });
        });
        
        elements.syncNowBtn?.addEventListener('click', () => {
            vscode.postMessage({ command: 'syncNow' });
        });
        
        elements.pauseBtn?.addEventListener('click', () => {
            const isPaused = elements.pauseBtn.textContent.includes('Pause');
            vscode.postMessage({ command: isPaused ? 'pause' : 'resume' });
        });
        
        elements.clearBtn?.addEventListener('click', () => {
            vscode.postMessage({ command: 'clear' });
        });
        
        // Quick actions
        document.getElementById('show-status')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'showStatus' });
        });
        
        document.getElementById('open-settings')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'openSettings' });
        });
        
        document.getElementById('show-logs')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'showLogs' });
        });
        
        document.getElementById('show-help')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'showHelp' });
        });
        
        // Collapsible sections
        elements.pathsHeader?.addEventListener('click', () => {
            elements.pathsContent.classList.toggle('collapsed');
            const icon = elements.pathsHeader.querySelector('.toggle-icon');
            icon?.classList.toggle('rotated');
        });
    }
    
    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        if (message.type === 'update') {
            updateUI(message);
        }
    });
    
    // Update UI with data
    function updateUI(data) {
        // Connection status
        if (elements.serverUrl) {
            elements.serverUrl.textContent = data.connection.serverUrl || 'Not configured';
        }
        
        if (elements.userEmail) {
            if (data.connection.user) {
                elements.userEmail.textContent = data.connection.user.email;
                elements.loginBtn.style.display = 'none';
                elements.logoutBtn.style.display = 'block';
            } else {
                elements.userEmail.textContent = 'Not logged in';
                elements.loginBtn.style.display = 'block';
                elements.logoutBtn.style.display = 'none';
            }
        }
        
        // Queue status
        if (data.queue) {
            elements.pendingCount.textContent = data.queue.pendingCount || 0;
            elements.syncedCount.textContent = data.queue.historyCount || 0;
            elements.failedCount.textContent = data.queue.failedCount || 0;
            elements.queueBadge.textContent = data.queue.pendingCount || 0;
            
            // Update pause button
            if (data.queue.isPaused) {
                elements.pauseBtn.innerHTML = '<span class="codicon codicon-debug-start"></span> Resume';
            } else {
                elements.pauseBtn.innerHTML = '<span class="codicon codicon-debug-pause"></span> Pause';
            }
            
            // Disable buttons if not authenticated
            const isAuthenticated = data.connection.isAuthenticated;
            elements.syncNowBtn.disabled = !isAuthenticated;
            elements.pauseBtn.disabled = !isAuthenticated;
            elements.clearBtn.disabled = !isAuthenticated || data.queue.queueLength === 0;
        }
        
        // Activity list
        if (data.activity && data.activity.length > 0) {
            elements.activityList.innerHTML = data.activity.map(item => {
                const statusIcon = item.status === 'success' ? 'pass' : 
                                 item.status === 'failed' ? 'error' : 'sync';
                const statusClass = item.status === 'success' ? 'success' : 
                                   item.status === 'failed' ? 'failed' : 'pending';
                
                return `
                    <li class="${statusClass}">
                        <span class="codicon codicon-${statusIcon} activity-icon"></span>
                        <span class="activity-file" title="${item.file}">${item.file}</span>
                        <span class="activity-time">${item.time}</span>
                    </li>
                `;
            }).join('');
            
            // Update last sync time if there's successful activity
            const lastSuccess = data.activity.find(a => a.status === 'success');
            if (lastSuccess) {
                lastSyncTime = new Date();
            }
        } else {
            elements.activityList.innerHTML = '<li class="empty-state">No activity yet</li>';
        }
        
        // Watch paths
        if (data.paths) {
            if (data.paths.watch && data.paths.watch.length > 0) {
                elements.watchPaths.innerHTML = data.paths.watch
                    .map(path => `<li>${path}</li>`)
                    .join('');
            }
        }
    }
    
    // Update time displays
    function startTimeUpdates() {
        updateLastSyncTime();
        setInterval(updateLastSyncTime, 30000); // Update every 30 seconds
    }
    
    function updateLastSyncTime() {
        if (!lastSyncTime || !elements.lastSync) {
            return;
        }
        
        const now = new Date();
        const diff = Math.floor((now - lastSyncTime) / 1000);
        
        let timeText;
        if (diff < 60) {
            timeText = 'Just now';
        } else if (diff < 3600) {
            const minutes = Math.floor(diff / 60);
            timeText = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diff < 86400) {
            const hours = Math.floor(diff / 3600);
            timeText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diff / 86400);
            timeText = `${days} day${days > 1 ? 's' : ''} ago`;
        }
        
        elements.lastSync.textContent = timeText;
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();