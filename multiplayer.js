// Multiplayer Module - Isolated mode for multiplayer features
const MULTIPLAYER_STORAGE_KEY = 'idea-engine-multiplayer';

// Multiplayer state
let multiplayerMode = false;
let previousDesignFlowStateMultiplayer = null;

// Initialize multiplayer system
function initMultiplayer() {
    setupMultiplayerEventListeners();
    populateMultiplayerSidebar();
    console.log('Multiplayer mode initialized');
}

// Enter Multiplayer mode
function enterMultiplayerMode() {
    // Exit other modes first if active
    if (typeof isChatMode === 'function' && isChatMode() && typeof exitChatMode === 'function') {
        exitChatMode();
    }
    if (typeof isAgentMode === 'function' && isAgentMode() && typeof resetAgentModeState === 'function') {
        resetAgentModeState();
    }
    if (typeof isTasksMode === 'function' && isTasksMode() && typeof resetTasksModeState === 'function') {
        resetTasksModeState();
    }
    if (typeof isJournalMode === 'function' && isJournalMode() && typeof exitJournalMode === 'function') {
        exitJournalMode();
    }

    // Hide tasks view container and section
    const tasksView = document.getElementById('tasks-view-container');
    const tasksSection = document.getElementById('tasks-section');
    if (tasksView) tasksView.style.display = 'none';
    if (tasksSection) tasksSection.style.display = 'none';
    document.getElementById('tasks-header')?.classList.remove('active');

    // Hide gamification UI from chat mode
    if (typeof hideGamificationUI === 'function') {
        hideGamificationUI();
    }

    multiplayerMode = true;

    // Expand sidebar if collapsed
    const sidebar = document.getElementById('node-library');
    if (sidebar && sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        if (typeof app !== 'undefined' && app.canvasRenderer) {
            app.canvasRenderer.resizeCanvas();
        }
    }

    // Save current design flow state before switching
    if (typeof app !== 'undefined' && app.canvasRenderer && app.connectionManager) {
        previousDesignFlowStateMultiplayer = {
            nodes: app.canvasRenderer.nodes.map(node => node.toJSON()),
            connections: app.connectionManager.connections.map(conn => ({
                output: { nodeId: conn.outputNode.id, index: conn.outputIndex },
                input: { nodeId: conn.inputNode.id, index: conn.inputIndex }
            })),
            annotations: app.annotationManager ? app.annotationManager.toJSON() : []
        };
    }

    // Update sidebar headers
    document.getElementById('multiplayer-header')?.classList.add('active');
    document.getElementById('design-flow-header')?.classList.remove('active');
    document.getElementById('journals-header')?.classList.remove('active');
    document.getElementById('chat-header')?.classList.remove('active');
    document.getElementById('agent-header')?.classList.remove('active');
    document.getElementById('tasks-header')?.classList.remove('active');

    // Switch sidebar sections
    const designFlowSection = document.getElementById('design-flow-section');
    const journalsSection = document.getElementById('journals-section');
    const chatSection = document.getElementById('chat-section');
    const agentSection = document.getElementById('agent-section');
    const multiplayerSection = document.getElementById('multiplayer-section');

    if (designFlowSection) designFlowSection.style.display = 'none';
    if (journalsSection) journalsSection.style.display = 'none';
    if (chatSection) chatSection.style.display = 'none';
    if (agentSection) agentSection.style.display = 'none';
    if (tasksSection) tasksSection.style.display = 'none';
    if (multiplayerSection) multiplayerSection.style.display = 'flex';

    // Keep canvas visible
    const canvasContainer = document.querySelector('.canvas-container');
    if (canvasContainer) {
        canvasContainer.style.display = 'flex';
    }

    // Clear canvas for multiplayer mode
    if (typeof app !== 'undefined' && app.canvasRenderer && app.connectionManager) {
        app.canvasRenderer.nodes = [];
        app.connectionManager.connections = [];
        if (app.annotationManager) {
            app.annotationManager.clearAnnotations();
        }
        app.canvasRenderer.render();
        app.updateNodeCount();
    }

    // Update watermark
    const watermark = document.getElementById('canvas-watermark');
    if (watermark) {
        watermark.textContent = 'Multiplayer Mode';
    }

    // Hide workflow buttons that don't apply
    const executeBtn = document.getElementById('btn-execute');
    const simulateBtn = document.getElementById('btn-simulate');
    const sendBtn = document.getElementById('btn-send');
    if (executeBtn) executeBtn.style.display = 'none';
    if (simulateBtn) simulateBtn.style.display = 'none';
    if (sendBtn) sendBtn.style.display = 'none';
}

// Exit Multiplayer mode
function exitMultiplayerMode() {
    if (!multiplayerMode) return;

    multiplayerMode = false;

    // Expand sidebar if collapsed
    const sidebar = document.getElementById('node-library');
    if (sidebar && sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        if (typeof app !== 'undefined' && app.canvasRenderer) {
            app.canvasRenderer.resizeCanvas();
        }
    }

    // Update headers
    document.getElementById('multiplayer-header')?.classList.remove('active');
    document.getElementById('design-flow-header')?.classList.add('active');

    // Switch sections
    const designFlowSection = document.getElementById('design-flow-section');
    const multiplayerSection = document.getElementById('multiplayer-section');
    if (designFlowSection) designFlowSection.style.display = 'flex';
    if (multiplayerSection) multiplayerSection.style.display = 'none';

    // Keep canvas visible
    const canvasContainer = document.querySelector('.canvas-container');
    if (canvasContainer) {
        canvasContainer.style.display = 'flex';
    }

    // Show workflow buttons
    const executeBtn = document.getElementById('btn-execute');
    const simulateBtn = document.getElementById('btn-simulate');
    const sendBtn = document.getElementById('btn-send');
    if (executeBtn) executeBtn.style.display = 'flex';
    if (simulateBtn) simulateBtn.style.display = 'flex';
    if (sendBtn) sendBtn.style.display = 'flex';

    // Restore watermark
    const watermark = document.getElementById('canvas-watermark');
    if (watermark) {
        watermark.textContent = 'Design Agent algorithm';
    }

    // Restore previous design flow state
    if (previousDesignFlowStateMultiplayer && typeof app !== 'undefined' && app.canvasRenderer && app.connectionManager) {
        app.canvasRenderer.nodes = [];
        app.connectionManager.connections = [];

        // Clear annotations before restoring
        if (app.annotationManager) {
            app.annotationManager.clearAnnotations();
        }

        if (previousDesignFlowStateMultiplayer.nodes) {
            previousDesignFlowStateMultiplayer.nodes.forEach(nodeData => {
                const node = Node.fromJSON(nodeData);
                app.canvasRenderer.nodes.push(node);
            });
        }

        if (previousDesignFlowStateMultiplayer.connections) {
            previousDesignFlowStateMultiplayer.connections.forEach(connData => {
                const outputNode = app.canvasRenderer.nodes.find(n => n.id === connData.output.nodeId);
                const inputNode = app.canvasRenderer.nodes.find(n => n.id === connData.input.nodeId);

                if (outputNode && inputNode) {
                    app.connectionManager.connections.push({
                        outputNode: outputNode,
                        outputIndex: connData.output.index,
                        inputNode: inputNode,
                        inputIndex: connData.input.index
                    });
                }
            });
        }

        // Restore annotations
        if (app.annotationManager && previousDesignFlowStateMultiplayer.annotations && previousDesignFlowStateMultiplayer.annotations.length > 0) {
            app.annotationManager.fromJSON(previousDesignFlowStateMultiplayer.annotations);
        }

        app.canvasRenderer.render();
        app.updateNodeCount();
    }
}

// Check if in multiplayer mode
function isMultiplayerMode() {
    return multiplayerMode;
}

// Reset multiplayer mode state (used when exiting to another mode)
function resetMultiplayerModeState() {
    multiplayerMode = false;
    document.getElementById('multiplayer-header')?.classList.remove('active');
    const multiplayerSection = document.getElementById('multiplayer-section');
    if (multiplayerSection) multiplayerSection.style.display = 'none';
}

// Setup event listeners
function setupMultiplayerEventListeners() {
    // Multiplayer header click
    const multiplayerHeader = document.getElementById('multiplayer-header');
    if (multiplayerHeader) {
        multiplayerHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.collapse-btn')) {
                enterMultiplayerMode();
            }
        });
    }

    // Design Flow header - exit multiplayer when clicked
    const designFlowHeader = document.getElementById('design-flow-header');
    if (designFlowHeader) {
        designFlowHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.collapse-btn') && multiplayerMode) {
                exitMultiplayerMode();
            }
        });
    }

    // Agent header - exit multiplayer when clicked
    const agentHeader = document.getElementById('agent-header');
    if (agentHeader) {
        agentHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.collapse-btn') && multiplayerMode) {
                resetMultiplayerModeState();
            }
        });
    }

    // Journals header - exit multiplayer when clicked
    const journalsHeader = document.getElementById('journals-header');
    if (journalsHeader) {
        journalsHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.collapse-btn') && multiplayerMode) {
                resetMultiplayerModeState();
            }
        });
    }

    // Chat header - exit multiplayer when clicked
    const chatHeader = document.getElementById('chat-header');
    if (chatHeader) {
        chatHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.collapse-btn') && multiplayerMode) {
                resetMultiplayerModeState();
            }
        });
    }

    // Tasks header - exit multiplayer when clicked
    const tasksHeader = document.getElementById('tasks-header');
    if (tasksHeader) {
        tasksHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.collapse-btn') && multiplayerMode) {
                resetMultiplayerModeState();
            }
        });
    }
}

// Populate multiplayer sidebar (placeholder for future content)
function populateMultiplayerSidebar() {
    const container = document.getElementById('multiplayer-section');
    if (!container) return;

    // Placeholder content - user will implement later
    // The HTML already has placeholder content
}

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMultiplayer);
} else {
    initMultiplayer();
}

// Global exports
window.isMultiplayerMode = isMultiplayerMode;
window.enterMultiplayerMode = enterMultiplayerMode;
window.exitMultiplayerMode = exitMultiplayerMode;
window.resetMultiplayerModeState = resetMultiplayerModeState;
