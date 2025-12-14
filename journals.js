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

    // Set up context menu for journal dates
    setupJournalDateContextMenu();

    // Populate the sidebar sections
    populateJournalSidebar();
}

// Date utilities
function getTodayDateString() {
    const now = new Date();
    return formatJournalDate(now);
}

function formatJournalDate(date) {
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
            connections: [],
            annotations: []
        };
    }
    // Ensure annotations array exists for older saved data
    if (!journalCanvasData[dateString].annotations) {
        journalCanvasData[dateString].annotations = [];
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
            })),
            // Save annotations if manager exists
            annotations: (app.annotationManager) ? app.annotationManager.toJSON() : []
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

        // Clear annotations if manager exists
        if (app.annotationManager) {
            app.annotationManager.clearAnnotations();
        }

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

        // Load annotations if manager exists
        if (app.annotationManager && canvasData.annotations && canvasData.annotations.length > 0) {
            app.annotationManager.fromJSON(canvasData.annotations);
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
        // Include dates with nodes OR annotations
        const hasNodes = canvas.nodes && canvas.nodes.length > 0;
        const hasAnnotations = canvas.annotations && canvas.annotations.length > 0;
        return hasNodes || hasAnnotations;
    });

    // Always include today even if empty
    const today = getTodayDateString();
    if (!dates.includes(today)) {
        dates.push(today);
    }

    // Always include the current date user is viewing (so newly created dates don't disappear)
    if (currentJournalDate && !dates.includes(currentJournalDate)) {
        dates.push(currentJournalDate);
    }

    // Sort newest first
    dates.sort((a, b) => b.localeCompare(a));

    return dates;
}

// Mode switching
function enterJournalMode() {
    // Exit other modes first if active
    if (typeof isChatMode === 'function' && isChatMode() && typeof exitChatMode === 'function') {
        exitChatMode();
    }
    if (typeof isAgentMode === 'function' && isAgentMode() && typeof resetAgentModeState === 'function') {
        // Don't call exitAgentMode() as it will re-activate Design Flow
        // Just reset agent mode state
        resetAgentModeState();
    }
    if (typeof isTasksMode === 'function' && isTasksMode() && typeof resetTasksModeState === 'function') {
        resetTasksModeState();
    }
    if (typeof isMultiplayerMode === 'function' && isMultiplayerMode() && typeof resetMultiplayerModeState === 'function') {
        resetMultiplayerModeState();
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
            })),
            annotations: app.annotationManager ? app.annotationManager.toJSON() : []
        };
    }

    // Highlight Journals header
    document.getElementById('journals-header')?.classList.add('active');
    document.getElementById('design-flow-header')?.classList.remove('active');
    document.getElementById('chat-header')?.classList.remove('active');
    document.getElementById('agent-header')?.classList.remove('active');

    // Switch sidebar sections
    const designFlowSection = document.getElementById('design-flow-section');
    const journalsSection = document.getElementById('journals-section');
    const chatSection = document.getElementById('chat-section');
    const agentSection = document.getElementById('agent-section');

    if (designFlowSection) designFlowSection.style.display = 'none';
    if (chatSection) chatSection.style.display = 'none';
    if (agentSection) agentSection.style.display = 'none';
    if (journalsSection) journalsSection.style.display = 'flex';

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

    // Change New button to Add Date
    const btnNew = document.getElementById('btn-new');
    if (btnNew) {
        // Find and replace the text content
        Array.from(btnNew.childNodes).forEach(node => {
            if (node.nodeType === 3 && node.textContent.trim()) {
                node.textContent = node.textContent.replace('New', 'Add Date');
            }
        });
    }

    // Hide workflow buttons and add Journal-specific buttons
    hideWorkflowToolbarButtons();
    createJournalToolbarButtons();

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
    document.getElementById('journals-header')?.classList.remove('active');
    document.getElementById('design-flow-header')?.classList.add('active');

    // Switch sidebar sections
    const designFlowSection = document.getElementById('design-flow-section');
    const journalsSection = document.getElementById('journals-section');
    if (designFlowSection) designFlowSection.style.display = 'flex';
    if (journalsSection) journalsSection.style.display = 'none';

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

    // Restore New button text
    const btnNew = document.getElementById('btn-new');
    if (btnNew) {
        Array.from(btnNew.childNodes).forEach(node => {
            if (node.nodeType === 3 && node.textContent.trim()) {
                node.textContent = node.textContent.replace('Add Date', 'New');
            }
        });
    }

    // Restore workflow buttons and remove Journal-specific buttons
    showWorkflowToolbarButtons();
    removeJournalToolbarButtons();

    // Restore original watermark
    const watermark = document.getElementById('canvas-watermark');
    if (watermark) {
        watermark.textContent = 'Design Agent algorithm';
    }

    // Restore previous design flow state
    if (previousDesignFlowState && typeof app !== 'undefined' && app.canvasRenderer && app.connectionManager) {
        app.canvasRenderer.nodes = [];
        app.connectionManager.connections = [];

        // Clear journal annotations before restoring Design Flow state
        if (app.annotationManager) {
            app.annotationManager.clearAnnotations();
        }

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

        // Restore Design Flow annotations
        if (app.annotationManager && previousDesignFlowState.annotations && previousDesignFlowState.annotations.length > 0) {
            app.annotationManager.fromJSON(previousDesignFlowState.annotations);
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
            if (!e.target.closest('.collapse-btn') && journalMode) {
                exitJournalMode();
            }
        });
    }

    // Agent header - exit journal mode when clicked
    const agentHeader = document.getElementById('agent-header');
    if (agentHeader) {
        agentHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.collapse-btn') && journalMode) {
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

    // Add date popup event listeners
    document.getElementById('confirm-add-date')?.addEventListener('click', confirmAddDate);
    document.getElementById('cancel-add-date')?.addEventListener('click', hideAddDatePopup);

    // Close popup on overlay click
    document.getElementById('add-date-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'add-date-overlay') {
            hideAddDatePopup();
        }
    });

    // Close popup on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('add-date-overlay');
            if (overlay && !overlay.classList.contains('hidden')) {
                hideAddDatePopup();
            }
        }
    });
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

// Animation paths for sidebar nodes
const sidebarNodeAnimations = {
    'Thought': 'assets/Tetrahedron.json',
    'Imagination': 'assets/Octahedron.json',
    'Action': 'assets/Dodecahedron.json',
    'Belief': 'assets/Icosahedron.json',
    'Emotion': 'assets/Cube.json',
    'Dreams': 'assets/dreams.json',
    'Goals': 'assets/goals.json',
    'Rules': 'assets/rules.json',
    'Memories': 'assets/memories.json',
    'Questions': 'assets/questions.json',
    'Danger': 'assets/dangers.json',
    'Expressions': 'assets/heart.json',
    'Problem': 'assets/question.json',
    'Instructions': 'assets/idea.json'
};

function createDraggableNodeItem(nodeType, definition) {
    const nodeItem = document.createElement('div');
    nodeItem.className = 'node-item';
    nodeItem.draggable = true;
    nodeItem.dataset.nodeType = nodeType;
    nodeItem.dataset.nodeTitle = definition.title;

    // Check if this node has a Lottie animation
    const animPath = sidebarNodeAnimations[nodeType];

    if (animPath && typeof lottie !== 'undefined') {
        // Lottie animation container
        const lottieContainer = document.createElement('div');
        lottieContainer.className = 'sidebar-node-lottie';
        nodeItem.appendChild(lottieContainer);

        // Load animation
        lottie.loadAnimation({
            container: lottieContainer,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: animPath
        });
    } else {
        // Fallback: Color indicator
        const colorIndicator = document.createElement('span');
        colorIndicator.className = 'node-color-indicator';
        colorIndicator.style.backgroundColor = definition.color;
        nodeItem.appendChild(colorIndicator);
    }

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
        const yesterday = formatJournalDate(new Date(Date.now() - 86400000));

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

        // Right-click to show context menu
        dateItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showJournalDateContextMenu(e, dateString);
        });

        container.appendChild(dateItem);
    });
}

// Check if in journal mode (for external use)
function isJournalMode() {
    return journalMode;
}

// Get current journal date (for external use)
function getCurrentJournalDate() {
    return currentJournalDate;
}

// ============================================
// Add Date Popup Functions
// ============================================

// Show add date popup
function showAddDatePopup() {
    const overlay = document.getElementById('add-date-overlay');
    const input = document.getElementById('add-date-input');
    if (overlay) {
        overlay.classList.remove('hidden');
        // Set default to today
        if (input) {
            input.value = getTodayDateString();
            input.focus();
        }
    }
}

// Hide add date popup
function hideAddDatePopup() {
    const overlay = document.getElementById('add-date-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// Handle add date confirmation
function confirmAddDate() {
    const input = document.getElementById('add-date-input');
    const dateValue = input?.value;

    // Validate date format (YYYY-MM-DD) and that it's a valid date
    if (dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
            navigateToDate(dateValue);
            renderDatesList(); // Refresh dates list
            hideAddDatePopup();
            return;
        }
    }

    // If invalid or empty, show alert or just don't close
    if (!dateValue) {
        // Set to today if empty
        input.value = getTodayDateString();
        input.focus();
    }
}

// Export popup functions globally
window.showAddDatePopup = showAddDatePopup;
window.hideAddDatePopup = hideAddDatePopup;

// ============================================
// Journal Toolbar Button Management
// ============================================

/**
 * Create and add Journal-specific toolbar buttons (Text, Arrow)
 */
function createJournalToolbarButtons() {
    const toolbar = document.querySelector('.toolbar-actions');
    if (!toolbar) return;

    // Check if buttons already exist
    if (document.getElementById('btn-add-text')) return;

    // Create Add Text button
    const addTextBtn = document.createElement('button');
    addTextBtn.id = 'btn-add-text';
    addTextBtn.className = 'toolbar-btn journal-mode-btn';
    addTextBtn.title = 'Add Text Annotation';
    addTextBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7V4h16v3"/>
            <path d="M9 20h6"/>
            <path d="M12 4v16"/>
        </svg>
        Text
    `;
    addTextBtn.addEventListener('click', () => {
        if (typeof app !== 'undefined' && app.annotationManager) {
            // Create text at canvas center
            const centerX = -app.canvasRenderer.offsetX / app.canvasRenderer.scale + app.canvas.width / 2 / app.canvasRenderer.scale;
            const centerY = -app.canvasRenderer.offsetY / app.canvasRenderer.scale + app.canvas.height / 2 / app.canvasRenderer.scale;
            app.annotationManager.createTextAnnotation(centerX, centerY);
            app.canvasRenderer.render();
        }
    });

    // Create Add Arrow button
    const addArrowBtn = document.createElement('button');
    addArrowBtn.id = 'btn-add-arrow';
    addArrowBtn.className = 'toolbar-btn journal-mode-btn';
    addArrowBtn.title = 'Add Arrow Annotation (or Shift+Drag on canvas)';
    addArrowBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
        </svg>
        Arrow
    `;
    addArrowBtn.addEventListener('click', () => {
        if (typeof app !== 'undefined' && app.annotationManager) {
            // Create arrow at canvas center
            const centerX = -app.canvasRenderer.offsetX / app.canvasRenderer.scale + app.canvas.width / 2 / app.canvasRenderer.scale;
            const centerY = -app.canvasRenderer.offsetY / app.canvasRenderer.scale + app.canvas.height / 2 / app.canvasRenderer.scale;
            // Create horizontal arrow 100px wide
            const arrow = {
                id: `ann_arrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'arrow',
                startX: centerX - 50,
                startY: centerY,
                endX: centerX + 50,
                endY: centerY,
                strokeColor: '#ffffff',
                strokeWidth: 2,
                arrowheadStart: false,
                arrowheadEnd: true,
                roughness: 1.5,
                selected: true
            };
            app.annotationManager.annotations.push(arrow);
            app.annotationManager.selectAnnotation(arrow);
            app.canvasRenderer.render();
            saveCurrentJournalCanvas();
        }
    });

    // Find the btn-new button and insert after it
    const btnNew = document.getElementById('btn-new');
    if (btnNew && btnNew.nextSibling) {
        toolbar.insertBefore(addArrowBtn, btnNew.nextSibling);
        toolbar.insertBefore(addTextBtn, btnNew.nextSibling);
    } else {
        toolbar.appendChild(addTextBtn);
        toolbar.appendChild(addArrowBtn);
    }
}

/**
 * Remove Journal-specific toolbar buttons
 */
function removeJournalToolbarButtons() {
    const addTextBtn = document.getElementById('btn-add-text');
    const addArrowBtn = document.getElementById('btn-add-arrow');
    if (addTextBtn) addTextBtn.remove();
    if (addArrowBtn) addArrowBtn.remove();
}

/**
 * Hide workflow-related toolbar buttons for Journals mode
 */
function hideWorkflowToolbarButtons() {
    const btnSave = document.getElementById('btn-save');
    const btnClear = document.getElementById('btn-clear');
    const btnLoad = document.getElementById('btn-load');

    if (btnSave) btnSave.style.display = 'none';
    if (btnClear) btnClear.style.display = 'none';
    if (btnLoad) btnLoad.style.display = 'none';
}

/**
 * Show workflow-related toolbar buttons (restore after Journals mode)
 */
function showWorkflowToolbarButtons() {
    const btnSave = document.getElementById('btn-save');
    const btnClear = document.getElementById('btn-clear');
    const btnLoad = document.getElementById('btn-load');

    if (btnSave) btnSave.style.display = 'flex';
    if (btnClear) btnClear.style.display = 'flex';
    if (btnLoad) btnLoad.style.display = 'flex';
}

// ============================================
// Journal Date Context Menu
// ============================================

let contextMenuDateString = null;

function showJournalDateContextMenu(e, dateString) {
    const menu = document.getElementById('journal-date-context-menu');
    if (!menu) return;

    contextMenuDateString = dateString;

    // Position the menu at cursor
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.classList.remove('hidden');

    // Prevent menu from going off-screen
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
        menu.style.left = (window.innerWidth - menuRect.width - 10) + 'px';
    }
    if (menuRect.bottom > window.innerHeight) {
        menu.style.top = (window.innerHeight - menuRect.height - 10) + 'px';
    }
}

function hideJournalDateContextMenu() {
    const menu = document.getElementById('journal-date-context-menu');
    if (menu) menu.classList.add('hidden');
    contextMenuDateString = null;
}

function changeJournalDate(oldDateString) {
    // Show a date picker popup
    const newDate = prompt('Enter new date (YYYY-MM-DD):', oldDateString);

    if (!newDate || newDate === oldDateString) return;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        alert('Invalid date format. Please use YYYY-MM-DD.');
        return;
    }

    // Check if new date is valid
    const dateObj = new Date(newDate + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
        alert('Invalid date.');
        return;
    }

    // Check if new date already has data
    if (journalCanvasData[newDate] &&
        (journalCanvasData[newDate].nodes?.length > 0 ||
         journalCanvasData[newDate].annotations?.length > 0)) {
        const confirm = window.confirm(`The date ${newDate} already has content. Merge with existing data?`);
        if (!confirm) return;

        // Merge: add old nodes/connections/annotations to new date
        const oldData = journalCanvasData[oldDateString];
        const newData = journalCanvasData[newDate];

        if (oldData.nodes) {
            newData.nodes = [...(newData.nodes || []), ...oldData.nodes];
        }
        if (oldData.connections) {
            newData.connections = [...(newData.connections || []), ...oldData.connections];
        }
        if (oldData.annotations) {
            newData.annotations = [...(newData.annotations || []), ...oldData.annotations];
        }
    } else {
        // Move data to new date
        journalCanvasData[newDate] = journalCanvasData[oldDateString];
    }

    // Delete old date entry
    delete journalCanvasData[oldDateString];

    // Save to localStorage
    saveJournalCanvasData();

    // Update current date if we changed the active one
    if (currentJournalDate === oldDateString) {
        currentJournalDate = newDate;
        updateJournalWatermark();
    }

    // Refresh the dates list
    renderDatesList();
}

function deleteJournalDate(dateString) {
    // Don't allow deleting today
    const today = getTodayDateString();
    if (dateString === today) {
        alert("Cannot delete today's journal. You can clear the canvas instead.");
        return;
    }

    // Check if there's content
    const data = journalCanvasData[dateString];
    const hasContent = data && (data.nodes?.length > 0 || data.annotations?.length > 0);

    if (hasContent) {
        const confirmDelete = window.confirm(`Delete journal for ${formatDisplayDate(dateString)}? This will permanently remove all nodes and annotations.`);
        if (!confirmDelete) return;
    }

    // If we're deleting the current date, change currentJournalDate FIRST
    // to prevent saveCurrentJournalCanvas from recreating the entry
    const wasCurrentDate = (currentJournalDate === dateString);
    if (wasCurrentDate) {
        currentJournalDate = today;
    }

    // Delete the entry
    delete journalCanvasData[dateString];
    saveJournalCanvasData();

    // If we deleted the current date, load today's canvas
    if (wasCurrentDate) {
        loadJournalCanvasForDate(today);
        updateJournalWatermark();
    }

    // Refresh the dates list
    renderDatesList();
}

function setupJournalDateContextMenu() {
    // Hide menu when clicking anywhere
    document.addEventListener('click', hideJournalDateContextMenu);

    // Handle menu item clicks
    const menu = document.getElementById('journal-date-context-menu');
    if (menu) {
        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!contextMenuDateString) return;

            if (action === 'change-date') {
                changeJournalDate(contextMenuDateString);
            } else if (action === 'delete-date') {
                deleteJournalDate(contextMenuDateString);
            }

            hideJournalDateContextMenu();
        });
    }
}

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJournals);
} else {
    initJournals();
}
