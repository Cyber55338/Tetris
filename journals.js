// Journals Module - Date-based canvas system
// Storage key for localStorage
const JOURNAL_CANVASES_STORAGE_KEY = 'idea-engine-journal-canvases';

// Journal state
let journalCanvasData = {};
let currentJournalDate = null;
let journalMode = false;
let previousDesignFlowState = null; // Store design flow canvas state when switching

// Initialize journals system
function initJournals() {
    loadJournalCanvasData();
    currentJournalDate = getTodayDateString();

    // Set up event listeners
    setupJournalEventListeners();

    // Populate the sidebar sections
    populateJournalSidebar();
}

// Date utilities
function getTodayDateString() {
    const now = new Date();
    return formatDate(now);
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDate(dateString) {
    return new Date(dateString + 'T00:00:00');
}

function formatDisplayDate(dateString) {
    const date = parseDate(dateString);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatShortDate(dateString) {
    const date = parseDate(dateString);
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function navigateToDate(dateString) {
    // Save current canvas before switching
    saveCurrentJournalCanvas();

    currentJournalDate = dateString;

    // Load the canvas for the new date
    loadJournalCanvasForDate(dateString);

    // Update watermark
    updateJournalWatermark();

    // Update dates list to highlight current
    renderDatesList();
}

// Data management
function loadJournalCanvasData() {
    const stored = localStorage.getItem(JOURNAL_CANVASES_STORAGE_KEY);
    if (stored) {
        try {
            journalCanvasData = JSON.parse(stored);
        } catch (e) {
            console.error('Failed to parse journal canvas data:', e);
            journalCanvasData = {};
        }
    } else {
        journalCanvasData = {};
    }
}

function saveJournalCanvasData() {
    try {
        localStorage.setItem(JOURNAL_CANVASES_STORAGE_KEY, JSON.stringify(journalCanvasData));
    } catch (e) {
        console.error('Failed to save journal canvas data:', e);
    }
}

function getCanvasForDate(dateString) {
    if (!journalCanvasData[dateString]) {
        journalCanvasData[dateString] = {
            nodes: [],
            connections: []
        };
    }
    return journalCanvasData[dateString];
}

function saveCurrentJournalCanvas() {
    if (!journalMode || !currentJournalDate) return;

    // Get current canvas state from app
    if (typeof app !== 'undefined' && app.canvasRenderer && app.connectionManager) {
        journalCanvasData[currentJournalDate] = {
            nodes: app.canvasRenderer.nodes.map(node => node.toJSON()),
            connections: app.connectionManager.connections.map(conn => ({
                output: { nodeId: conn.outputNode.id, index: conn.outputIndex },
                input: { nodeId: conn.inputNode.id, index: conn.inputIndex }
            }))
        };
        saveJournalCanvasData();
    }
}

function loadJournalCanvasForDate(dateString) {
    const canvasData = getCanvasForDate(dateString);

    if (typeof app !== 'undefined' && app.canvasRenderer && app.connectionManager) {
        // Clear current canvas
        app.canvasRenderer.nodes = [];
        app.connectionManager.connections = [];

        // Load nodes
        if (canvasData.nodes && canvasData.nodes.length > 0) {
            canvasData.nodes.forEach(nodeData => {
                const node = Node.fromJSON(nodeData);
                app.canvasRenderer.nodes.push(node);
            });

            // Load connections
            if (canvasData.connections) {
                canvasData.connections.forEach(connData => {
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
        }

        // Re-render
        app.canvasRenderer.render();
        app.updateNodeCount();
    }
}

// Get all dates with canvases, sorted newest first
function getAllJournalDates() {
    const dates = Object.keys(journalCanvasData).filter(date => {
        const canvas = journalCanvasData[date];
        return canvas.nodes && canvas.nodes.length > 0;
    });

    // Always include today even if empty
    const today = getTodayDateString();
    if (!dates.includes(today)) {
        dates.push(today);
    }

    // Sort newest first
    dates.sort((a, b) => b.localeCompare(a));

    return dates;
}

// Mode switching
function enterJournalMode() {
    journalMode = true;

    // Expand sidebar if collapsed (so user can see the mode they navigated to)
    const sidebar = document.getElementById('node-library');
    if (sidebar && sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        // Resize canvas to fill new space
        if (typeof app !== 'undefined' && app.canvasRenderer) {
            app.canvasRenderer.resizeCanvas();
        }
    }

    // Save current design flow state before switching
    if (typeof app !== 'undefined' && app.canvasRenderer && app.connectionManager) {
        previousDesignFlowState = {
            nodes: app.canvasRenderer.nodes.map(node => node.toJSON()),
            connections: app.connectionManager.connections.map(conn => ({
                output: { nodeId: conn.outputNode.id, index: conn.outputIndex },
                input: { nodeId: conn.inputNode.id, index: conn.inputIndex }
            }))
        };
    }

    // Highlight Journals header
    document.getElementById('journals-header').classList.add('active');
    document.getElementById('design-flow-header').classList.remove('active');

    // Switch sidebar sections
    document.getElementById('design-flow-section').style.display = 'none';
    document.getElementById('journals-section').style.display = 'flex';

    // Keep canvas visible (don't hide it)
    const canvasContainer = document.querySelector('.canvas-container');
    if (canvasContainer) {
        canvasContainer.style.display = 'flex';
    }

    // Hide journal view container (we use the main canvas now)
    const journalViewContainer = document.getElementById('journal-view-container');
    if (journalViewContainer) {
        journalViewContainer.style.display = 'none';
    }

    // Hide workflow buttons
    const executeBtn = document.getElementById('btn-execute');
    const simulateBtn = document.getElementById('btn-simulate');
    const sendBtn = document.getElementById('btn-send');
    if (executeBtn) executeBtn.style.display = 'none';
    if (simulateBtn) simulateBtn.style.display = 'none';
    if (sendBtn) sendBtn.style.display = 'none';

    // Load journal data for current date
    currentJournalDate = getTodayDateString();
    loadJournalCanvasForDate(currentJournalDate);

    // Update watermark to show current date
    updateJournalWatermark();

    // Render the dates list
    renderDatesList();
}

function exitJournalMode() {
    // Save current journal canvas before exiting
    saveCurrentJournalCanvas();

    journalMode = false;

    // Expand sidebar if collapsed (so user can see the mode they navigated to)
    const sidebar = document.getElementById('node-library');
    if (sidebar && sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        // Resize canvas to fill new space
        if (typeof app !== 'undefined' && app.canvasRenderer) {
            app.canvasRenderer.resizeCanvas();
        }
    }

    // Highlight Design Flow header
    document.getElementById('journals-header').classList.remove('active');
    document.getElementById('design-flow-header').classList.add('active');

    // Switch sidebar sections
    document.getElementById('design-flow-section').style.display = 'flex';
    document.getElementById('journals-section').style.display = 'none';

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

    // Restore original watermark
    const watermark = document.getElementById('canvas-watermark');
    if (watermark) {
        watermark.textContent = 'Design Agent algorithm';
    }

    // Restore previous design flow state
    if (previousDesignFlowState && typeof app !== 'undefined' && app.canvasRenderer && app.connectionManager) {
        app.canvasRenderer.nodes = [];
        app.connectionManager.connections = [];

        if (previousDesignFlowState.nodes) {
            previousDesignFlowState.nodes.forEach(nodeData => {
                const node = Node.fromJSON(nodeData);
                app.canvasRenderer.nodes.push(node);
            });
        }

        if (previousDesignFlowState.connections) {
            previousDesignFlowState.connections.forEach(connData => {
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

        app.canvasRenderer.render();
        app.updateNodeCount();
    }
}

function updateJournalWatermark() {
    const watermark = document.getElementById('canvas-watermark');
    if (watermark && journalMode) {
        watermark.textContent = formatDisplayDate(currentJournalDate);
    }
}

// Event handlers
function setupJournalEventListeners() {
    // Clickable headers
    const journalsHeader = document.getElementById('journals-header');
    const designFlowHeader = document.getElementById('design-flow-header');

    if (journalsHeader) {
        journalsHeader.addEventListener('click', (e) => {
            // Prevent triggering if clicking collapse button
            if (!e.target.closest('.collapse-btn')) {
                enterJournalMode();
            }
        });
    }

    if (designFlowHeader) {
        designFlowHeader.addEventListener('click', (e) => {
            // Prevent triggering if clicking collapse button
            if (!e.target.closest('.collapse-btn')) {
                exitJournalMode();
            }
        });
    }

    // Category collapse toggles
    document.querySelectorAll('#journal-node-categories .category-header').forEach(header => {
        header.addEventListener('click', () => {
            const isCollapsed = header.dataset.collapsed === 'true';
            header.dataset.collapsed = !isCollapsed;

            const nodesContainer = header.nextElementSibling;
            if (nodesContainer) {
                nodesContainer.style.display = isCollapsed ? 'flex' : 'none';
            }

            // Rotate collapse icon
            const icon = header.querySelector('.collapse-icon');
            if (icon) {
                icon.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
            }
        });
    });

    // Auto-save journal canvas periodically
    setInterval(() => {
        if (journalMode) {
            saveCurrentJournalCanvas();
        }
    }, 5000); // Save every 5 seconds
}

// Populate sidebar with nodes
function populateJournalSidebar() {
    populateMindInventoryNodes();
    populatePerceptionGraphNodes();
    renderDatesList();
}

function populateMindInventoryNodes() {
    const container = document.getElementById('journal-mindinventory-nodes');
    if (!container) return;

    container.innerHTML = '';

    const mindInventoryNodes = ['Thought', 'Emotion', 'Imagination', 'Belief', 'Action'];

    mindInventoryNodes.forEach(nodeType => {
        const definition = NodeDefinitions[nodeType];
        if (definition) {
            const nodeItem = createDraggableNodeItem(nodeType, definition);
            container.appendChild(nodeItem);
        }
    });
}

function populatePerceptionGraphNodes() {
    const container = document.getElementById('journal-perceptiongraph-nodes');
    if (!container) return;

    container.innerHTML = '';

    const perceptionGraphNodes = ['Dreams', 'Goals', 'Rules', 'Memories', 'Questions', 'Expressions', 'Instructions', 'Problem', 'Danger'];

    perceptionGraphNodes.forEach(nodeType => {
        const definition = NodeDefinitions[nodeType];
        if (definition) {
            const nodeItem = createDraggableNodeItem(nodeType, definition);
            container.appendChild(nodeItem);
        }
    });
}

function createDraggableNodeItem(nodeType, definition) {
    const nodeItem = document.createElement('div');
    nodeItem.className = 'node-item';
    nodeItem.draggable = true;
    nodeItem.dataset.nodeType = nodeType;
    nodeItem.dataset.nodeTitle = definition.title;

    // Color indicator
    const colorIndicator = document.createElement('span');
    colorIndicator.className = 'node-color-indicator';
    colorIndicator.style.backgroundColor = definition.color;
    nodeItem.appendChild(colorIndicator);

    // Node title
    const title = document.createElement('span');
    title.className = 'node-title';
    title.textContent = definition.title;
    nodeItem.appendChild(title);

    // Drag events
    nodeItem.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('nodeType', nodeType);
        e.dataTransfer.effectAllowed = 'copy';
    });

    // Click to add node at center (same as Design Flow)
    nodeItem.addEventListener('click', () => {
        if (typeof app !== 'undefined') {
            app.addNodeAtCenter(nodeType);

            // Auto-save if in journal mode
            if (journalMode) {
                saveCurrentJournalCanvas();
            }
        }
    });

    return nodeItem;
}

function renderDatesList() {
    const container = document.getElementById('journal-dates-list');
    const countBadge = document.getElementById('dates-count');
    if (!container) return;

    container.innerHTML = '';

    const dates = getAllJournalDates();

    // Update count badge
    if (countBadge) {
        countBadge.textContent = dates.length;
    }

    dates.forEach(dateString => {
        const dateItem = document.createElement('div');
        dateItem.className = 'node-item date-item';
        if (dateString === currentJournalDate) {
            dateItem.classList.add('active');
        }
        dateItem.dataset.date = dateString;

        // Calendar icon
        const icon = document.createElement('span');
        icon.className = 'date-icon';
        icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
        dateItem.appendChild(icon);

        // Date text
        const dateText = document.createElement('span');
        dateText.className = 'date-text';

        const today = getTodayDateString();
        const yesterday = formatDate(new Date(Date.now() - 86400000));

        if (dateString === today) {
            dateText.textContent = 'Today';
        } else if (dateString === yesterday) {
            dateText.textContent = 'Yesterday';
        } else {
            dateText.textContent = formatShortDate(dateString);
        }
        dateItem.appendChild(dateText);

        // Node count for this date
        const canvasData = journalCanvasData[dateString];
        if (canvasData && canvasData.nodes && canvasData.nodes.length > 0) {
            const nodeCount = document.createElement('span');
            nodeCount.className = 'date-node-count';
            nodeCount.textContent = canvasData.nodes.length;
            dateItem.appendChild(nodeCount);
        }

        // Click to navigate to date
        dateItem.addEventListener('click', () => {
            navigateToDate(dateString);
        });

        container.appendChild(dateItem);
    });

    // Add "New Date" button
    const addDateBtn = document.createElement('div');
    addDateBtn.className = 'node-item add-date-btn';
    addDateBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Add Date</span>';
    addDateBtn.addEventListener('click', () => {
        // Create date picker
        const input = document.createElement('input');
        input.type = 'date';
        input.style.position = 'absolute';
        input.style.opacity = '0';
        document.body.appendChild(input);

        input.addEventListener('change', () => {
            if (input.value) {
                navigateToDate(input.value);
            }
            document.body.removeChild(input);
        });

        input.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.body.contains(input)) {
                    document.body.removeChild(input);
                }
            }, 100);
        });

        input.click();
    });
    container.appendChild(addDateBtn);
}

// Check if in journal mode (for external use)
function isJournalMode() {
    return journalMode;
}

// Get current journal date (for external use)
function getCurrentJournalDate() {
    return currentJournalDate;
}

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJournals);
} else {
    initJournals();
}
