// Agent Mode - Threads-Style Sidebar Interface
// Manages agent profiles and workflow threads

// State
let agentMode = false;
let previousDesignFlowStateAgent = null;
let currentAgentId = null;
let agentsData = null;
let agentThreadsData = null;
let contextMenuThreadId = null; // For right-click context menu

// LocalStorage keys
const AGENTS_STORAGE_KEY = 'idea-engine-agents';
const THREADS_STORAGE_KEY = 'idea-engine-agent-threads';

// ============================================
// Data Management
// ============================================

function loadAgentsData() {
    try {
        const stored = localStorage.getItem(AGENTS_STORAGE_KEY);
        if (stored) {
            agentsData = JSON.parse(stored);
            currentAgentId = agentsData.currentAgentId;
        } else {
            // Create default agent
            agentsData = {
                currentAgentId: null,
                agents: []
            };
            // Create first default agent
            const defaultAgent = createNewAgent('Agent 1');
            agentsData.currentAgentId = defaultAgent.id;
            currentAgentId = defaultAgent.id;
            saveAgentsData();
        }
    } catch (e) {
        console.error('Error loading agents data:', e);
        agentsData = { currentAgentId: null, agents: [] };
    }
}

function saveAgentsData() {
    try {
        agentsData.currentAgentId = currentAgentId;
        localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agentsData));
    } catch (e) {
        console.error('Error saving agents data:', e);
    }
}

function loadThreadsData() {
    try {
        const stored = localStorage.getItem(THREADS_STORAGE_KEY);
        if (stored) {
            agentThreadsData = JSON.parse(stored);
        } else {
            agentThreadsData = {};
        }
    } catch (e) {
        console.error('Error loading threads data:', e);
        agentThreadsData = {};
    }
}

function saveThreadsData() {
    try {
        localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(agentThreadsData));
    } catch (e) {
        console.error('Error saving threads data:', e);
    }
}

// ============================================
// Agent Management
// ============================================

function createNewAgent(name) {
    const agent = {
        id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name || 'New Agent',
        avatar: '' // Empty for now, can be set later
    };
    agentsData.agents.push(agent);

    // Initialize empty threads array for this agent
    if (!agentThreadsData) {
        agentThreadsData = {};
    }
    agentThreadsData[agent.id] = [];

    saveAgentsData();
    saveThreadsData();

    return agent;
}

function getCurrentAgent() {
    if (!agentsData || !currentAgentId) return null;
    return agentsData.agents.find(a => a.id === currentAgentId);
}

function switchAgent(agentId) {
    const agent = agentsData.agents.find(a => a.id === agentId);
    if (agent) {
        currentAgentId = agentId;
        saveAgentsData();
        renderAgentSidebar();
    }
}

function getAgentThreads(agentId) {
    if (!agentThreadsData || !agentId) return [];
    return agentThreadsData[agentId] || [];
}

// ============================================
// Mode Switching
// ============================================

function enterAgentMode() {
    if (agentMode) return;

    // Exit other modes first
    if (typeof exitChatMode === 'function' && typeof isChatMode === 'function' && isChatMode()) {
        exitChatMode();
    }
    if (typeof exitJournalMode === 'function' && typeof isJournalMode === 'function' && isJournalMode()) {
        exitJournalMode();
    }
    if (typeof resetTasksModeState === 'function' && typeof isTasksMode === 'function' && isTasksMode()) {
        resetTasksModeState();
    }
    if (typeof resetMultiplayerModeState === 'function' && typeof isMultiplayerMode === 'function' && isMultiplayerMode()) {
        resetMultiplayerModeState();
    }

    // Clean up any leftover UI from other modes
    if (typeof cleanupAllModeUI === 'function') {
        cleanupAllModeUI();
    }

    agentMode = true;

    // Save current Design Flow state
    if (typeof app !== 'undefined' && app.canvasRenderer && app.connectionManager) {
        // Filter out invalid connections
        const validConnections = app.connectionManager.connections.filter(c => c.fromNode && c.toNode);
        previousDesignFlowStateAgent = {
            nodes: app.canvasRenderer.nodes.map(n => n.toJSON()),
            connections: validConnections.map(c => ({
                fromNode: c.fromNode.id,
                fromOutput: c.fromOutput,
                toNode: c.toNode.id,
                toInput: c.toInput
            }))
        };
    }

    // Update sidebar headers
    document.getElementById('agent-header')?.classList.add('active');
    document.getElementById('design-flow-header')?.classList.remove('active');
    document.getElementById('journals-header')?.classList.remove('active');
    document.getElementById('chat-header')?.classList.remove('active');
    document.getElementById('tasks-header')?.classList.remove('active');

    // Show/hide sections
    document.getElementById('design-flow-section').style.display = 'none';
    document.getElementById('journals-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'none';
    document.getElementById('tasks-section').style.display = 'none';
    document.getElementById('agent-section').style.display = 'flex';

    // Hide tasks view container
    const tasksView = document.getElementById('tasks-view-container');
    if (tasksView) tasksView.style.display = 'none';

    // Hide workflow buttons
    const executeBtn = document.getElementById('btn-execute');
    const simulateBtn = document.getElementById('btn-simulate');
    const sendBtn = document.getElementById('btn-send');
    if (executeBtn) executeBtn.style.display = 'none';
    if (simulateBtn) simulateBtn.style.display = 'none';
    if (sendBtn) sendBtn.style.display = 'none';

    // Hide Load button
    const btnLoad = document.getElementById('btn-load');
    if (btnLoad) btnLoad.style.display = 'none';

    // Load data and render
    loadAgentsData();
    loadThreadsData();
    renderAgentSidebar();

    // Clear canvas or load first thread
    const threads = getAgentThreads(currentAgentId);
    if (threads.length > 0) {
        loadThreadToCanvas(threads[0].id);
    } else {
        // Clear canvas
        if (typeof app !== 'undefined') {
            app.canvasRenderer.nodes = [];
            app.connectionManager.connections = [];
            app.canvasRenderer.render();
        }
    }

    console.log('Entered Agent mode');
}

function exitAgentMode() {
    if (!agentMode) return;

    agentMode = false;

    // Update sidebar headers
    document.getElementById('agent-header')?.classList.remove('active');
    document.getElementById('design-flow-header')?.classList.add('active');

    // Show/hide sections
    document.getElementById('agent-section').style.display = 'none';
    document.getElementById('design-flow-section').style.display = 'flex';

    // Show workflow buttons
    const executeBtn = document.getElementById('btn-execute');
    const simulateBtn = document.getElementById('btn-simulate');
    const sendBtn = document.getElementById('btn-send');
    if (executeBtn) executeBtn.style.display = '';
    if (simulateBtn) simulateBtn.style.display = '';
    if (sendBtn) sendBtn.style.display = '';

    // Restore Load button
    const btnLoad = document.getElementById('btn-load');
    if (btnLoad) btnLoad.style.display = '';

    // Restore previous Design Flow state
    if (previousDesignFlowStateAgent && typeof app !== 'undefined') {
        app.canvasRenderer.nodes = [];
        app.connectionManager.connections = [];

        // Restore nodes
        previousDesignFlowStateAgent.nodes.forEach(nodeData => {
            const node = Node.fromJSON(nodeData);
            app.canvasRenderer.nodes.push(node);
        });

        // Restore connections
        previousDesignFlowStateAgent.connections.forEach(connData => {
            const fromNode = app.canvasRenderer.nodes.find(n => n.id === connData.fromNode);
            const toNode = app.canvasRenderer.nodes.find(n => n.id === connData.toNode);
            if (fromNode && toNode) {
                app.connectionManager.addConnection(fromNode, connData.fromOutput, toNode, connData.toInput);
            }
        });

        app.canvasRenderer.render();
    }

    console.log('Exited Agent mode');
}

function isAgentMode() {
    return agentMode;
}

// ============================================
// Thread Management
// ============================================

function loadThreadToCanvas(threadId) {
    if (!currentAgentId || !agentThreadsData) return;

    const threads = agentThreadsData[currentAgentId] || [];
    const thread = threads.find(t => t.id === threadId);

    if (!thread || !thread.workflow) return;

    if (typeof app !== 'undefined') {
        // Clear current canvas
        app.canvasRenderer.nodes = [];
        app.connectionManager.connections = [];

        // Load thread's workflow
        if (thread.workflow.nodes) {
            thread.workflow.nodes.forEach(nodeData => {
                const node = Node.fromJSON(nodeData);
                app.canvasRenderer.nodes.push(node);
            });
        }

        if (thread.workflow.connections) {
            thread.workflow.connections.forEach(connData => {
                const fromNode = app.canvasRenderer.nodes.find(n => n.id === connData.fromNode);
                const toNode = app.canvasRenderer.nodes.find(n => n.id === connData.toNode);
                if (fromNode && toNode) {
                    app.connectionManager.addConnection(fromNode, connData.fromOutput, toNode, connData.toInput);
                }
            });
        }

        app.canvasRenderer.render();

        // Fit to view after loading
        setTimeout(() => {
            if (app.canvasRenderer.fitToView) {
                app.canvasRenderer.fitToView();
            }
        }, 100);

        // Auto-show simulation panel in Agent mode
        setTimeout(() => {
            if (app.showSmartWatchSimulator) {
                app.showSmartWatchSimulator();
            }
        }, 150);
    }

    // Update active thread highlight
    renderAgentSidebar();
}

// ============================================
// Sidebar Rendering
// ============================================

function renderAgentSidebar() {
    const section = document.getElementById('agent-section');
    if (!section) return;

    const agent = getCurrentAgent();
    const threads = getAgentThreads(currentAgentId);

    // Build thread list HTML
    let threadListHtml = '';
    if (threads.length === 0) {
        threadListHtml = `<div class="agent-thread-empty">No threads yet</div>`;
    } else {
        threads.forEach(thread => {
            const date = new Date(thread.timestamp);
            const timeAgo = getTimeAgo(date);
            threadListHtml += `
                <div class="agent-thread-item" data-thread-id="${thread.id}">
                    <div class="agent-thread-title">${thread.title || 'Untitled'}</div>
                    <div class="agent-thread-time">${timeAgo}</div>
                </div>
            `;
        });
    }

    let html = `
        <div class="agent-profile-sidebar">
            <div class="agent-avatar">
                ${agent?.avatar ? `<img src="${agent.avatar}" alt="${agent?.name}">` : getDefaultAvatarSVG()}
            </div>
            <div class="agent-name">${agent?.name || 'No Agent'}</div>
        </div>

        <!-- Agent Tabs -->
        <div class="agent-tabs-container">
            <button class="agent-tab-btn active" data-agent-tab="feed">Feed</button>
            <button class="agent-tab-btn" data-agent-tab="behaviour">Behaviour</button>
            <button class="agent-tab-btn" data-agent-tab="config">Configuration</button>
        </div>

        <div class="agent-tabs-content">
            <!-- Feed Tab (Current Flows) -->
            <div class="agent-tab-content active" id="agent-tab-feed">
                <div class="agent-thread-list">
                    ${threadListHtml}
                </div>
            </div>

            <!-- Behaviour Tab -->
            <div class="agent-tab-content" id="agent-tab-behaviour">
                <div class="agent-tab-placeholder">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                        <path d="M12 6v6l4 2"/>
                    </svg>
                    <span>Behaviour settings coming soon</span>
                </div>
            </div>

            <!-- Configuration Tab -->
            <div class="agent-tab-content" id="agent-tab-config">
                <div class="agent-config-section">
                    <div class="agent-config-group">
                        <label class="agent-config-label">API Key Source</label>
                        <select id="agent-api-source" class="agent-config-select">
                            <option value="owner">Provided by me</option>
                            <option value="recipient">Provided by recipient</option>
                        </select>
                    </div>

                    <div class="agent-config-group" id="agent-api-key-group">
                        <label class="agent-config-label">API Key</label>
                        <input type="password" id="agent-api-key-input"
                               class="agent-config-input"
                               placeholder="Enter API key...">
                        <p class="agent-config-hint" id="agent-api-hint">Your API key will be used for this agent</p>
                    </div>

                    <button id="agent-save-config" class="agent-config-save-btn">
                        Save Configuration
                    </button>
                    <div id="agent-config-status" class="agent-config-status"></div>
                </div>
            </div>
        </div>
    `;

    section.innerHTML = html;

    // Add click listeners for threads
    section.querySelectorAll('.agent-thread-item').forEach(item => {
        const threadId = item.dataset.threadId;

        item.addEventListener('click', () => {
            loadThreadToCanvas(threadId);
        });

        // Right-click context menu
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showAgentThreadContextMenu(e, threadId);
        });
    });

    // Add click listeners for tabs
    section.querySelectorAll('.agent-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.agentTab;
            switchAgentTab(tabName);
        });
    });

    // Setup configuration tab listeners
    setupAgentConfigListeners();
}

function switchAgentTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.agent-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-agent-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update tab content
    document.querySelectorAll('.agent-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const activeContent = document.getElementById(`agent-tab-${tabName}`);
    if (activeContent) activeContent.classList.add('active');

    // Load config when switching to config tab
    if (tabName === 'config' && currentAgentId) {
        loadAgentConfig(currentAgentId);
    }
}

// ============================================
// Agent Configuration Functions
// ============================================

function loadAgentConfig(agentId) {
    const configs = JSON.parse(localStorage.getItem('idea-engine-agent-configs') || '{}');
    const config = configs[agentId] || { apiSource: 'owner', apiKey: '' };

    const sourceSelect = document.getElementById('agent-api-source');
    const keyInput = document.getElementById('agent-api-key-input');

    if (sourceSelect) sourceSelect.value = config.apiSource;
    if (keyInput) keyInput.value = config.apiKey;

    updateApiHint(config.apiSource);
}

function saveAgentConfig(agentId) {
    const sourceSelect = document.getElementById('agent-api-source');
    const keyInput = document.getElementById('agent-api-key-input');

    const configs = JSON.parse(localStorage.getItem('idea-engine-agent-configs') || '{}');
    configs[agentId] = {
        apiSource: sourceSelect?.value || 'owner',
        apiKey: keyInput?.value || ''
    };

    localStorage.setItem('idea-engine-agent-configs', JSON.stringify(configs));

    // Show success status
    const statusEl = document.getElementById('agent-config-status');
    if (statusEl) {
        statusEl.textContent = '✓ Configuration saved';
        statusEl.className = 'agent-config-status success';
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = 'agent-config-status';
        }, 2000);
    }
}

function updateApiHint(source) {
    const hint = document.getElementById('agent-api-hint');
    const keyInput = document.getElementById('agent-api-key-input');

    if (source === 'owner') {
        if (hint) hint.textContent = 'Your API key will be used for this agent';
        if (keyInput) keyInput.placeholder = 'Enter your API key...';
    } else {
        if (hint) hint.textContent = 'Users will need to provide their own API key to use this agent';
        if (keyInput) keyInput.placeholder = 'Leave empty - user will provide';
    }
}

function setupAgentConfigListeners() {
    // API source dropdown change
    const apiSourceSelect = document.getElementById('agent-api-source');
    if (apiSourceSelect) {
        apiSourceSelect.addEventListener('change', (e) => {
            updateApiHint(e.target.value);
        });
    }

    // Save button click
    const saveConfigBtn = document.getElementById('agent-save-config');
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', () => {
            if (currentAgentId) {
                saveAgentConfig(currentAgentId);
            }
        });
    }
}

function getDefaultAvatarSVG() {
    return `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
        </svg>
    `;
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

// ============================================
// Agent Selector Popup (Send to Agent)
// ============================================

function showAgentSelector() {
    // Ensure data is loaded
    if (!agentsData) loadAgentsData();
    if (!agentThreadsData) loadThreadsData();

    // Render agent list
    renderAgentSelectorList();

    // Show overlay
    const overlay = document.getElementById('agent-selector-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideAgentSelector() {
    const overlay = document.getElementById('agent-selector-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function renderAgentSelectorList() {
    const list = document.getElementById('agent-selector-list');
    if (!list || !agentsData) return;

    if (agentsData.agents.length === 0) {
        list.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-dim);">No agents available</div>`;
        return;
    }

    let html = '';
    agentsData.agents.forEach(agent => {
        html += `
            <div class="agent-selector-item" data-agent-id="${agent.id}">
                <div class="agent-selector-item-avatar">
                    ${agent.avatar ? `<img src="${agent.avatar}" alt="${agent.name}">` : getDefaultAvatarSVG()}
                </div>
                <div class="agent-selector-item-name">${agent.name}</div>
            </div>
        `;
    });

    list.innerHTML = html;

    // Add click listeners
    list.querySelectorAll('.agent-selector-item').forEach(item => {
        item.addEventListener('click', () => {
            const agentId = item.dataset.agentId;
            sendWorkflowToAgent(agentId);
        });
    });
}

function sendWorkflowToAgent(agentId) {
    // Create thread from current workflow
    const thread = createThreadFromWorkflow(agentId);

    if (thread) {
        // Hide popup
        hideAgentSelector();

        // Switch to the selected agent
        currentAgentId = agentId;
        saveAgentsData();

        // Enter agent mode (will show the new thread)
        enterAgentMode();

        console.log('Workflow sent to agent:', agentId, 'Thread:', thread.id);
    }
}

function createThreadFromWorkflow(agentId) {
    if (!agentId || !agentThreadsData) {
        console.log('createThreadFromWorkflow: Missing agentId or agentThreadsData');
        return null;
    }

    // Get current canvas workflow
    const workflow = getCurrentCanvasWorkflow();
    console.log('createThreadFromWorkflow: workflow has', workflow.nodes?.length || 0, 'nodes');

    // Don't create empty threads
    if (!workflow.nodes || workflow.nodes.length === 0) {
        console.log('Cannot send empty workflow');
        alert('Cannot send empty workflow. Please add nodes to the canvas first.');
        return null;
    }

    // Generate title from first node
    const title = generateThreadTitle(workflow.nodes);

    // Create thread object
    const thread = {
        id: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title,
        timestamp: Date.now(),
        workflow: workflow
    };

    // Initialize agent's threads array if needed
    if (!agentThreadsData[agentId]) {
        agentThreadsData[agentId] = [];
    }

    // Add to beginning (newest first)
    agentThreadsData[agentId].unshift(thread);

    // Save to localStorage
    saveThreadsData();

    return thread;
}

function getCurrentCanvasWorkflow() {
    console.log('getCurrentCanvasWorkflow: app defined?', typeof app !== 'undefined');

    if (typeof app === 'undefined' || !app.canvasRenderer || !app.connectionManager) {
        console.log('getCurrentCanvasWorkflow: app or canvasRenderer or connectionManager is missing');
        return { nodes: [], connections: [] };
    }

    console.log('getCurrentCanvasWorkflow: raw nodes count', app.canvasRenderer.nodes?.length);
    console.log('getCurrentCanvasWorkflow: raw connections count', app.connectionManager.connections?.length);

    // Filter out invalid connections (where outputNode or inputNode is undefined)
    const validConnections = app.connectionManager.connections.filter(c => c.outputNode && c.inputNode);
    console.log('getCurrentCanvasWorkflow: valid connections count', validConnections.length);

    return {
        nodes: app.canvasRenderer.nodes.map(n => n.toJSON()),
        connections: validConnections.map(c => ({
            fromNode: c.outputNode.id,
            fromOutput: c.outputIndex,
            toNode: c.inputNode.id,
            toInput: c.inputIndex
        }))
    };
}

function generateThreadTitle(nodes) {
    if (!nodes || nodes.length === 0) {
        return 'Untitled Thread';
    }

    // Try to get title from first node's type or text property
    const firstNode = nodes[0];
    if (firstNode.properties?.text && firstNode.properties.text.trim()) {
        // Use first 30 chars of text
        const text = firstNode.properties.text.trim();
        return text.length > 30 ? text.substring(0, 30) + '...' : text;
    }

    // Use node type as title
    return firstNode.type || 'Untitled Thread';
}

// ============================================
// Thread Context Menu
// ============================================

function showAgentThreadContextMenu(e, threadId) {
    const menu = document.getElementById('agent-thread-context-menu');
    if (!menu) return;
    contextMenuThreadId = threadId;
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.classList.remove('hidden');
}

function hideAgentThreadContextMenu() {
    const menu = document.getElementById('agent-thread-context-menu');
    if (menu) menu.classList.add('hidden');
    contextMenuThreadId = null;
}

function renameAgentThread(threadId) {
    if (!currentAgentId || !agentThreadsData) return;

    const threads = agentThreadsData[currentAgentId] || [];
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;

    const newName = prompt('Enter new name:', thread.title || 'Untitled');
    if (newName === null) return; // Cancelled

    thread.title = newName.trim() || 'Untitled';
    saveThreadsData();
    renderAgentSidebar();
}

function downloadAgentThread(threadId) {
    if (!currentAgentId || !agentThreadsData) return;

    const threads = agentThreadsData[currentAgentId] || [];
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;

    // Export thread as JSON
    const exportData = {
        id: thread.id,
        title: thread.title,
        timestamp: thread.timestamp,
        workflow: thread.workflow
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${thread.title || 'thread'}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function deleteAgentThread(threadId) {
    if (!currentAgentId || !agentThreadsData) return;

    const threads = agentThreadsData[currentAgentId] || [];
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;

    if (!confirm(`Delete "${thread.title || 'Untitled'}"?`)) return;

    // Remove thread from array
    agentThreadsData[currentAgentId] = threads.filter(t => t.id !== threadId);
    saveThreadsData();
    renderAgentSidebar();

    // Clear canvas if this was the current thread
    if (typeof app !== 'undefined') {
        app.canvasRenderer.nodes = [];
        app.connectionManager.connections = [];
        app.canvasRenderer.render();
    }
}

// ============================================
// Initialization
// ============================================

function initAgentMode() {
    // Load initial data
    loadAgentsData();
    loadThreadsData();

    // Set up click listener for agent header
    const agentHeader = document.getElementById('agent-header');
    if (agentHeader) {
        agentHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.collapse-btn')) {
                enterAgentMode();
            }
        });
    }

    // Exit agent mode when Design Flow header is clicked
    // Note: Chat and Journals handle their own agent mode exit in their enter functions
    const designFlowHeader = document.getElementById('design-flow-header');
    if (designFlowHeader) {
        designFlowHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.collapse-btn') && agentMode) {
                exitAgentMode();
            }
        });
    }

    // Agent selector popup - cancel button
    const cancelAgentSelect = document.getElementById('cancel-agent-select');
    if (cancelAgentSelect) {
        cancelAgentSelect.addEventListener('click', () => {
            hideAgentSelector();
        });
    }

    // Agent selector popup - click outside to close
    const agentSelectorOverlay = document.getElementById('agent-selector-overlay');
    if (agentSelectorOverlay) {
        agentSelectorOverlay.addEventListener('click', (e) => {
            if (e.target === agentSelectorOverlay) {
                hideAgentSelector();
            }
        });
    }

    // Thread context menu - click anywhere to hide
    document.addEventListener('click', hideAgentThreadContextMenu);

    // Thread context menu - action handlers
    const threadContextMenu = document.getElementById('agent-thread-context-menu');
    if (threadContextMenu) {
        threadContextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!contextMenuThreadId) return;

            if (action === 'rename-thread') renameAgentThread(contextMenuThreadId);
            else if (action === 'download-thread') downloadAgentThread(contextMenuThreadId);
            else if (action === 'delete-thread') deleteAgentThread(contextMenuThreadId);

            hideAgentThreadContextMenu();
        });
    }

    console.log('Agent mode initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAgentMode);
} else {
    initAgentMode();
}

// Function to reset agent mode state and restore toolbar
function resetAgentModeState() {
    agentMode = false;

    // Restore buttons that enterAgentMode() hid
    const btnLoad = document.getElementById('btn-load');
    if (btnLoad) btnLoad.style.display = '';

    // Hide agent section and show canvas
    const agentSection = document.getElementById('agent-section');
    const canvasContainer = document.querySelector('.canvas-container');

    if (agentSection) agentSection.style.display = 'none';
    if (canvasContainer) canvasContainer.style.display = 'flex';

    // Reset sidebar state
    document.getElementById('agent-header')?.classList.remove('active');
}

// Export functions globally
window.enterAgentMode = enterAgentMode;
window.exitAgentMode = exitAgentMode;
window.isAgentMode = isAgentMode;
window.resetAgentModeState = resetAgentModeState;
window.createNewAgent = createNewAgent;
window.switchAgent = switchAgent;
window.loadThreadToCanvas = loadThreadToCanvas;
window.showAgentSelector = showAgentSelector;
window.hideAgentSelector = hideAgentSelector;
window.sendWorkflowToAgent = sendWorkflowToAgent;
