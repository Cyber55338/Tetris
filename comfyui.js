// Main Application - ComfyUI Clone

// Global cleanup function for mode switching
function cleanupAllModeUI() {
    // Hide tasks view container
    const tasksView = document.getElementById('tasks-view-container');
    if (tasksView) tasksView.style.display = 'none';

    // Hide gamification UI if exists
    if (typeof hideGamificationUI === 'function') {
        hideGamificationUI();
    }

    // Ensure canvas is visible
    const canvas = document.querySelector('.canvas-container');
    if (canvas) canvas.style.display = 'flex';

    // Show properties panel
    const props = document.getElementById('properties-panel');
    if (props) props.style.display = '';

    // Show workflow buttons
    const executeBtn = document.getElementById('btn-execute');
    const simulateBtn = document.getElementById('btn-simulate');
    const sendBtn = document.getElementById('btn-send');
    if (executeBtn) executeBtn.style.display = '';
    if (simulateBtn) simulateBtn.style.display = '';
    if (sendBtn) sendBtn.style.display = '';

    // Restore all toolbar buttons (hidden by Tasks mode)
    const btnNew = document.getElementById('btn-new');
    const btnSave = document.getElementById('btn-save');
    const btnClear = document.getElementById('btn-clear');
    const btnLoad = document.getElementById('btn-load');
    const btnDownload = document.getElementById('btn-download');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnFitView = document.getElementById('btn-fit-view');
    const btnProfile = document.getElementById('btn-profile');
    const zoomLevel = document.getElementById('zoom-level');

    if (btnNew) btnNew.style.display = '';
    if (btnSave) btnSave.style.display = '';
    if (btnClear) btnClear.style.display = '';
    if (btnLoad) btnLoad.style.display = '';
    if (btnDownload) btnDownload.style.display = '';
    if (btnZoomIn) btnZoomIn.style.display = '';
    if (btnZoomOut) btnZoomOut.style.display = '';
    if (btnFitView) btnFitView.style.display = '';
    if (btnProfile) btnProfile.style.display = '';
    if (zoomLevel) zoomLevel.style.display = '';

    // Remove connection status indicator if it exists (cleanup orphaned element)
    const connectionIndicator = document.getElementById('connection-status-indicator');
    if (connectionIndicator) connectionIndicator.remove();

    // Restore toolbar separators
    document.querySelectorAll('.toolbar-separator').forEach(sep => sep.style.display = '');
}
window.cleanupAllModeUI = cleanupAllModeUI;

class ComfyUIApp {
    constructor() {
        this.canvas = document.getElementById('workflow-canvas');
        this.canvasRenderer = new CanvasRenderer(this.canvas);
        this.connectionManager = new ConnectionManager();
        this.workflowManager = new WorkflowManager(this.canvasRenderer, this.connectionManager);

        // Make globally accessible
        window.connectionManager = this.connectionManager;
        window.canvasRenderer = this.canvasRenderer;
        window.workflowManager = this.workflowManager;

        // Annotation Manager (for Journals mode text/arrow annotations)
        this.annotationManager = new AnnotationManager(this.canvas);
        window.annotationManager = this.annotationManager;

        // Interaction state
        this.isDraggingNode = false;
        this.draggedNode = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.dragOffsets = null; // Map of node -> {x, y} offsets for multi-select drag
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.isConnecting = false;
        this.connectionStartPort = null;

        // Marquee selection state
        this.isMarqueeSelecting = false;
        this.marqueeStartX = 0;
        this.marqueeStartY = 0;
        this.marqueeEndX = 0;
        this.marqueeEndY = 0;
        this.marqueeThreshold = 5; // pixels before marquee activates
        this.potentialMarquee = false; // true when mousedown on empty, waiting for drag

        // Clipboard
        this.clipboard = null;

        // Simulation mode state
        this.simulationMode = false;
        this.simulationNodes = [];           // Execution order array
        this.currentSimulationStep = -1;     // Current step index (-1 = not started)
        this.simulationAnimationId = null;   // requestAnimationFrame ID
        this.simulationParticles = [];       // Active particles for connection animation
        this.generatingNodeIds = [];         // Nodes currently generating AI content
        this.isGenerating = false;           // Flag to prevent multiple generations
        this.isAnimatingStep = false;        // Flag to prevent multiple step advances
        this.watchShape = localStorage.getItem('idea-engine-watch-shape') || 'round';  // Watch shape: 'round' or 'square'
        this.typewriterIntervalId = null;    // Typewriter effect interval ID
        this.watchDisplayTimeoutId = null;   // Watch display delay timeout ID
        this.watchDisplayVersion = 0;        // Version counter to cancel stale updates
        this.generatingDotsIntervalId = null; // Generating dots animation interval ID
        this.simulationAbortController = null; // AbortController for simulation listeners
        this.showingPropertiesInSimulation = false; // Track if showing properties while in simulation mode

        // Profile Dashboard state
        this.isProfileViewActive = false;
        this.originalPropertiesContent = null;
        this.profileData = {
            username: 'User',
            address: '0x742d35Cc6634C0532925a3b844Bc9e7595F3e8',
            followers: 0,
            following: 0,
            created: 0,
            tokens: [
                { symbol: 'ETH', name: 'Ethereum', type: 'Native Gas Token', balance: 1.2345, usd: 2847.50 },
                { symbol: 'BNB', name: 'BNB', type: 'Native Gas Token', balance: 0.1576, usd: 94.56 },
                { symbol: 'USDT', name: 'Tether', type: 'Stablecoin', balance: 500.00, usd: 500.00 },
                { symbol: 'MATIC', name: 'Polygon', type: 'Layer 2 Token', balance: 250.75, usd: 187.50 }
            ],
            holdings: [
                { symbol: 'TOP', name: 'Top Coin', balance: 98055714.57 }
            ]
        };

        // Profile & Smartwatch Connection State
        this.isProfileConnected = localStorage.getItem('idea-engine-profile-connected') === 'true';
        this.connectedSmartwatch = localStorage.getItem('idea-engine-smartwatch') || null;
        this.availableSmartwatches = [
            { id: 'apple-watch', name: 'Apple Watch Series 9', brand: 'Apple', icon: '⌚' },
            { id: 'galaxy-watch', name: 'Galaxy Watch 6', brand: 'Samsung', icon: '⌚' },
            { id: 'fitbit-sense', name: 'Fitbit Sense 2', brand: 'Fitbit', icon: '⌚' },
            { id: 'garmin-venu', name: 'Garmin Venu 3', brand: 'Garmin', icon: '⌚' },
            { id: 'pixel-watch', name: 'Pixel Watch 2', brand: 'Google', icon: '⌚' },
            { id: 'amazfit-gtr', name: 'Amazfit GTR 4', brand: 'Amazfit', icon: '⌚' }
        ];

        // Initialize
        this.initializeUI();
        this.setupEventListeners();
        this.populateNodeLibrary();

        // Auto-save
        this.workflowManager.enableAutoSave();

        // Try to load autosaved workflow
        const autosaved = this.workflowManager.loadFromLocalStorage();
        if (autosaved && autosaved.nodes.length > 0) {
            const shouldLoad = confirm('Found autosaved workflow. Load it?');
            if (shouldLoad) {
                this.workflowManager.loadWorkflow(autosaved);
            }
        }
    }

    initializeUI() {
        // Set up initial canvas size
        this.canvasRenderer.resizeCanvas();

        // Update node count
        this.updateNodeCount();

        // Set zoom display
        window.updateZoomDisplay = (scale) => {
            document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
        };

        // Initialize connection UI state
        this.updateConnectionUI();
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('btn-new').addEventListener('click', () => {
            // In chat mode, this is handled by chat.js
            if (typeof isChatMode === 'function' && isChatMode()) return;

            // In journals mode, show add date popup
            if (typeof isJournalMode === 'function' && isJournalMode()) {
                if (typeof showAddDatePopup === 'function') {
                    showAddDatePopup();
                }
                return;
            }

            this.workflowManager.newWorkflow();
            this.updateNodeCount();
        });

        document.getElementById('btn-save').addEventListener('click', () => {
            // Show save workflow form (only in Design Flow mode)
            if (typeof chatMode === 'undefined' || !chatMode) {
                if (typeof journalMode === 'undefined' || !journalMode) {
                    document.getElementById('save-workflow-form').classList.remove('hidden');
                }
            }
        });

        document.getElementById('btn-load').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        document.getElementById('file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.workflowManager.loadWorkflowFromFile(file);
                this.updateNodeCount();
            }
            e.target.value = ''; // Reset input
        });

        document.getElementById('btn-execute').addEventListener('click', () => {
            this.workflowManager.executeWorkflow();
        });

        document.getElementById('btn-simulate').addEventListener('click', () => {
            this.showSmartWatchSimulator();
        });

        document.getElementById('btn-send').addEventListener('click', () => {
            // Only in Design Flow mode (not chat, journal, or agent mode)
            const inChatMode = typeof isChatMode === 'function' && isChatMode();
            const inJournalMode = typeof isJournalMode === 'function' && isJournalMode();
            const inAgentMode = typeof isAgentMode === 'function' && isAgentMode();

            if (!inChatMode && !inJournalMode && !inAgentMode) {
                if (typeof showAgentSelector === 'function') {
                    showAgentSelector();
                }
            }
        });

        document.getElementById('btn-download').addEventListener('click', () => {
            this.workflowManager.saveWorkflow();
        });

        document.getElementById('btn-clear').addEventListener('click', () => {
            if (confirm('Clear all nodes?')) {
                this.canvasRenderer.clearNodes();
                this.updateNodeCount();
            }
        });

        // Zoom controls
        document.getElementById('btn-zoom-in').addEventListener('click', () => {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            this.canvasRenderer.zoomIn(centerX, centerY);
        });

        document.getElementById('btn-zoom-out').addEventListener('click', () => {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            this.canvasRenderer.zoomOut(centerX, centerY);
        });

        document.getElementById('btn-fit-view').addEventListener('click', () => {
            this.canvasRenderer.fitToView();
        });

        // Profile button - toggle profile dashboard
        document.getElementById('btn-profile').addEventListener('click', () => {
            if (this.isProfileViewActive) {
                this.hideProfileDashboard();
            } else {
                this.showProfileDashboard();
            }
        });

        // Profile Connect button
        document.getElementById('btn-profile-connect').addEventListener('click', () => {
            this.toggleProfileConnection();
        });

        // Smartwatch button
        document.getElementById('btn-smartwatch').addEventListener('click', () => {
            if (this.isProfileConnected) {
                this.showSmartwatchSelector();
            }
        });

        // Smartwatch selector cancel button
        document.getElementById('cancel-smartwatch-select').addEventListener('click', () => {
            this.hideSmartwatchSelector();
        });

        // Close smartwatch selector on overlay click
        document.getElementById('smartwatch-selector-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'smartwatch-selector-overlay') {
                this.hideSmartwatchSelector();
            }
        });

        // Minimap toggle
        document.getElementById('minimap-toggle').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('minimap-container').classList.toggle('collapsed');
        });

        // Minimap header click to toggle
        document.querySelector('.minimap-header').addEventListener('click', (e) => {
            if (e.target.classList.contains('minimap-toggle') || e.target.closest('.minimap-toggle')) {
                return; // Let the button handle it
            }
            document.getElementById('minimap-container').classList.toggle('collapsed');
        });

        // Minimap canvas click to navigate
        document.getElementById('minimap-canvas').addEventListener('click', (e) => {
            const rect = e.target.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            // This would require converting minimap coordinates to canvas coordinates
            // For now, just center the view on click
            this.canvasRenderer.fitToView();
        });

        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onCanvasWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => this.onCanvasContextMenu(e));
        this.canvas.addEventListener('dblclick', (e) => this.onCanvasDoubleClick(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.onKeyDown(e));

        // Node search
        document.getElementById('node-search').addEventListener('input', (e) => {
            this.filterNodes(e.target.value);
        });

        // Sidebar collapse buttons (library & properties) with better UX and ARIA state
        const libraryPanel = document.getElementById('node-library');
        const libraryToggle = document.getElementById('collapse-library');
        const journalsToggle = document.getElementById('collapse-journals'); // Journals arrow button
        const propertiesPanel = document.getElementById('properties-panel');
        const propertiesToggle = document.getElementById('collapse-properties');

        const bindSidebarToggle = (panel, toggleBtn) => {
            if (!panel || !toggleBtn) return;

            const updateAria = () => {
                const isCollapsed = panel.classList.contains('collapsed');
                toggleBtn.setAttribute('aria-expanded', (!isCollapsed).toString());
            };

            const handleToggle = () => {
                panel.classList.toggle('collapsed');
                updateAria();

                // Sync body class for simulation mode collapsed state
                if (panel.id === 'properties-panel') {
                    const isCollapsed = panel.classList.contains('collapsed');
                    document.body.classList.toggle('simulation-collapsed', isCollapsed);
                }

                // When sidebars resize, also resize the canvas so it fills the new space
                if (this.canvasRenderer) {
                    this.canvasRenderer.resizeCanvas();
                }
            };

            // Button click toggles collapsed state
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleToggle();
            });

            // Make entire header clickable ONLY for properties panel (right sidebar)
            // Left sidebar (node-library) uses Journals/Design Flow navigation in journals.js
            if (panel.id === 'properties-panel') {
                const header = panel.querySelector('.sidebar-header');
                if (header) {
                    header.addEventListener('click', (e) => {
                        if (e.target.closest('.collapse-btn')) return;
                        handleToggle();
                    });
                }
            }

            // Initialize ARIA state
            updateAria();
        };

        bindSidebarToggle(libraryPanel, libraryToggle);
        bindSidebarToggle(libraryPanel, journalsToggle); // Both arrows control the same sidebar
        bindSidebarToggle(propertiesPanel, propertiesToggle);

        // Context menu
        document.addEventListener('click', () => {
            this.hideContextMenu();
            this.hideWorkflowContextMenu();
            this.hideAnnotationContextMenu();
        });

        // Workflow context menu actions
        const workflowContextMenu = document.getElementById('workflow-context-menu');
        if (workflowContextMenu) {
            workflowContextMenu.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (!this.contextMenuWorkflowId) return;

                if (action === 'rename-workflow') {
                    this.renameSavedWorkflow(this.contextMenuWorkflowId);
                } else if (action === 'delete-workflow') {
                    this.deleteSavedWorkflow(this.contextMenuWorkflowId);
                }

                this.hideWorkflowContextMenu();
            });
        }

        // Window resize
        window.addEventListener('resize', () => {
            this.canvasRenderer.resizeCanvas();
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Workflow manager
        document.getElementById('confirm-save-btn').addEventListener('click', () => {
            const name = document.getElementById('workflow-name-input').value.trim();
            if (name) {
                this.saveNamedWorkflow(name);
                document.getElementById('workflow-name-input').value = '';
                document.getElementById('save-workflow-form').classList.add('hidden');
            }
        });

        document.getElementById('cancel-save-btn').addEventListener('click', () => {
            document.getElementById('workflow-name-input').value = '';
            document.getElementById('save-workflow-form').classList.add('hidden');
        });

        // Load workflow list on startup
        this.loadWorkflowList();
    }

    onCanvasMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const canvasPos = this.canvasRenderer.screenToCanvas(screenX, screenY);

        // Check for port click (for connections)
        let clickedPort = null;
        let clickedNode = null;

        for (const node of this.canvasRenderer.nodes) {
            const port = node.getPortAtPosition(canvasPos.x, canvasPos.y);
            if (port) {
                clickedPort = port;
                clickedNode = node;
                break;
            }
        }

        if (clickedPort) {
            // Start connection from either output OR input port
            if (clickedPort.type === 'output' || clickedPort.type === 'input') {
                this.isConnecting = true;
                this.connectionStartPort = {
                    node: clickedNode,
                    type: clickedPort.type,  // 'output' or 'input'
                    index: clickedPort.index,
                    port: clickedPort.port
                };
                // Set visual start position based on port type
                if (clickedPort.type === 'output') {
                    this.canvasRenderer.connectionStart = clickedNode.getOutputPosition(clickedPort.index);
                } else {
                    this.canvasRenderer.connectionStart = clickedNode.getInputPosition(clickedPort.index);
                }
                this.canvasRenderer.isConnecting = true;
            }
            return;
        }

        // Check for node click
        const clickedNode2 = this.canvasRenderer.getNodeAtPosition(canvasPos.x, canvasPos.y);

        // In Journals mode, check for annotation clicks before node clicks
        if (typeof isJournalMode === 'function' && isJournalMode() && this.annotationManager && !clickedNode2) {
            const clickedAnnotation = this.annotationManager.getAnnotationAtPosition(canvasPos.x, canvasPos.y);

            if (clickedAnnotation) {
                // Check if clicking on text resize handle
                if (clickedAnnotation.type === 'text' && clickedAnnotation.selected) {
                    const resizeHandle = this.annotationManager.getTextResizeHandle(canvasPos.x, canvasPos.y, clickedAnnotation);
                    if (resizeHandle) {
                        this.annotationManager.startTextResize(clickedAnnotation, resizeHandle, canvasPos);
                        return;
                    }
                }

                // Check if clicking on arrow endpoint handle
                if (clickedAnnotation.type === 'arrow' && clickedAnnotation.selected) {
                    const endpoint = this.annotationManager.getArrowEndpointHandle(canvasPos.x, canvasPos.y, clickedAnnotation);
                    if (endpoint) {
                        this.annotationManager.startEndpointEdit(clickedAnnotation, endpoint);
                        return;
                    }
                }

                // Select and start dragging annotation
                this.annotationManager.startDragging(clickedAnnotation, canvasPos.x, canvasPos.y);
                this.canvasRenderer.render();
                return;
            }

            // Shift+drag on empty canvas in Journal mode: start arrow drawing
            if (e.shiftKey && e.button === 0) {
                this.annotationManager.startArrowDrawing(canvasPos.x, canvasPos.y);
                return;
            }
        }

        if (clickedNode2) {
            // Start dragging node
            this.isDraggingNode = true;
            this.draggedNode = clickedNode2;
            this.dragOffsetX = canvasPos.x - clickedNode2.x;
            this.dragOffsetY = canvasPos.y - clickedNode2.y;

            // Check if clicked node is already selected (for multi-drag)
            const selectedNodes = this.canvasRenderer.selectedNodes;
            const isAlreadySelected = selectedNodes.includes(clickedNode2);

            // Only change selection if NOT clicking an already-selected node
            if (!isAlreadySelected) {
                if (!e.ctrlKey && !e.metaKey) {
                    this.canvasRenderer.selectNode(clickedNode2, false);
                } else {
                    this.canvasRenderer.selectNode(clickedNode2, true);
                }
            }

            // Store offsets for ALL selected nodes (for group drag)
            this.dragOffsets = new Map();
            const currentSelected = this.canvasRenderer.selectedNodes;

            // If clicked node is part of selection, drag all selected nodes together
            if (currentSelected.includes(clickedNode2)) {
                for (const node of currentSelected) {
                    this.dragOffsets.set(node, {
                        x: canvasPos.x - node.x,
                        y: canvasPos.y - node.y
                    });
                }
            } else {
                // Clicked unselected node - just drag that one
                this.dragOffsets.set(clickedNode2, {
                    x: canvasPos.x - clickedNode2.x,
                    y: canvasPos.y - clickedNode2.y
                });
            }

            this.updatePropertiesPanel(clickedNode2);

            // Notify chat mode of selection
            if (typeof onChatNodeSelected === 'function') {
                onChatNodeSelected(clickedNode2);
            }
        } else {
            // Empty canvas click
            if (e.button === 0) { // Left click - prepare for marquee
                this.potentialMarquee = true;
                this.marqueeStartX = screenX;
                this.marqueeStartY = screenY;
                // Deselect all
                this.canvasRenderer.deselectAll();
                this.updatePropertiesPanel(null);
            } else if (e.button === 1) { // Middle button - pan only
                this.isPanning = true;
                this.panStartX = e.clientX;
                this.panStartY = e.clientY;
                this.canvas.classList.add('dragging');
            }
        }
    }

    onCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const canvasPos = this.canvasRenderer.screenToCanvas(screenX, screenY);

        // Track last pointer position in canvas space for paste placement fallback
        this.lastPointerCanvasPos = canvasPos;

        // Update canvas coordinates display
        document.getElementById('canvas-coords').textContent =
            `X: ${Math.round(canvasPos.x)}, Y: ${Math.round(canvasPos.y)}`;

        // Handle annotation operations in Journals mode
        if (typeof isJournalMode === 'function' && isJournalMode() && this.annotationManager) {
            // Text box resizing
            if (this.annotationManager.isResizingText) {
                this.annotationManager.updateTextResize(canvasPos.x, canvasPos.y);
                this.canvasRenderer.render();
                return;
            }

            // Arrow drawing
            if (this.annotationManager.isDrawingArrow) {
                this.annotationManager.updateArrowDrawing(canvasPos.x, canvasPos.y);
                this.canvasRenderer.render();
                return;
            }

            // Annotation dragging
            if (this.annotationManager.isDraggingAnnotation) {
                this.annotationManager.updateDragging(canvasPos.x, canvasPos.y);
                this.canvasRenderer.render();
                return;
            }

            // Arrow endpoint editing
            if (this.annotationManager.editingEndpoint) {
                this.annotationManager.updateEndpoint(canvasPos.x, canvasPos.y);
                this.canvasRenderer.render();
                return;
            }
        }

        if (this.isDraggingNode && this.dragOffsets) {
            // Drag all selected nodes together
            for (const [node, offset] of this.dragOffsets) {
                node.x = canvasPos.x - offset.x;
                node.y = canvasPos.y - offset.y;
            }
            this.canvasRenderer.render();
            this.workflowManager.markDirty();
        } else if (this.isPanning) {
            // Pan canvas
            const dx = e.clientX - this.panStartX;
            const dy = e.clientY - this.panStartY;
            this.canvasRenderer.pan(dx, dy);
            this.panStartX = e.clientX;
            this.panStartY = e.clientY;
        } else if (this.isConnecting) {
            // Update temporary connection
            this.canvasRenderer.tempConnectionEnd = { x: canvasPos.x, y: canvasPos.y };
            this.canvasRenderer.render();
        } else if (this.potentialMarquee) {
            // Check if moved enough to start marquee
            const dx = screenX - this.marqueeStartX;
            const dy = screenY - this.marqueeStartY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > this.marqueeThreshold) {
                this.isMarqueeSelecting = true;
                this.potentialMarquee = false;
                this.marqueeEndX = screenX;
                this.marqueeEndY = screenY;
                this.canvasRenderer.setMarquee(
                    this.marqueeStartX, this.marqueeStartY,
                    this.marqueeEndX, this.marqueeEndY
                );
                this.canvasRenderer.render();
            }
        } else if (this.isMarqueeSelecting) {
            // Update marquee end position
            this.marqueeEndX = screenX;
            this.marqueeEndY = screenY;
            this.canvasRenderer.setMarquee(
                this.marqueeStartX, this.marqueeStartY,
                this.marqueeEndX, this.marqueeEndY
            );
            this.canvasRenderer.render();
        } else {
            // Update hover state
            const hoveredNode = this.canvasRenderer.getNodeAtPosition(canvasPos.x, canvasPos.y);
            if (hoveredNode !== this.canvasRenderer.hoveredNode) {
                this.canvasRenderer.hoveredNode = hoveredNode;
                this.canvasRenderer.render();
            }

            // Update hovered port
            let hoveredPort = null;
            if (hoveredNode) {
                const port = hoveredNode.getPortAtPosition(canvasPos.x, canvasPos.y);
                if (port) {
                    hoveredPort = { node: hoveredNode, ...port };
                }
            }

            if (JSON.stringify(hoveredPort) !== JSON.stringify(this.canvasRenderer.hoveredPort)) {
                this.canvasRenderer.hoveredPort = hoveredPort;
                this.canvasRenderer.render();
            }
        }
    }

    onCanvasMouseUp(e) {
        // Handle annotation operations in Journals mode
        if (typeof isJournalMode === 'function' && isJournalMode() && this.annotationManager) {
            // Stop text box resizing
            if (this.annotationManager.isResizingText) {
                this.annotationManager.stopTextResize();
                this.canvasRenderer.render();
                return;
            }

            // Finish arrow drawing
            if (this.annotationManager.isDrawingArrow) {
                this.annotationManager.finishArrowDrawing();
                this.canvasRenderer.render();
                return;
            }

            // Stop annotation dragging
            if (this.annotationManager.isDraggingAnnotation) {
                this.annotationManager.stopDragging();
                this.canvasRenderer.render();
                return;
            }

            // Stop endpoint editing
            if (this.annotationManager.editingEndpoint) {
                this.annotationManager.stopEndpointEdit();
                this.canvasRenderer.render();
                return;
            }
        }

        if (this.isConnecting) {
            // End connection
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const canvasPos = this.canvasRenderer.screenToCanvas(screenX, screenY);

            // Determine target port type based on where we started
            const startedFromOutput = this.connectionStartPort.type === 'output';
            const targetPortType = startedFromOutput ? 'input' : 'output';

            // Find target - first try specific port, then fall back to node
            let targetNode = null;
            let targetPortIndex = null;

            // First: Try to find exact port of the opposite type
            for (const node of this.canvasRenderer.nodes) {
                const port = node.getPortAtPosition(canvasPos.x, canvasPos.y);
                if (port && port.type === targetPortType) {
                    targetNode = node;
                    targetPortIndex = port.index;
                    break;
                }
            }

            // Second: If no port found, check if over any node (auto-connect fallback)
            if (!targetNode) {
                for (const node of this.canvasRenderer.nodes) {
                    if (node.containsPoint(canvasPos.x, canvasPos.y)) {
                        // Skip the source node (can't connect to self)
                        if (node === this.connectionStartPort.node) continue;

                        // Find first available port of target type
                        if (startedFromOutput) {
                            // Looking for input port
                            if (node.inputs && node.inputs.length > 0) {
                                targetNode = node;
                                targetPortIndex = 0;
                                break;
                            }
                        } else {
                            // Looking for output port
                            if (node.outputs && node.outputs.length > 0) {
                                targetNode = node;
                                targetPortIndex = 0;
                                break;
                            }
                        }
                    }
                }
            }

            // Create connection if we found a valid target
            if (targetNode && targetPortIndex !== null) {
                let outputNode, outputIndex, inputNode, inputIndex;

                if (startedFromOutput) {
                    // Started from output, target is input
                    outputNode = this.connectionStartPort.node;
                    outputIndex = this.connectionStartPort.index;
                    inputNode = targetNode;
                    inputIndex = targetPortIndex;
                } else {
                    // Started from input, target is output (REVERSE)
                    outputNode = targetNode;
                    outputIndex = targetPortIndex;
                    inputNode = this.connectionStartPort.node;
                    inputIndex = this.connectionStartPort.index;
                }

                // Validate and create connection
                const outputPort = { index: outputIndex, port: outputNode.outputs[outputIndex] };
                const inputPort = { index: inputIndex, port: inputNode.inputs[inputIndex] };

                if (this.connectionManager.canConnect(outputPort, inputPort)) {
                    this.connectionManager.addConnection(outputNode, outputIndex, inputNode, inputIndex);
                    this.workflowManager.markDirty();
                } else {
                    this.workflowManager.showNotification('Incompatible port types', 'error');
                }
            }

            this.isConnecting = false;
            this.connectionStartPort = null;
            this.canvasRenderer.connectionStart = null;
            this.canvasRenderer.tempConnectionEnd = null;
            this.canvasRenderer.isConnecting = false;
            this.canvasRenderer.render();
        }

        // Handle marquee selection completion
        if (this.isMarqueeSelecting) {
            const rect = this.canvasRenderer.getMarqueeBounds();
            const nodesInRect = this.canvasRenderer.getNodesInRect(rect);
            nodesInRect.forEach(node => {
                this.canvasRenderer.selectNode(node, true); // multi-select
            });

            this.isMarqueeSelecting = false;
            this.canvasRenderer.clearMarquee();
            this.canvasRenderer.render();
        }

        // Reset all states
        this.potentialMarquee = false;
        this.isDraggingNode = false;
        this.draggedNode = null;
        this.dragOffsets = null;
        this.isPanning = false;
        this.canvas.classList.remove('dragging');
    }

    onCanvasWheel(e) {
        e.preventDefault();

        // Ctrl+wheel = zoom (pinch gesture on trackpad)
        if (e.ctrlKey) {
            const rect = this.canvas.getBoundingClientRect();
            const centerX = e.clientX - rect.left;
            const centerY = e.clientY - rect.top;

            if (e.deltaY < 0) {
                this.canvasRenderer.zoomIn(centerX, centerY);
            } else {
                this.canvasRenderer.zoomOut(centerX, centerY);
            }
        } else {
            // Regular scroll = pan (two-finger drag on trackpad)
            this.canvasRenderer.pan(-e.deltaX, -e.deltaY);
        }
    }

    onCanvasContextMenu(e) {
        e.preventDefault();

        // Track where the context menu was opened in canvas coordinates (for paste placement)
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const canvasPos = this.canvasRenderer.screenToCanvas(screenX, screenY);
        this.lastContextMenuCanvasPos = canvasPos;

        // Check if right-clicked on annotation in Journals mode
        if (typeof isJournalMode === 'function' && isJournalMode() && this.annotationManager) {
            const clickedAnnotation = this.annotationManager.getAnnotationAtPosition(canvasPos.x, canvasPos.y);
            if (clickedAnnotation) {
                this.annotationManager.selectAnnotation(clickedAnnotation);
                this.selectedAnnotationForContextMenu = clickedAnnotation;
                this.canvasRenderer.render();
                this.showAnnotationContextMenu(e.clientX, e.clientY);
                return;
            }
        }

        // Position context menu at cursor (viewport coordinates for position: fixed)
        this.showContextMenu(e.clientX, e.clientY);
    }

    onCanvasDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const canvasPos = this.canvasRenderer.screenToCanvas(screenX, screenY);

        // Check if double-clicked on a node in Journals mode
        const clickedNode = this.canvasRenderer.getNodeAtPosition(canvasPos.x, canvasPos.y);
        if (clickedNode && typeof isJournalMode === 'function' && isJournalMode()) {
            this.openNodeTextEditor(clickedNode);
            return;
        }

        // Check if double-clicked on an annotation in Journals mode
        if (typeof isJournalMode === 'function' && isJournalMode() && this.annotationManager) {
            const clickedAnnotation = this.annotationManager.getAnnotationAtPosition(canvasPos.x, canvasPos.y);
            if (clickedAnnotation) {
                if (clickedAnnotation.type === 'text') {
                    // Edit existing text annotation
                    this.annotationManager.openTextEditor(clickedAnnotation);
                }
                return;
            }

            // Double-click on empty canvas in Journal mode: create text annotation
            if (!clickedNode) {
                this.annotationManager.createTextAnnotation(canvasPos.x, canvasPos.y);
                return;
            }
        }

        // Check if double-clicked on a connection
        const connection = this.connectionManager.getConnectionAtPosition(canvasPos.x, canvasPos.y, 10);
        if (connection) {
            // Remove connection
            this.connectionManager.removeConnection(connection);
            this.canvasRenderer.render();
            this.workflowManager.markDirty();
        }
    }

    // Helper: Check if user is editing text or has text selected
    isUserEditingText() {
        // Check 1: Is focus on a text input element?
        const activeEl = document.activeElement;
        const isFocusedOnTextInput = activeEl && (
            activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.tagName === 'SELECT' ||
            activeEl.isContentEditable
        );

        if (isFocusedOnTextInput) {
            return true;
        }

        // Check 2: Is there an active text selection anywhere?
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
            return true;
        }

        return false;
    }

    onKeyDown(e) {
        // Check if user is editing text (for non-Ctrl shortcuts like Delete)
        const isTyping = this.isUserEditingText();

        // Delete key
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // Only delete if NOT typing in an input field
            if (!isTyping) {
                // First check for selected annotation in Journals mode
                if (typeof isJournalMode === 'function' && isJournalMode() &&
                    this.annotationManager && this.annotationManager.selectedAnnotation) {
                    e.preventDefault();
                    this.annotationManager.deleteSelected();
                    this.canvasRenderer.render();
                    return;
                }

                // Then check for selected nodes
                if (this.canvasRenderer.selectedNodes.length > 0) {
                    e.preventDefault();
                    this.canvasRenderer.deleteSelected();
                    this.updateNodeCount();
                    this.updatePropertiesPanel(null);
                    this.workflowManager.markDirty();
                }
            }
        }

        // Ctrl/Cmd shortcuts
        if (e.ctrlKey || e.metaKey) {
            // Skip node shortcuts if user is editing text or has text selected
            if (this.isUserEditingText()) {
                // Allow default browser copy/paste behavior for text
                return;
            }

            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.workflowManager.saveWorkflow();
                    break;
                case 'n':
                    e.preventDefault();
                    this.workflowManager.newWorkflow();
                    this.updateNodeCount();
                    break;
                case 'o':
                    e.preventDefault();
                    document.getElementById('file-input').click();
                    break;
                case 'a':
                    e.preventDefault();
                    this.canvasRenderer.nodes.forEach(node => {
                        node.selected = true;
                        this.canvasRenderer.selectedNodes.push(node);
                    });
                    this.canvasRenderer.render();
                    break;
                case 'c':
                    e.preventDefault();
                    this.copySelected();
                    break;
                case 'v':
                    e.preventDefault();
                    this.paste();
                    break;
                case 'd':
                    e.preventDefault();
                    this.duplicateSelected();
                    break;
            }
        }

        // Zoom shortcuts
        if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            this.canvasRenderer.zoomIn(centerX, centerY);
        }
        if (e.key === '-') {
            e.preventDefault();
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            this.canvasRenderer.zoomOut(centerX, centerY);
        }
        if (e.key === '0') {
            e.preventDefault();
            this.canvasRenderer.resetZoom();
        }

        // Fit to view
        if ((e.key === 'f' || e.key === 'F') && !isTyping) {
            e.preventDefault();
            this.canvasRenderer.fitToView();
        }

        // Escape - deselect all
        if (e.key === 'Escape') {
            this.canvasRenderer.deselectAll();
            this.updatePropertiesPanel(null);
        }
    }

    populateNodeLibrary() {
        const categories = getNodesByCategory();
        const container = document.getElementById('node-categories');
        container.innerHTML = '';

        for (const [categoryId, nodes] of Object.entries(categories)) {
            // Hide chat nodes from Design Flow sidebar (only used in Chat mode)
            if (categoryId === 'chat') {
                continue;
            }

            const categoryInfo = NodeCategories[categoryId] || { title: categoryId, icon: '📦' };

            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'node-category';
            categoryDiv.dataset.category = categoryId;

            const header = document.createElement('div');
            header.className = 'category-header';
            header.innerHTML = `
                <svg class="category-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
                ${categoryInfo.icon} ${categoryInfo.title}
                <span class="category-badge">${nodes.length}</span>
            `;

            header.addEventListener('click', () => {
                categoryDiv.classList.toggle('collapsed');
            });

            const nodesContainer = document.createElement('div');
            nodesContainer.className = 'category-nodes';

            // Animation paths for sidebar
            const sidebarAnimations = {
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

            nodes.forEach(nodeInfo => {
                const nodeItem = document.createElement('div');
                nodeItem.className = 'node-item';
                nodeItem.dataset.nodeType = nodeInfo.type;
                nodeItem.dataset.nodeTitle = nodeInfo.title;

                // Check if this node has a Lottie animation
                const animPath = sidebarAnimations[nodeInfo.type];

                if (animPath && typeof lottie !== 'undefined') {
                    // Lottie animation container
                    const lottieContainer = document.createElement('div');
                    lottieContainer.className = 'sidebar-node-lottie';
                    nodeItem.appendChild(lottieContainer);

                    lottie.loadAnimation({
                        container: lottieContainer,
                        renderer: 'svg',
                        loop: true,
                        autoplay: true,
                        path: animPath
                    });
                }

                // Node title
                const title = document.createElement('span');
                title.className = 'node-title';
                title.textContent = nodeInfo.title;
                nodeItem.appendChild(title);

                // Drag and drop
                nodeItem.draggable = true;
                nodeItem.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('nodeType', nodeInfo.type);
                });

                // Click to add
                nodeItem.addEventListener('click', () => {
                    this.addNodeAtCenter(nodeInfo.type);
                });

                nodesContainer.appendChild(nodeItem);
            });

            categoryDiv.appendChild(header);
            categoryDiv.appendChild(nodesContainer);
            container.appendChild(categoryDiv);
        }

        // Setup drop zone on canvas
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const nodeType = e.dataTransfer.getData('nodeType');
            if (nodeType) {
                const rect = this.canvas.getBoundingClientRect();
                const screenX = e.clientX - rect.left;
                const screenY = e.clientY - rect.top;
                const canvasPos = this.canvasRenderer.screenToCanvas(screenX, screenY);

                this.addNode(nodeType, canvasPos.x, canvasPos.y);
            }
        });
    }

    filterNodes(query) {
        const categories = document.querySelectorAll('.node-category');
        const lowerQuery = query.toLowerCase().trim();
        let totalVisible = 0;

        categories.forEach(category => {
            const categoryName = category.dataset.category;
            const categoryTitle = NodeCategories[categoryName]?.title?.toLowerCase() || '';
            const items = category.querySelectorAll('.node-item');
            let visibleInCategory = 0;

            items.forEach(item => {
                const title = item.dataset.nodeTitle?.toLowerCase() || '';
                const type = item.dataset.nodeType?.toLowerCase() || '';

                // Match against title, type, or category name
                const matches = !lowerQuery ||
                    title.includes(lowerQuery) ||
                    type.includes(lowerQuery) ||
                    categoryTitle.includes(lowerQuery);

                if (matches) {
                    item.classList.remove('hidden');
                    visibleInCategory++;
                    totalVisible++;
                } else {
                    item.classList.add('hidden');
                }
            });

            // Hide category if no visible nodes
            if (visibleInCategory === 0 && lowerQuery) {
                category.classList.add('hidden');
            } else {
                category.classList.remove('hidden');
                // Auto-expand categories with matches when searching
                if (lowerQuery && visibleInCategory > 0) {
                    category.classList.remove('collapsed');
                }
            }
        });

        // Show/hide "no results" message
        this.updateSearchNoResults(totalVisible === 0 && lowerQuery);
    }

    updateSearchNoResults(show) {
        let noResults = document.getElementById('search-no-results');

        if (show) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.id = 'search-no-results';
                noResults.className = 'search-no-results';
                noResults.textContent = 'No nodes found';
                document.getElementById('node-categories').appendChild(noResults);
            }
            noResults.style.display = 'block';
        } else if (noResults) {
            noResults.style.display = 'none';
        }
    }

    addNode(nodeType, x, y) {
        const node = new Node(nodeType, x, y);
        this.canvasRenderer.addNode(node);
        this.updateNodeCount();
        this.workflowManager.markDirty();

        // Auto-save if in journal mode
        if (typeof isJournalMode === 'function' && isJournalMode()) {
            saveCurrentJournalCanvas();
        }

        return node;
    }

    addNodeAtCenter(nodeType) {
        const centerX = -this.canvasRenderer.offsetX / this.canvasRenderer.scale + this.canvas.width / 2 / this.canvasRenderer.scale;
        const centerY = -this.canvasRenderer.offsetY / this.canvasRenderer.scale + this.canvas.height / 2 / this.canvasRenderer.scale;
        this.addNode(nodeType, centerX - 100, centerY - 50);
    }

    updateNodeCount() {
        document.getElementById('node-count').textContent = `Nodes: ${this.canvasRenderer.nodes.length}`;
    }

    updatePropertiesPanel(node) {
        // Skip if chat mode is active (chat panel handles its own UI)
        if (typeof isChatMode === 'function' && isChatMode()) {
            return;
        }

        // During simulation mode: handle smart switching between simulation and properties
        if (this.simulationMode) {
            const header = document.querySelector('#properties-panel .sidebar-header h2');
            if (node) {
                // User clicked a node - show properties temporarily
                this.showingPropertiesInSimulation = true;
                if (header) header.textContent = 'Properties';
                // Continue to show properties below...
            } else {
                // User clicked empty canvas - return to simulation
                this.showingPropertiesInSimulation = false;
                this.renderSimulationPanel();
                if (header) header.textContent = 'Simulation';
                return;
            }
        }

        const container = document.getElementById('properties-content');

        if (!node) {
            container.innerHTML = `
                <div class="no-selection">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="7" height="7"/>
                        <rect x="14" y="3" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/>
                        <rect x="3" y="14" width="7" height="7"/>
                    </svg>
                    <p>Select a node to view properties</p>
                </div>
            `;
            return;
        }

        let html = '';

        // Profile Picture Section for Agent node only
        if (node.type === 'Agent') {
            // Only treat as valid image if it's a data URL (base64) or http/https URL
            const imageValue = node.properties.image || '';
            const hasImage = imageValue.startsWith('data:') || imageValue.startsWith('http://') || imageValue.startsWith('https://');
            html += `
                <div class="property-group" style="text-align: center; margin-bottom: 16px;">
                    ${hasImage ? `
                        <img src="${node.properties.image}"
                             style="width: 150px; height: 150px; border-radius: 75px; object-fit: cover; border: 3px solid ${node.color};"
                             onerror="this.style.display='none'"
                             alt="Profile">
                    ` : `
                        <div style="width: 150px; height: 150px; border-radius: 75px; border: 3px solid ${node.color};
                                    margin: 0 auto; display: flex; align-items: center; justify-content: center;
                                    background: #1a1a1a;">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="${node.color}" stroke-width="1.5">
                                <circle cx="12" cy="12" r="10"/>
                                <circle cx="12" cy="10" r="3"/>
                                <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855"/>
                            </svg>
                        </div>
                    `}
                </div>
            `;
        }

        // Progress Bar Section
        if ('progress' in node.properties) {
            html += `
                <div class="property-group" style="margin-bottom: 16px;">
                    <div class="property-label" style="margin-bottom: 12px;">Progress</div>

                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="font-size: 11px; color: #b0b0b0;">Completion</span>
                            <span style="font-size: 11px; color: #b0b0b0;">${node.properties.progress}%</span>
                        </div>
                        <div style="background: #2a2a2a; border-radius: 4px; height: 10px; overflow: hidden;">
                            <div style="background: ${node.color}; height: 100%; width: ${node.properties.progress}%; transition: width 0.3s;"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Special UI for Terminal node - AI Workflow Generator
        if (node.type === 'Terminal') {
            html += `
                <div class="property-group" style="margin-bottom: 16px;">
                    <div class="property-label" style="margin-bottom: 8px;">AI Workflow Generator</div>
                    <p style="font-size: 11px; color: #888; margin-bottom: 12px;">Describe the workflow you want to create...</p>
                    <textarea id="ai-prompt-input"
                              style="width: 100%; min-height: 120px; padding: 10px; background: var(--bg-tertiary);
                                     border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary);
                                     font-size: 13px; font-family: inherit; resize: vertical;"
                              placeholder="Example: Create a workflow for helping my friend with their dreams using a mentor"></textarea>
                    <button id="generate-workflow-btn" class="btn btn-primary" style="width: 100%; margin-top: 12px;">
                        ✨ Generate Workflow
                    </button>
                    <div id="generation-status" style="margin-top: 8px; font-size: 12px; color: #888; text-align: center;"></div>
                </div>
            `;
        }

        html += `
            <div class="property-group">
                <div class="property-label">Node Type</div>
                <div class="property-value">${node.type}</div>
            </div>
            <div class="property-group">
                <div class="property-label">Node ID</div>
                <div class="property-value" style="font-size: 10px; font-family: monospace;">${node.id}</div>
            </div>
        `;

        if (Object.keys(node.properties).length > 0) {
            html += '<div class="property-group"><div class="property-label">Properties</div>';

            Object.entries(node.properties).forEach(([key, value]) => {
                const definition = NodeDefinitions[node.type];
                const propDef = definition?.properties?.find(p => p.name === key);

                // In Journal mode, skip dataSource property entirely
                if (key === 'dataSource' && typeof isJournalMode === 'function' && isJournalMode()) {
                    return; // Skip this property
                }

                // Format camelCase to Title Case (e.g., "dataSource" -> "Data source")
                let formattedLabel;
                if (key === 'dataSource') {
                    formattedLabel = 'Data source';
                } else if (key === 'text' && node.type === 'Agent') {
                    formattedLabel = 'Prompt';
                } else if (key === 'image' && node.type === 'Agent') {
                    formattedLabel = 'Profile Image';
                } else {
                    formattedLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                }

                html += `<div style="margin-top: 8px;">`;
                html += `<label style="display: block; font-size: 11px; color: #b0b0b0; margin-bottom: 4px;">${formattedLabel}</label>`;

                if (propDef?.type === 'select') {
                    html += `<select class="property-select" data-property="${key}">`;
                    propDef.options.forEach(opt => {
                        html += `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`;
                    });
                    html += `</select>`;
                } else if (propDef?.type === 'text') {
                    // Use larger textarea for Agent nodes' prompt field
                    const rows = (key === 'text' && node.type === 'Agent') ? '16' : '12';
                    html += `<textarea class="property-input" data-property="${key}" rows="${rows}">${value}</textarea>`;

                    // Add buttons below TEXT/Prompt field for Agent nodes
                    if (key === 'text' && node.type === 'Agent') {
                        html += `
                            <div style="display: flex; gap: 8px; margin-top: 8px;">
                                <button class="btn btn-primary" id="generate-text-btn-${node.id}"
                                        style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                        <path d="M2 17l10 5 10-5"/>
                                        <path d="M2 12l10 5 10-5"/>
                                    </svg>
                                    Generate with AI
                                </button>
                                <button class="btn btn-secondary" id="add-text-file-btn-${node.id}"
                                        style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                        <polyline points="17 8 12 3 7 8"/>
                                        <line x1="12" y1="3" x2="12" y2="15"/>
                                    </svg>
                                    Add file
                                </button>
                            </div>
                        `;
                    }
                } else if (key === 'image' && node.type === 'Agent') {
                    // For Agent nodes, don't show the image text input (just show buttons)
                    // This prevents users from typing text that gets treated as a URL
                } else {
                    html += `<input type="text" class="property-input" data-property="${key}" value="${value}">`;
                }

                // Add buttons below IMAGE field for Agent nodes
                if (key === 'image' && node.type === 'Agent') {
                    html += `
                        <div style="display: flex; gap: 8px; margin-top: 8px;">
                            <button class="btn btn-primary" id="generate-image-btn-${node.id}"
                                    style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                </svg>
                                Generate with AI
                            </button>
                            <button class="btn btn-secondary" id="add-image-file-btn-${node.id}"
                                    style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                Add file
                            </button>
                        </div>
                    `;
                }

                html += `</div>`;
            });

            html += '</div>';
        }

        container.innerHTML = html;

        // Add event listeners for property changes
        container.querySelectorAll('.property-input, .property-select').forEach(input => {
            input.addEventListener('change', (e) => {
                const property = e.target.dataset.property;
                node.properties[property] = e.target.value;
                this.canvasRenderer.render();
                this.workflowManager.markDirty();
            });
        });

        // Add event listener for AI workflow generation (Terminal node)
        const generateBtn = document.getElementById('generate-workflow-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                const promptInput = document.getElementById('ai-prompt-input');
                const prompt = promptInput?.value.trim();
                if (prompt) {
                    this.generateWorkflowWithAI(prompt);
                } else {
                    this.showGenerationStatus('Please enter a prompt', 'error');
                }
            });
        }

        // Add event listeners for Agent node TEXT buttons
        const generateTextBtn = document.getElementById(`generate-text-btn-${node.id}`);
        if (generateTextBtn) {
            generateTextBtn.addEventListener('click', () => {
                this.generateNodeContentWithAI(node);
            });
        }

        const addTextFileBtn = document.getElementById(`add-text-file-btn-${node.id}`);
        if (addTextFileBtn) {
            addTextFileBtn.addEventListener('click', () => {
                this.handleTextFileUpload(node);
            });
        }

        // Add event listeners for Agent node IMAGE buttons
        const generateImageBtn = document.getElementById(`generate-image-btn-${node.id}`);
        if (generateImageBtn) {
            generateImageBtn.addEventListener('click', () => {
                this.generateImageWithAI(node);
            });
        }

        const addImageFileBtn = document.getElementById(`add-image-file-btn-${node.id}`);
        if (addImageFileBtn) {
            addImageFileBtn.addEventListener('click', () => {
                this.handleImageUpload(node);
            });
        }
    }

    showContextMenu(x, y) {
        const menu = document.getElementById('context-menu');

        // Show menu so we can measure its size
        menu.classList.remove('hidden');

        const menuRect = menu.getBoundingClientRect();
        const menuWidth = menuRect.width;
        const menuHeight = menuRect.height;

        // Clamp position so the menu stays fully inside the viewport (for position: fixed)
        const padding = 4;
        const maxX = window.innerWidth - menuWidth - padding;
        const maxY = window.innerHeight - menuHeight - padding;

        const clampedX = Math.max(padding, Math.min(x, maxX));
        const clampedY = Math.max(padding, Math.min(y, maxY));

        menu.style.left = clampedX + 'px';
        menu.style.top = clampedY + 'px';

        // Add event listeners
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.onclick = () => {
                const action = item.dataset.action;
                this.handleContextMenuAction(action);
                this.hideContextMenu();
            };
        });
    }

    hideContextMenu() {
        document.getElementById('context-menu').classList.add('hidden');
    }

    // Annotation Context Menu (Journals Mode)
    showAnnotationContextMenu(x, y) {
        const menu = document.getElementById('annotation-context-menu');
        if (!menu) return;

        // Show menu so we can measure its size
        menu.classList.remove('hidden');

        const menuRect = menu.getBoundingClientRect();
        const menuWidth = menuRect.width;
        const menuHeight = menuRect.height;

        // Clamp position so the menu stays fully inside the viewport
        const padding = 4;
        const maxX = window.innerWidth - menuWidth - padding;
        const maxY = window.innerHeight - menuHeight - padding;

        const clampedX = Math.max(padding, Math.min(x, maxX));
        const clampedY = Math.max(padding, Math.min(y, maxY));

        menu.style.left = clampedX + 'px';
        menu.style.top = clampedY + 'px';

        // Add event listeners
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.onclick = () => {
                const action = item.dataset.action;
                this.handleAnnotationContextMenuAction(action);
                this.hideAnnotationContextMenu();
            };
        });
    }

    hideAnnotationContextMenu() {
        const menu = document.getElementById('annotation-context-menu');
        if (menu) menu.classList.add('hidden');
    }

    handleAnnotationContextMenuAction(action) {
        const annotation = this.selectedAnnotationForContextMenu;
        if (!annotation) return;

        switch (action) {
            case 'convert-to-thought':
                this.convertAnnotationToNode(annotation, 'Thought');
                break;
            case 'convert-to-imagination':
                this.convertAnnotationToNode(annotation, 'Imagination');
                break;
            case 'convert-to-belief':
                this.convertAnnotationToNode(annotation, 'Belief');
                break;
            case 'edit-annotation':
                if (annotation.type === 'text') {
                    this.annotationManager.openTextEditor(annotation);
                }
                break;
            case 'delete-annotation':
                this.annotationManager.removeAnnotation(annotation);
                this.canvasRenderer.render();
                break;
        }
        this.selectedAnnotationForContextMenu = null;
    }

    convertAnnotationToNode(annotation, nodeType) {
        // Get position from annotation
        let x, y;
        if (annotation.type === 'text') {
            x = annotation.x;
            y = annotation.y;
        } else if (annotation.type === 'arrow') {
            // Use midpoint of arrow
            x = (annotation.startX + annotation.endX) / 2;
            y = (annotation.startY + annotation.endY) / 2;
        }

        // Create the node
        const node = new Node(nodeType, x, y);

        // Transfer text content if available
        if (annotation.type === 'text' && annotation.text) {
            node.properties.text = annotation.text;
        }

        // Add to canvas
        this.canvasRenderer.nodes.push(node);

        // Remove the annotation
        this.annotationManager.removeAnnotation(annotation);

        // Re-render and update count
        this.canvasRenderer.render();
        this.updateNodeCount();

        // Save to journal
        if (typeof saveCurrentJournalCanvas === 'function') {
            saveCurrentJournalCanvas();
        }

        this.workflowManager.showNotification(`Converted to ${nodeType} node`, 'success');
    }

    handleContextMenuAction(action) {
        switch (action) {
            case 'add-node':
                // Show node search or add a default node
                this.addNodeAtCenter('EmptyLatentImage');
                break;
            case 'copy':
                this.copySelected();
                break;
            case 'paste':
                this.paste();
                break;
            case 'delete':
                this.canvasRenderer.deleteSelected();
                this.updateNodeCount();
                break;
        }
    }

    copySelected() {
        if (this.canvasRenderer.selectedNodes.length === 0) return;

        const selected = this.canvasRenderer.selectedNodes;

        // Compute center of copied selection in canvas space
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selected.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x);
            maxY = Math.max(maxY, node.y);
        });
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        this.clipboard = {
            nodes: selected.map(n => n.toJSON()),
            connections: this.connectionManager.connections
                .filter(c => selected.includes(c.outputNode) && selected.includes(c.inputNode))
                .map(c => c.toJSON()),
            center: { x: centerX, y: centerY }
        };

        this.workflowManager.showNotification(`Copied ${this.clipboard.nodes.length} node(s)`, 'info');
    }

    paste() {
        if (!this.clipboard || this.clipboard.nodes.length === 0) return;

        const nodeIdMap = new Map();

        // Determine target position for paste
        let targetPos = null;
        if (this.lastContextMenuCanvasPos) {
            targetPos = this.lastContextMenuCanvasPos;
        } else if (this.lastPointerCanvasPos) {
            targetPos = this.lastPointerCanvasPos;
        } else {
            // Fallback to canvas center in world space
            const centerX = -this.canvasRenderer.offsetX / this.canvasRenderer.scale + this.canvas.width / 2 / this.canvasRenderer.scale;
            const centerY = -this.canvasRenderer.offsetY / this.canvasRenderer.scale + this.canvas.height / 2 / this.canvasRenderer.scale;
            targetPos = { x: centerX, y: centerY };
        }

        const sourceCenter = this.clipboard.center || { x: targetPos.x, y: targetPos.y };
        const dx = targetPos.x - sourceCenter.x;
        const dy = targetPos.y - sourceCenter.y;

        // Paste nodes, preserving relative layout but moving them so their center is at targetPos
        this.clipboard.nodes.forEach(nodeData => {
            const newNode = Node.fromJSON(nodeData);
            newNode.id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            newNode.x += dx;
            newNode.y += dy;

            nodeIdMap.set(nodeData.id, newNode);
            this.canvasRenderer.addNode(newNode);
        });

        // After first paste, clear the context menu anchor so Ctrl+V uses pointer/center next time
        this.lastContextMenuCanvasPos = null;

        // Paste connections
        this.clipboard.connections.forEach(connData => {
            const outputNode = nodeIdMap.get(connData.output.nodeId);
            const inputNode = nodeIdMap.get(connData.input.nodeId);

            if (outputNode && inputNode) {
                this.connectionManager.addConnection(
                    outputNode,
                    connData.output.index,
                    inputNode,
                    connData.input.index
                );
            }
        });

        this.updateNodeCount();
        this.canvasRenderer.render();
        this.workflowManager.markDirty();
    }

    duplicateSelected() {
        this.copySelected();
        this.paste();
    }

    // Tab switching
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');

        // Load workflow list when switching to saved tab
        if (tabName === 'saved') {
            this.loadWorkflowList();
        }
    }

    // Save named workflow
    saveNamedWorkflow(name) {
        const workflow = {
            version: '1.0',
            name: name,
            created: new Date().toISOString(),
            nodes: this.canvasRenderer.toJSON(),
            connections: this.connectionManager.toJSON(),
            metadata: {
                nodeCount: this.canvasRenderer.nodes.length,
                connectionCount: this.connectionManager.connections.length
            }
        };

        // Get existing workflows
        let workflows = JSON.parse(localStorage.getItem('comfyui_workflows') || '[]');

        // Add new workflow with unique ID
        const id = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        workflows.push({
            id: id,
            name: name,
            date: new Date().toISOString(),
            data: workflow
        });

        // Save to localStorage
        localStorage.setItem('comfyui_workflows', JSON.stringify(workflows));

        // Reload list
        this.loadWorkflowList();

        // Show notification
        this.workflowManager.showNotification(`Saved workflow: ${name}`, 'success');
    }

    // Load workflow list
    loadWorkflowList() {
        const workflows = JSON.parse(localStorage.getItem('comfyui_workflows') || '[]');
        const container = document.getElementById('workflow-list');

        if (workflows.length === 0) {
            container.innerHTML = '<p style="color: #888; padding: 20px; text-align: center;">No saved workflows yet</p>';
            return;
        }

        // Sort by date (newest first)
        workflows.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = workflows.map(wf => {
            const date = new Date(wf.date);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            const nodeCount = wf.data.metadata?.nodeCount || 0;

            return `
                <div class="workflow-item" data-id="${wf.id}">
                    <span class="workflow-item-name">${wf.name}</span>
                    <span class="workflow-item-meta">${nodeCount} nodes • ${dateStr}</span>
                </div>
            `;
        }).join('');

        // Add event listeners
        container.querySelectorAll('.workflow-item').forEach(item => {
            // Left-click to load workflow
            item.addEventListener('click', () => {
                this.loadSavedWorkflow(item.dataset.id);
            });
            // Right-click for context menu
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showWorkflowContextMenu(e, item.dataset.id);
            });
        });
    }

    // Load saved workflow
    loadSavedWorkflow(id) {
        const workflows = JSON.parse(localStorage.getItem('comfyui_workflows') || '[]');
        const workflow = workflows.find(wf => wf.id === id);

        if (workflow) {
            this.workflowManager.loadWorkflow(workflow.data);
            this.updateNodeCount();
            this.workflowManager.showNotification(`Loaded: ${workflow.name}`, 'success');
        }
    }

    // Delete saved workflow
    deleteSavedWorkflow(id) {
        if (confirm('Delete this workflow?')) {
            let workflows = JSON.parse(localStorage.getItem('comfyui_workflows') || '[]');
            workflows = workflows.filter(wf => wf.id !== id);
            localStorage.setItem('comfyui_workflows', JSON.stringify(workflows));
            this.loadWorkflowList();
            this.workflowManager.showNotification('Workflow deleted', 'info');
        }
    }

    // Rename saved workflow
    renameSavedWorkflow(id) {
        const workflows = JSON.parse(localStorage.getItem('comfyui_workflows') || '[]');
        const workflow = workflows.find(wf => wf.id === id);

        if (workflow) {
            const newName = prompt('Enter new name:', workflow.name);
            if (newName && newName.trim()) {
                workflow.name = newName.trim();
                workflow.data.name = newName.trim();
                localStorage.setItem('comfyui_workflows', JSON.stringify(workflows));
                this.loadWorkflowList();
                this.workflowManager.showNotification('Workflow renamed', 'success');
            }
        }
    }

    // Show workflow context menu
    showWorkflowContextMenu(e, workflowId) {
        const menu = document.getElementById('workflow-context-menu');
        if (!menu) return;

        this.contextMenuWorkflowId = workflowId;
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        menu.classList.remove('hidden');
    }

    // Hide workflow context menu
    hideWorkflowContextMenu() {
        const menu = document.getElementById('workflow-context-menu');
        if (menu) menu.classList.add('hidden');
        this.contextMenuWorkflowId = null;
    }

    // Start workflow simulation
    showSmartWatchSimulator() {
        // If already in simulation mode, exit it
        if (this.simulationMode) {
            this.exitSimulation();
            return;
        }

        // Validate workflow first
        const errors = this.connectionManager.validateWorkflow(this.canvasRenderer.nodes);
        const hasErrors = errors.some(e => e.type === 'error');

        if (hasErrors) {
            this.workflowManager.showNotification('Cannot simulate: Workflow has errors', 'error');
            return;
        }

        if (this.canvasRenderer.nodes.length === 0) {
            this.workflowManager.showNotification('Add nodes to simulate', 'warning');
            return;
        }

        // Get nodes from selected flow only
        let flowNodes = this.canvasRenderer.nodes;

        if (this.canvasRenderer.selectedNodes.length > 0) {
            // Use first selected node to find its connected flow
            const startNode = this.canvasRenderer.selectedNodes[0];
            flowNodes = this.connectionManager.getConnectedComponent(startNode, this.canvasRenderer.nodes);
        }

        // Get execution order for the selected flow
        this.simulationNodes = this.connectionManager.getExecutionOrder(flowNodes);

        if (this.simulationNodes.length === 0) {
            this.workflowManager.showNotification('No connected nodes to simulate. Select a node in the flow first.', 'warning');
            return;
        }

        // Enter simulation mode
        this.simulationMode = true;
        this.currentSimulationStep = 0;
        document.body.classList.add('simulation-mode-active');

        // Expand properties panel if collapsed, and sync body class
        const propertiesPanel = document.getElementById('properties-panel');
        if (propertiesPanel?.classList.contains('collapsed')) {
            propertiesPanel.classList.remove('collapsed');
            document.body.classList.remove('simulation-collapsed');
        }

        // Store original properties content
        const propertiesContent = document.getElementById('properties-content');
        if (propertiesContent && !this.originalPropertiesContent) {
            this.originalPropertiesContent = propertiesContent.innerHTML;
        }

        // Rename Properties header
        const propertiesHeader = document.querySelector('#properties-panel .sidebar-header h2');
        if (propertiesHeader) propertiesHeader.textContent = 'Simulation';

        // Render simulation panel
        this.renderSimulationPanel();

        // Update canvas to show highlights
        this.updateSimulationHighlights();

        // Check if first node needs AI generation
        const firstNode = this.simulationNodes[0];
        const aiDataSources = ['Generated by AI', 'Generated by the agent'];
        if (firstNode && aiDataSources.includes(firstNode.properties?.dataSource) && !firstNode.properties.text) {
            this.generateAIContentForNode(firstNode, 0);
        }

        // Resize canvas for wider panel
        setTimeout(() => this.canvasRenderer.resizeCanvas(), 50);
    }

    // Render the simulation panel UI (mirrors chat tree structure)
    renderSimulationPanel() {
        const propertiesContent = document.getElementById('properties-content');
        if (!propertiesContent) return;

        propertiesContent.innerHTML = `
            <div class="simulation-panel-container">
                <!-- Watch Screen Display -->
                <div class="simulation-watch-screen">
                    <div class="watch-header-controls">
                        <div class="watch-playback">
                            <button class="sim-ctrl-btn" id="simulation-exit-btn" title="Exit simulation">←</button>
                            <button class="sim-ctrl-btn" id="simulation-reset-btn" title="Reset to start">⟲</button>
                            <span class="sim-step-counter">${this.currentSimulationStep + 1}/${this.simulationNodes.length}</span>
                            <button class="sim-ctrl-btn primary ${this.currentSimulationStep >= this.simulationNodes.length - 1 ? 'done' : ''}" id="simulation-next-btn">
                                ${this.currentSimulationStep >= this.simulationNodes.length - 1 ? '✓' : '▶'}
                            </button>
                        </div>
                        <div class="watch-shape-toggle">
                            <button class="shape-btn ${this.watchShape === 'round' ? 'active' : ''}" data-shape="round" title="Round watch">○</button>
                            <button class="shape-btn ${this.watchShape === 'square' ? 'active' : ''}" data-shape="square" title="Square watch">□</button>
                        </div>
                    </div>
                    <div class="watch-illustration ${this.watchShape}">
                        <div class="watch-strap top"></div>
                        <div class="watch-body">
                            <div class="watch-button left"></div>
                            <div class="watch-frame">
                                <div class="watch-display" id="watch-lottie-container"></div>
                                <div class="watch-text-content" id="watch-text-content"></div>
                                <div class="watch-node-title" id="watch-node-title"></div>
                            </div>
                            <div class="watch-button right"></div>
                        </div>
                        <div class="watch-strap bottom"></div>
                    </div>
                </div>
                <div class="simulation-conversation" id="simulation-conversation">
                    ${this.renderSimulationNodes()}
                </div>
            </div>
        `;

        this.attachSimulationListeners();
        this.updateWatchDisplay();
    }

    // Render the node tree items
    renderSimulationNodes() {
        return this.simulationNodes.map((node, index) => {
            let statusClass = 'pending';
            let statusIcon = '○';

            // Check if node is currently generating
            const isGenerating = this.generatingNodeIds?.includes(node.id);

            if (isGenerating) {
                statusClass = 'generating';
                statusIcon = '⟳';
            } else if (index < this.currentSimulationStep) {
                statusClass = 'completed';
                statusIcon = '✓';
            } else if (index === this.currentSimulationStep) {
                statusClass = 'executing';
                statusIcon = '●';
            }

            const nodeTitle = node.title || node.type;
            const nodeInfo = this.getNodeDisplayInfo(node);
            const dataSource = node.properties?.dataSource || '';
            const showAIBadge = dataSource === 'Generated by AI' || dataSource === 'Generated by the agent';

            return `
                <div class="simulation-node ${statusClass}" data-node-id="${node.id}" data-index="${index}">
                    <div class="simulation-node-header">
                        <span class="simulation-node-title">${nodeTitle}${showAIBadge ? ' <span class="ai-badge">AI</span>' : ''}</span>
                        <span class="simulation-node-status">${statusIcon}</span>
                    </div>
                </div>
                ${index < this.simulationNodes.length - 1 ? '<div class="simulation-node-connector">│</div>' : ''}
            `;
        }).join('');
    }

    // Get display info for a node (full text, no truncation)
    getNodeDisplayInfo(node) {
        if (node.properties) {
            if (node.properties.text) {
                return node.properties.text;
            }
            if (node.properties.checkpoint_name) return node.properties.checkpoint_name;
            if (node.properties.prompt) {
                return node.properties.prompt;
            }
        }
        return '';
    }

    // Attach event listeners for simulation panel
    attachSimulationListeners() {
        // Detach any existing listeners first to prevent stacking
        this.detachSimulationListeners();

        // Create new AbortController for this set of listeners
        this.simulationAbortController = new AbortController();
        const signal = this.simulationAbortController.signal;

        document.getElementById('simulation-next-btn')?.addEventListener('click', () => {
            this.nextSimulationStep();
        }, { signal });

        document.getElementById('simulation-reset-btn')?.addEventListener('click', () => {
            this.resetSimulation();
        }, { signal });

        document.getElementById('simulation-exit-btn')?.addEventListener('click', () => {
            this.exitSimulation();
        }, { signal });

        // Click on node to jump to that step
        document.querySelectorAll('.simulation-node').forEach(el => {
            el.addEventListener('click', () => {
                const index = parseInt(el.dataset.index);
                if (!isNaN(index)) {
                    this.jumpToSimulationStep(index);
                }
            }, { signal });
        });

        // Watch shape toggle
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const shape = btn.dataset.shape;
                if (shape && shape !== this.watchShape) {
                    this.setWatchShape(shape);
                }
            }, { signal });
        });
    }

    // Detach simulation event listeners to prevent stacking
    detachSimulationListeners() {
        if (this.simulationAbortController) {
            this.simulationAbortController.abort();
            this.simulationAbortController = null;
        }
    }

    // Set watch shape and persist to localStorage
    setWatchShape(shape) {
        this.watchShape = shape;
        localStorage.setItem('idea-engine-watch-shape', shape);
        this.renderSimulationPanel();
    }

    // Animate "Generating..." dots
    startGeneratingDotsAnimation(element) {
        if (!element) return;
        if (this.generatingDotsIntervalId) {
            clearInterval(this.generatingDotsIntervalId);
        }
        let dots = 0;
        this.generatingDotsIntervalId = setInterval(() => {
            dots = (dots + 1) % 4;
            element.textContent = 'Generating' + '.'.repeat(dots);
        }, 400);
    }

    // Stop generating dots animation
    stopGeneratingDotsAnimation() {
        if (this.generatingDotsIntervalId) {
            clearInterval(this.generatingDotsIntervalId);
            this.generatingDotsIntervalId = null;
        }
    }

    // Cancel any ongoing watch display effects
    cancelWatchDisplayEffects() {
        if (this.typewriterIntervalId) {
            clearInterval(this.typewriterIntervalId);
            this.typewriterIntervalId = null;
        }
        if (this.watchDisplayTimeoutId) {
            clearTimeout(this.watchDisplayTimeoutId);
            this.watchDisplayTimeoutId = null;
        }
        this.stopGeneratingDotsAnimation();
        this.watchDisplayVersion = (this.watchDisplayVersion || 0) + 1;
    }

    // Typewriter effect for displaying text character by character
    typewriterEffect(text, element, speed = 25) {
        return new Promise((resolve) => {
            element.textContent = '';
            let i = 0;
            this.typewriterIntervalId = setInterval(() => {
                if (i < text.length) {
                    element.textContent += text[i];
                    i++;
                } else {
                    clearInterval(this.typewriterIntervalId);
                    this.typewriterIntervalId = null;
                    resolve();
                }
            }, speed);
        });
    }

    // Update the watch display with current node's animation, title, and text
    async updateWatchDisplay() {
        // Cancel any previous effects
        this.cancelWatchDisplayEffects();
        const currentVersion = this.watchDisplayVersion;

        const currentNode = this.simulationNodes[this.currentSimulationStep];
        if (!currentNode) return;

        // Check if this node is generating AI content
        const isGeneratingAI = this.generatingNodeIds?.includes(currentNode.id);
        const aiSources = ['Generated by AI', 'Generated by the agent'];
        const needsAIGeneration = aiSources.includes(currentNode.properties?.dataSource) && !currentNode.properties?.text;
        const isGenerating = isGeneratingAI || needsAIGeneration;

        // Update title - always show it (including for Agent nodes)
        const titleEl = document.getElementById('watch-node-title');
        if (titleEl) {
            titleEl.style.display = '';
            titleEl.textContent = currentNode.title || currentNode.type;
        }

        // Add/remove glow effect on watch frame during generation
        const watchFrame = document.querySelector('.watch-frame');
        if (watchFrame) {
            if (isGenerating) {
                watchFrame.classList.add('generating-glow');
            } else {
                watchFrame.classList.remove('generating-glow');
            }
        }

        // Load Lottie animation or Agent image
        const lottieContainer = document.getElementById('watch-lottie-container');
        const textContainer = document.getElementById('watch-text-content');

        if (lottieContainer) {
            // Clear previous animation
            lottieContainer.innerHTML = '';

            // Check if this is an Agent node - show image and heroType
            if (currentNode.type === 'Agent') {
                const imageValue = currentNode.properties?.image || '';
                const hasValidImage = imageValue.startsWith('data:') || imageValue.startsWith('http://') || imageValue.startsWith('https://');
                const heroType = currentNode.properties?.heroType || 'Hero';

                if (hasValidImage) {
                    lottieContainer.innerHTML = `
                        <div class="watch-agent-display">
                            <img src="${imageValue}" class="watch-agent-image" alt="Agent">
                            <span class="watch-hero-badge ${heroType.toLowerCase()}">${heroType}</span>
                        </div>
                    `;
                } else {
                    lottieContainer.innerHTML = `
                        <div class="watch-agent-display">
                            <div class="watch-fallback-icon">A</div>
                            <span class="watch-hero-badge ${heroType.toLowerCase()}">${heroType}</span>
                        </div>
                    `;
                }
            } else if (typeof lottie !== 'undefined') {
                // Get animation path for this node type
                const animPath = this.canvasRenderer.nodeAnimationPaths[currentNode.type];
                if (animPath) {
                    this.watchLottieAnimation = lottie.loadAnimation({
                        container: lottieContainer,
                        renderer: 'svg',
                        loop: true,
                        autoplay: true,
                        path: animPath
                    });
                } else {
                    lottieContainer.innerHTML = `<div class="watch-fallback-icon">${currentNode.type.charAt(0)}</div>`;
                }
            } else {
                lottieContainer.innerHTML = `<div class="watch-fallback-icon">${currentNode.type.charAt(0)}</div>`;
            }
        }

        // Show text with typewriter effect after 1 second delay
        if (textContainer) {
            // Check if this node type should be hidden from user
            const hiddenNodeTypes = ['Terminal', 'Users input'];
            const shouldHide = hiddenNodeTypes.includes(currentNode.type);

            if (shouldHide) {
                // Show "not visible" message for hidden node types
                textContainer.textContent = 'This node is not visible for the user';
                textContainer.classList.add('visible', 'hidden-node-message');
            } else {
                // Remove hidden message class
                textContainer.classList.remove('hidden-node-message');

                const nodeText = currentNode.properties?.text || '';

                if (isGenerating) {
                    // During generation - hide text, just show glow effect
                    textContainer.textContent = '';
                    textContainer.classList.remove('visible', 'generating-message');
                } else if (nodeText) {
                    // Clear and hide first
                    textContainer.textContent = '';
                    textContainer.classList.remove('visible', 'generating-message');

                    // Wait 1 second for Lottie animation to play
                    await new Promise(r => {
                        this.watchDisplayTimeoutId = setTimeout(r, 1000);
                    });

                    // Check if we're still the current version (not cancelled)
                    if (this.watchDisplayVersion !== currentVersion) return;

                    // Show container and start typewriter
                    textContainer.classList.add('visible');
                    await this.typewriterEffect(nodeText, textContainer, 25);
                } else {
                    // No text - hide container
                    textContainer.classList.remove('visible', 'generating-message');
                    textContainer.textContent = '';
                }
            }
        }
    }

    // Move to next simulation step (async to handle AI generation)
    async nextSimulationStep() {
        // Prevent multiple calls while animating
        if (this.isAnimatingStep) return;

        if (this.currentSimulationStep >= this.simulationNodes.length - 1) {
            // Simulation complete
            this.workflowManager.showNotification('Simulation complete!', 'success');
            return;
        }

        this.isAnimatingStep = true;

        const nextIndex = this.currentSimulationStep + 1;
        const nextNode = this.simulationNodes[nextIndex];
        const currentNode = this.simulationNodes[this.currentSimulationStep];

        // Check if next node needs AI generation
        const aiDataSourceValues = ['Generated by AI', 'Generated by the agent'];
        const needsAIGeneration = nextNode.properties && aiDataSourceValues.includes(nextNode.properties.dataSource);

        // Immediately increment step and show next node
        this.currentSimulationStep++;
        this.renderSimulationPanel();
        this.updateSimulationHighlights();

        // Animate data flow (visual only, doesn't block)
        this.animateDataFlow(currentNode, nextNode, () => {
            this.isAnimatingStep = false;
        });

        // If AI generation needed, generate in background and update watch when done
        if (needsAIGeneration && !nextNode.properties.text) {
            this.generateAIContentForNode(nextNode, nextIndex);
        }
    }

    // Jump to a specific step
    jumpToSimulationStep(stepIndex) {
        if (stepIndex >= 0 && stepIndex < this.simulationNodes.length) {
            this.currentSimulationStep = stepIndex;
            this.renderSimulationPanel();
            this.updateSimulationHighlights();
        }
    }

    // Reset simulation to beginning
    resetSimulation() {
        this.currentSimulationStep = 0;
        this.simulationParticles = [];
        this.renderSimulationPanel();
        this.updateSimulationHighlights();
    }

    // Exit simulation mode
    exitSimulation() {
        // Detach event listeners first
        this.detachSimulationListeners();

        // Cancel any ongoing watch display effects
        this.cancelWatchDisplayEffects();

        // Reset all simulation state
        this.simulationMode = false;
        this.currentSimulationStep = -1;
        this.simulationNodes = [];
        this.simulationParticles = [];
        this.generatingNodeIds = [];
        this.isGenerating = false;
        this.isAnimatingStep = false;
        this.showingPropertiesInSimulation = false;

        // Cancel any running animation
        if (this.simulationAnimationId) {
            cancelAnimationFrame(this.simulationAnimationId);
            this.simulationAnimationId = null;
        }

        // Remove body classes
        document.body.classList.remove('simulation-mode-active');
        document.body.classList.remove('simulation-collapsed');

        // Restore properties panel
        const propertiesContent = document.getElementById('properties-content');
        if (propertiesContent && this.originalPropertiesContent) {
            propertiesContent.innerHTML = this.originalPropertiesContent;
        }

        // Clear original content so it's freshly captured next time
        this.originalPropertiesContent = null;

        // Restore header
        const propertiesHeader = document.querySelector('#properties-panel .sidebar-header h2');
        if (propertiesHeader) propertiesHeader.textContent = 'Properties';

        // Clear canvas highlights
        this.canvasRenderer.executingNodeId = null;
        this.canvasRenderer.completedNodeIds = [];
        this.canvasRenderer.render();

        // Resize canvas back
        setTimeout(() => this.canvasRenderer.resizeCanvas(), 50);
    }

    // Update canvas node highlighting
    updateSimulationHighlights() {
        if (!this.simulationMode) return;

        const completedIds = this.simulationNodes
            .slice(0, this.currentSimulationStep)
            .map(n => n.id);

        const executingId = this.simulationNodes[this.currentSimulationStep]?.id || null;

        this.canvasRenderer.completedNodeIds = completedIds;
        this.canvasRenderer.executingNodeId = executingId;
        this.canvasRenderer.render();

        // Scroll to show executing node
        if (executingId) {
            const executingNode = this.simulationNodes[this.currentSimulationStep];
            if (executingNode) {
                // Pan canvas to center on executing node
                this.canvasRenderer.centerOnNode(executingNode);
            }
        }
    }

    // Animate data flow between two nodes
    animateDataFlow(fromNode, toNode, onComplete) {
        // Find the connection between these nodes
        const connection = this.connectionManager.connections.find(conn =>
            conn.outputNode.id === fromNode.id && conn.inputNode.id === toNode.id
        );

        if (!connection) {
            // No direct connection, just complete
            if (onComplete) onComplete();
            return;
        }

        // Create particle
        const particle = {
            progress: 0,
            fromNode: fromNode,
            toNode: toNode,
            connection: connection,
            speed: 0.08  // Faster animation (~200ms vs ~550ms)
        };

        this.simulationParticles.push(particle);

        // Animate
        const animate = () => {
            particle.progress += particle.speed;

            if (particle.progress >= 1) {
                // Animation complete
                this.simulationParticles = this.simulationParticles.filter(p => p !== particle);
                this.canvasRenderer.render();
                if (onComplete) onComplete();
                return;
            }

            this.canvasRenderer.render();
            this.simulationAnimationId = requestAnimationFrame(animate);
        };

        this.simulationAnimationId = requestAnimationFrame(animate);
    }

    // Generate AI content for a node during simulation
    async generateAIContentForNode(node, nodeIndex) {
        // Show loading state in panel
        this.setNodeGeneratingState(node.id, true);

        // Build context from all previous nodes in chain
        const context = this.buildContextFromPreviousNodes(nodeIndex);

        // Build prompt based on node type
        const systemPrompt = `You are helping create content for a "${node.type}" node in a workflow.
The workflow is building a narrative/presentation flow, like a slideshow where each slide builds on previous context.
Based on the context provided, generate appropriate content for this ${node.type} node.
Keep the response concise (2-4 sentences) and relevant to the node type.
Do not include any prefixes like "Here is..." - just provide the content directly.`;

        const userPrompt = `Context from previous nodes in the workflow:

${context}

Now generate content for this "${node.type}" node that logically follows and builds upon the above context.`;

        try {
            console.log('Calling API for node:', node.type);
            console.log('Context:', context);

            // Use the local proxy server at port 3000
            const response = await fetch('http://localhost:3000/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    system: systemPrompt,
                    prompt: userPrompt
                })
            });

            console.log('API response status:', response.status);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('API response data:', data);
            const generatedText = data.content?.[0]?.text || 'No response generated';

            // Update node's text property
            node.properties.text = generatedText;

            // Trigger canvas re-render to show updated content
            this.canvasRenderer.render();

            // Stop generating dots animation
            this.stopGeneratingDotsAnimation();

            // Update watch display to show the generated text
            // Only if this node is still the current step
            if (this.simulationNodes[this.currentSimulationStep]?.id === node.id) {
                this.updateWatchDisplay();
            }

        } catch (error) {
            console.error('AI generation failed:', error);
            this.workflowManager.showNotification('AI generation failed: ' + error.message, 'error');
        } finally {
            this.setNodeGeneratingState(node.id, false);
        }
    }

    // Build context from all previous nodes in the simulation chain
    buildContextFromPreviousNodes(currentIndex) {
        const contextParts = [];

        for (let i = 0; i < currentIndex; i++) {
            const node = this.simulationNodes[i];
            const nodeText = node.properties?.text || '';
            const dataSource = node.properties?.dataSource || 'Not defined';

            if (nodeText.trim()) {
                contextParts.push(`[${node.type}] (${dataSource}):
${nodeText}`);
            }
        }

        if (contextParts.length === 0) {
            return 'No previous context available.';
        }

        return contextParts.join('\n\n---\n\n');
    }

    // Set generating state for a node
    setNodeGeneratingState(nodeId, isGenerating) {
        if (isGenerating) {
            if (!this.generatingNodeIds.includes(nodeId)) {
                this.generatingNodeIds.push(nodeId);
            }
        } else {
            this.generatingNodeIds = this.generatingNodeIds.filter(id => id !== nodeId);
        }
        this.renderSimulationPanel();
    }

    // Show generation status message
    showGenerationStatus(message, type = 'info') {
        const statusEl = document.getElementById('generation-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.color = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#888';
        }
    }

    // Generate workflow using Claude AI
    async generateWorkflowWithAI(userPrompt) {
        this.showGenerationStatus('Generating workflow...', 'info');

        const generateBtn = document.getElementById('generate-workflow-btn');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = '⏳ Generating...';
        }

        try {
            const systemPrompt = `You are a workflow designer AI. The user will describe a scenario or goal, and you must create a node-based workflow using the available node types.

Available node types:
- Mind Inventory: Thought, Emotion, Imagination, Belief, Action
- Perception Graph: Dreams, Goals, Rules, Memories, Questions, Expressions, Instructions, Problem, Danger
- Hero Journey: Hero, Mentor, Villain
- Social: Friends, Family, Coworkers, Lovers
- Utility: Picture, Text, Video, Terminal

Your task:
1. Analyze the user's prompt
2. Select 5-10 relevant nodes that would create a meaningful workflow
3. Create logical connections between nodes in a left-to-right flow (earlier nodes connect to later nodes)
4. If the user asks to add text or type specific content in nodes, include that text in the "text" field
5. Return ONLY valid JSON in this exact format:

{
  "nodes": [
    {"type": "NodeType", "description": "brief purpose", "text": "optional text content if requested"},
    ...
  ],
  "connections": [
    {"from": 0, "to": 1},
    ...
  ]
}

Rules:
- Node indices in connections start at 0
- Create a LEFT-TO-RIGHT flow (connections should go from lower index to higher index when possible)
- Each node should have 1-3 connections
- Ensure all nodes are interconnected (no isolated nodes)
- Use appropriate node types for the scenario
- Include "text" field only if the user explicitly asks for text content in nodes
- If user asks for specific text, populate the "text" field with relevant content for each node

Return ONLY the JSON, no other text.`;

            // Call proxy server instead of Claude API directly (avoids CORS)
            const response = await fetch('http://localhost:3000/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: userPrompt,
                    system: systemPrompt
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const assistantMessage = data.content[0].text;

            // Parse the JSON response
            let workflowData;
            try {
                // Extract JSON from response (in case there's extra text)
                const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    workflowData = JSON.parse(jsonMatch[0]);
                } else {
                    workflowData = JSON.parse(assistantMessage);
                }
            } catch (e) {
                console.error('Failed to parse AI response:', assistantMessage);
                throw new Error('Invalid AI response format');
            }

            // Create the workflow
            this.createGeneratedWorkflow(workflowData);
            this.showGenerationStatus('✨ Workflow generated!', 'success');

        } catch (error) {
            console.error('AI Generation Error:', error);
            this.showGenerationStatus(`Error: ${error.message}`, 'error');
        } finally {
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.textContent = '✨ Generate Workflow';
            }
        }
    }

    // Create workflow from AI-generated data
    createGeneratedWorkflow(workflowData) {
        const { nodes, connections } = workflowData;

        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
            throw new Error('Invalid workflow data');
        }

        // Find the currently selected Terminal node
        const terminalNode = this.canvasRenderer.selectedNodes.length > 0 &&
                            this.canvasRenderer.selectedNodes[0].type === 'Terminal'
                            ? this.canvasRenderer.selectedNodes[0]
                            : null;

        // Calculate hierarchical layout positions (left to right)
        const startX = terminalNode ? terminalNode.x + 250 : 100;
        const startY = terminalNode ? terminalNode.y : 100;
        const horizontalSpacing = 300;
        const verticalSpacing = 150;

        // Build adjacency list to determine node levels
        const adjacencyList = new Map();
        const inDegree = new Map();

        nodes.forEach((_, index) => {
            adjacencyList.set(index, []);
            inDegree.set(index, 0);
        });

        if (connections && Array.isArray(connections)) {
            connections.forEach(conn => {
                adjacencyList.get(conn.from).push(conn.to);
                inDegree.set(conn.to, inDegree.get(conn.to) + 1);
            });
        }

        // Assign levels using topological sort
        const levels = new Map();
        const queue = [];

        // Start with nodes that have no incoming connections
        inDegree.forEach((degree, index) => {
            if (degree === 0) {
                queue.push(index);
                levels.set(index, 0);
            }
        });

        while (queue.length > 0) {
            const current = queue.shift();
            const currentLevel = levels.get(current);

            adjacencyList.get(current).forEach(neighbor => {
                const newDegree = inDegree.get(neighbor) - 1;
                inDegree.set(neighbor, newDegree);

                const neighborLevel = levels.get(neighbor) || 0;
                levels.set(neighbor, Math.max(neighborLevel, currentLevel + 1));

                if (newDegree === 0) {
                    queue.push(neighbor);
                }
            });
        }

        // Group nodes by level
        const nodesByLevel = new Map();
        levels.forEach((level, index) => {
            if (!nodesByLevel.has(level)) {
                nodesByLevel.set(level, []);
            }
            nodesByLevel.get(level).push(index);
        });

        // Create nodes with hierarchical positioning
        const createdNodes = [];
        nodes.forEach((nodeData, index) => {
            const level = levels.get(index) || 0;
            const nodesInLevel = nodesByLevel.get(level);
            const indexInLevel = nodesInLevel.indexOf(index);

            const x = startX + (level * horizontalSpacing);
            const y = startY + (indexInLevel * verticalSpacing) -
                     ((nodesInLevel.length - 1) * verticalSpacing / 2);

            const node = this.addNode(nodeData.type, x, y);
            if (node) {
                // Apply text property if provided
                if (nodeData.text && node.properties && 'text' in node.properties) {
                    node.properties.text = nodeData.text;
                }
                createdNodes.push(node);
            }
        });

        // Connect Terminal node to the first node if Terminal exists
        if (terminalNode && createdNodes.length > 0) {
            const firstNodes = nodesByLevel.get(0) || [0];
            const firstNode = createdNodes[firstNodes[0]];

            if (firstNode && terminalNode.outputs.length > 0 && firstNode.inputs.length > 0) {
                this.connectionManager.addConnection(terminalNode, 0, firstNode, 0);
            }
        }

        // Create connections between generated nodes
        if (connections && Array.isArray(connections)) {
            connections.forEach(conn => {
                const fromNode = createdNodes[conn.from];
                const toNode = createdNodes[conn.to];

                if (fromNode && toNode &&
                    fromNode.outputs.length > 0 &&
                    toNode.inputs.length > 0) {
                    this.connectionManager.addConnection(
                        fromNode, 0,
                        toNode, 0
                    );
                }
            });
        }

        this.canvasRenderer.render();
        this.workflowManager.markDirty();
        this.updateNodeCount();
    }

    // Generate content for Hero Journey node using AI
    async generateNodeContentWithAI(node) {
        const generateBtn = document.getElementById(`generate-ai-btn-${node.id}`);
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = `⏳ Generating...`;
        }

        try {
            // Get context from the node
            const nodeType = node.title;
            const dataSource = node.properties.dataSource || 'Not defined';
            const existingPrompt = node.properties.text || '';

            const systemPrompt = `You are helping to generate content for a ${nodeType} character in a Hero's Journey narrative framework.

The user is working with a node-based workflow system where:
- Hero Journey nodes (Hero, Mentor, Villain) represent key characters in a narrative
- Each character has a "Prompt" field that describes their personality, goals, and characteristics
- Data source setting: ${dataSource}

Your task:
Generate a detailed character prompt/description for this ${nodeType} that includes:
1. Personality traits and characteristics
2. Goals and motivations
3. Background or backstory
4. How they interact with others
5. Their role in the narrative

Keep it concise but meaningful (2-4 sentences). Make it engaging and suitable for creative storytelling.

${existingPrompt ? `Current prompt: "${existingPrompt}"\nImprove or expand on this.` : 'Create a new prompt from scratch.'}

Return ONLY the prompt text, no other formatting or explanation.`;

            const userPrompt = `Generate a character prompt for ${nodeType}${existingPrompt ? `, building on: "${existingPrompt}"` : ''}`;

            // Call proxy server
            const response = await fetch('http://localhost:3000/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: userPrompt,
                    system: systemPrompt
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const generatedContent = data.content[0].text.trim();

            // Update the node's text property
            node.properties.text = generatedContent;

            // Refresh the properties panel to show the new content
            this.updatePropertiesPanel(node);
            this.canvasRenderer.render();
            this.workflowManager.markDirty();

        } catch (error) {
            console.error('AI Generation Error:', error);
            alert(`Error generating content: ${error.message}`);
        } finally {
            // Button will be recreated when panel refreshes
        }
    }

    // Handle image file upload for Hero Journey node
    handleImageUpload(node) {
        // Create a hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Check file size (limit to 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image file is too large. Please select an image smaller than 5MB.');
                    return;
                }

                // Read the file as a data URL
                const reader = new FileReader();
                reader.onload = (event) => {
                    // Update the node's image property with the data URL
                    node.properties.image = event.target.result;

                    // Refresh the properties panel to show the new image
                    this.updatePropertiesPanel(node);
                    this.canvasRenderer.render();
                    this.workflowManager.markDirty();
                };
                reader.onerror = () => {
                    alert('Error reading image file.');
                };
                reader.readAsDataURL(file);
            }
        });

        // Trigger the file picker
        fileInput.click();
    }

    // Handle text file upload for Agent node prompt
    handleTextFileUpload(node) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.txt,.md,.text';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 1 * 1024 * 1024) {
                    alert('Text file is too large. Please select a file smaller than 1MB.');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    node.properties.text = event.target.result;
                    this.updatePropertiesPanel(node);
                    this.canvasRenderer.render();
                    this.workflowManager.markDirty();
                };
                reader.onerror = () => {
                    alert('Error reading text file.');
                };
                reader.readAsText(file);
            }
        });

        fileInput.click();
    }

    // Generate image with OpenAI gpt-image-1 model
    async generateImageWithAI(node) {
        const generateBtn = document.getElementById(`generate-image-btn-${node.id}`);
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = `⏳ Generating...`;
        }

        try {
            // Get prompt from node's text property or heroType
            let promptText = node.properties.text || '';
            const heroType = node.properties.heroType || 'Hero';

            if (!promptText.trim()) {
                promptText = `A portrait of a ${heroType} character, professional digital art style, detailed face, dramatic lighting`;
            } else {
                promptText = `Portrait of ${heroType}: ${promptText}. Professional digital art style, detailed face, dramatic lighting`;
            }

            const OPENAI_API_KEY = localStorage.getItem('openai-api-key') || '';

            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-image-1',
                    prompt: promptText,
                    n: 1,
                    size: '1024x1024'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API error: ${response.status}`);
            }

            const data = await response.json();

            // gpt-image-1 returns b64_json directly (not a URL)
            const base64Data = data.data[0].b64_json;
            const base64Image = `data:image/png;base64,${base64Data}`;

            // Update the node's image property with the base64 data URL
            node.properties.image = base64Image;

            // Refresh the properties panel to show the new image in the sphere
            this.updatePropertiesPanel(node);

            // Defer canvas render to allow browser to process the image without blocking
            setTimeout(() => {
                this.canvasRenderer.render();
            }, 100);

            if (this.workflowManager) {
                this.workflowManager.markDirty();
            }

        } catch (error) {
            console.error('Image Generation Error:', error);
            alert(`Error generating image: ${error.message}`);
        }
    }

    // ==================== PROFILE DASHBOARD METHODS ====================

    showProfileDashboard() {
        const propertiesContent = document.getElementById('properties-content');
        if (!this.isProfileViewActive) {
            this.originalPropertiesContent = propertiesContent.innerHTML;
        }
        this.isProfileViewActive = true;
        propertiesContent.innerHTML = this.generateProfileUI();
        this.attachProfileEventListeners();
    }

    hideProfileDashboard() {
        const propertiesContent = document.getElementById('properties-content');
        if (this.originalPropertiesContent) {
            propertiesContent.innerHTML = this.originalPropertiesContent;
        }
        this.isProfileViewActive = false;
    }

    generateProfileUI() {
        const data = this.profileData;
        const truncatedAddress = `${data.address.slice(0, 6)}...${data.address.slice(-4)}`;

        return `
            <div class="profile-dashboard">
                <!-- Profile Header -->
                <div class="profile-header">
                    <div class="profile-avatar-large">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="8" r="4"/>
                            <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
                        </svg>
                    </div>
                    <div class="profile-username">${data.username}</div>
                    <div class="profile-address">
                        <span class="address-text">${truncatedAddress}</span>
                        <button class="copy-btn" id="copy-address" title="Copy address">Copy</button>
                    </div>
                    <a href="#" class="profile-explorer-link">View on Explorer ↗</a>
                    <div class="profile-stats">
                        <div class="stat-item">
                            <span class="stat-value">${data.followers}</span>
                            <span class="stat-label">Followers</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${data.following}</span>
                            <span class="stat-label">Following</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${data.created}</span>
                            <span class="stat-label">Created</span>
                        </div>
                    </div>
                </div>

                <!-- Profile Tabs -->
                <div class="profile-tabs">
                    <button class="profile-tab-btn" data-profile-tab="coins">Coins</button>
                    <button class="profile-tab-btn active" data-profile-tab="balances">Balances</button>
                    <button class="profile-tab-btn" data-profile-tab="feed">Feed</button>
                </div>

                <!-- Tab Content -->
                <div class="profile-tabs-content">
                    <div class="profile-tab-content" id="profile-tab-coins">
                        ${this.generateCoinsView()}
                    </div>
                    <div class="profile-tab-content active" id="profile-tab-balances">
                        ${this.generateBalancesView()}
                    </div>
                    <div class="profile-tab-content" id="profile-tab-feed">
                        ${this.generateFeedView()}
                    </div>
                </div>

                <!-- Close Button -->
                <button class="profile-close-btn" id="close-profile">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Close
                </button>
            </div>
        `;
    }

    generateCoinsView() {
        const tokens = this.profileData.tokens;
        return `
            <div class="profile-coins-view">
                <div class="section-title">All Tokens</div>
                ${tokens.map(token => this.generateTokenCard(token)).join('')}
            </div>
        `;
    }

    generateBalancesView() {
        const tokens = this.profileData.tokens.filter(t => t.type === 'Native Gas Token');
        const holdings = this.profileData.holdings;
        const otherTokens = this.profileData.tokens.filter(t => t.type !== 'Native Gas Token');

        return `
            <div class="profile-balances-view">
                <div class="token-section">
                    <div class="section-title">Native Tokens</div>
                    ${tokens.map(token => this.generateTokenCard(token)).join('')}
                </div>
                ${otherTokens.length > 0 ? `
                    <div class="token-section">
                        <div class="section-title">Other Tokens</div>
                        ${otherTokens.map(token => this.generateTokenCard(token)).join('')}
                    </div>
                ` : ''}
                ${holdings.length > 0 ? `
                    <div class="token-section">
                        <div class="section-title">Token Holdings</div>
                        ${holdings.map(token => `
                            <div class="token-card">
                                <div class="token-icon token-icon-${token.symbol.toLowerCase()}">
                                    <span>${token.symbol.charAt(0)}</span>
                                </div>
                                <div class="token-info">
                                    <div class="token-name">${token.name}</div>
                                    <div class="token-symbol">${token.symbol}</div>
                                </div>
                                <div class="token-balance">
                                    <div class="token-amount">${token.balance.toLocaleString()}</div>
                                    <div class="token-unit">${token.symbol}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    generateFeedView() {
        return `
            <div class="profile-feed-view">
                <div class="feed-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/>
                    </svg>
                    <span>No activity yet</span>
                </div>
            </div>
        `;
    }

    generateTokenCard(token) {
        const iconClass = `token-icon-${token.symbol.toLowerCase()}`;
        return `
            <div class="token-card">
                <div class="token-icon ${iconClass}">
                    <span>${token.symbol.charAt(0)}</span>
                </div>
                <div class="token-info">
                    <div class="token-name">${token.name}</div>
                    <div class="token-type">${token.type}</div>
                </div>
                <div class="token-balance">
                    <div class="token-amount">${token.balance.toLocaleString()}</div>
                    <div class="token-unit">${token.symbol}</div>
                    ${token.usd ? `<div class="token-usd">$${token.usd.toLocaleString()}</div>` : ''}
                </div>
            </div>
        `;
    }

    attachProfileEventListeners() {
        // Tab switching
        document.querySelectorAll('.profile-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.profileTab;
                this.switchProfileTab(tabName);
            });
        });

        // Close button
        const closeBtn = document.getElementById('close-profile');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideProfileDashboard());
        }

        // Copy address
        const copyBtn = document.getElementById('copy-address');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyWalletAddress());
        }
    }

    switchProfileTab(tabName) {
        // Update buttons
        document.querySelectorAll('.profile-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-profile-tab="${tabName}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Update content
        document.querySelectorAll('.profile-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`profile-tab-${tabName}`);
        if (activeContent) activeContent.classList.add('active');
    }

    copyWalletAddress() {
        navigator.clipboard.writeText(this.profileData.address).then(() => {
            const copyBtn = document.getElementById('copy-address');
            if (copyBtn) {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 1500);
            }
        });
    }

    // ========== Profile & Smartwatch Connection ==========

    toggleProfileConnection() {
        this.isProfileConnected = !this.isProfileConnected;
        localStorage.setItem('idea-engine-profile-connected', this.isProfileConnected.toString());
        this.updateConnectionUI();

        // If disconnecting profile, also disconnect smartwatch
        if (!this.isProfileConnected && this.connectedSmartwatch) {
            this.disconnectSmartwatch();
        }
    }

    updateConnectionUI() {
        const connectBtn = document.getElementById('btn-profile-connect');
        const smartwatchBtn = document.getElementById('btn-smartwatch');
        const smartwatchStatus = smartwatchBtn?.querySelector('.smartwatch-status');

        // Update profile connect button
        if (connectBtn) {
            if (this.isProfileConnected) {
                connectBtn.classList.add('connected');
                connectBtn.querySelector('.connect-text').textContent = 'Connected';
            } else {
                connectBtn.classList.remove('connected');
                connectBtn.querySelector('.connect-text').textContent = 'Connect';
            }
        }

        // Update smartwatch button state
        if (smartwatchBtn) {
            smartwatchBtn.disabled = !this.isProfileConnected;
            smartwatchBtn.title = this.isProfileConnected
                ? 'Connect Smartwatch'
                : 'Connect profile first';
        }

        // Update smartwatch status
        if (smartwatchStatus) {
            if (this.connectedSmartwatch) {
                const watch = this.availableSmartwatches.find(w => w.id === this.connectedSmartwatch);
                smartwatchStatus.textContent = watch ? watch.name : 'Connected';
                smartwatchStatus.classList.remove('disconnected');
                smartwatchStatus.classList.add('connected');
            } else {
                smartwatchStatus.textContent = 'Disconnected';
                smartwatchStatus.classList.remove('connected');
                smartwatchStatus.classList.add('disconnected');
            }
        }
    }

    showSmartwatchSelector() {
        const overlay = document.getElementById('smartwatch-selector-overlay');
        const list = document.getElementById('smartwatch-selector-list');

        // Populate smartwatch list
        list.innerHTML = this.availableSmartwatches.map(watch => `
            <div class="smartwatch-selector-item" data-watch-id="${watch.id}">
                <div class="smartwatch-selector-item-icon">${watch.icon}</div>
                <div class="smartwatch-selector-item-info">
                    <div class="smartwatch-selector-item-name">${watch.name}</div>
                    <div class="smartwatch-selector-item-brand">${watch.brand}</div>
                </div>
            </div>
        `).join('');

        // Attach click handlers
        list.querySelectorAll('.smartwatch-selector-item').forEach(item => {
            item.addEventListener('click', () => {
                const watchId = item.dataset.watchId;
                this.connectSmartwatch(watchId);
                this.hideSmartwatchSelector();
            });
        });

        overlay.classList.remove('hidden');
    }

    hideSmartwatchSelector() {
        document.getElementById('smartwatch-selector-overlay').classList.add('hidden');
    }

    connectSmartwatch(watchId) {
        this.connectedSmartwatch = watchId;
        localStorage.setItem('idea-engine-smartwatch', watchId);
        this.updateConnectionUI();
    }

    disconnectSmartwatch() {
        this.connectedSmartwatch = null;
        localStorage.removeItem('idea-engine-smartwatch');
        this.updateConnectionUI();
    }

    // ========== Node Text Editor (Journals Mode) ==========

    openNodeTextEditor(node) {
        this.editingNode = node;

        // Hide canvas container, show text editor
        document.querySelector('.canvas-container').style.display = 'none';
        const editorContainer = document.getElementById('node-text-editor-container');
        editorContainer.style.display = 'flex';

        // Set node info in header
        document.getElementById('text-editor-node-type').textContent = node.type;
        document.getElementById('text-editor-node-type').style.color = node.color;

        // Lottie animations for Mind Inventory and Perception Graph nodes
        const nodeAnimations = {
            // Mind Inventory
            'Thought': 'assets/Tetrahedron.json',
            'Imagination': 'assets/Octahedron.json',
            'Action': 'assets/Dodecahedron.json',
            'Belief': 'assets/Icosahedron.json',
            'Emotion': 'assets/Cube.json',
            // Perception Graph
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

        const lottieContainer = document.getElementById('text-editor-lottie');
        const animationPath = nodeAnimations[node.type];

        if (animationPath && typeof lottie !== 'undefined') {
            lottieContainer.classList.add('active');
            lottieContainer.innerHTML = '';
            this.textEditorLottie = lottie.loadAnimation({
                container: lottieContainer,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: animationPath
            });
        } else {
            lottieContainer.classList.remove('active');
            lottieContainer.innerHTML = '';
        }

        // Load existing text content
        const textarea = document.getElementById('node-text-editor');
        textarea.value = node.properties.text || '';
        textarea.focus();

        // Setup auto-save with debounce
        this.setupTextEditorAutoSave(node, textarea);

        // Setup back button
        const backBtn = document.getElementById('back-to-journal-canvas');
        backBtn.onclick = () => this.closeNodeTextEditor();

        // Update save status
        this.updateTextEditorSaveStatus('Saved');
    }

    closeNodeTextEditor() {
        // Save before closing
        if (this.editingNode) {
            const textarea = document.getElementById('node-text-editor');
            this.editingNode.properties.text = textarea.value;
            this.workflowManager.markDirty();

            // Save to journal canvas data
            if (typeof saveCurrentJournalCanvas === 'function') {
                saveCurrentJournalCanvas();
            }
        }

        // Hide text editor, show canvas
        document.getElementById('node-text-editor-container').style.display = 'none';
        document.querySelector('.canvas-container').style.display = 'flex';

        // Clean up Lottie animation
        if (this.textEditorLottie) {
            this.textEditorLottie.destroy();
            this.textEditorLottie = null;
        }
        const lottieContainer = document.getElementById('text-editor-lottie');
        if (lottieContainer) {
            lottieContainer.classList.remove('active');
            lottieContainer.innerHTML = '';
        }

        // Clear editing state
        this.editingNode = null;

        // Clear auto-save timeout
        if (this.textEditorSaveTimeout) {
            clearTimeout(this.textEditorSaveTimeout);
            this.textEditorSaveTimeout = null;
        }

        // Re-render canvas and fit to view so nodes are visible
        this.canvasRenderer.render();
        requestAnimationFrame(() => {
            this.canvasRenderer.resizeCanvas();
            this.canvasRenderer.fitToView();
        });
    }

    setupTextEditorAutoSave(node, textarea) {
        // Clear any existing timeout
        if (this.textEditorSaveTimeout) {
            clearTimeout(this.textEditorSaveTimeout);
        }

        textarea.oninput = () => {
            this.updateTextEditorSaveStatus('Saving...');

            // Debounce save - wait 500ms after last input
            if (this.textEditorSaveTimeout) {
                clearTimeout(this.textEditorSaveTimeout);
            }

            this.textEditorSaveTimeout = setTimeout(() => {
                node.properties.text = textarea.value;
                this.workflowManager.markDirty();

                // Save to journal canvas data
                if (typeof saveCurrentJournalCanvas === 'function') {
                    saveCurrentJournalCanvas();
                }

                this.updateTextEditorSaveStatus('Saved');
            }, 500);
        };
    }

    updateTextEditorSaveStatus(status) {
        const statusEl = document.getElementById('text-editor-save-status');
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.className = 'text-editor-save-status' + (status === 'Saved' ? ' saved' : ' saving');
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ComfyUIApp();
    console.log('ComfyUI Clone initialized');

    // Note: Lottie animation now only loads in Chat mode (gamification feature)
    // No animation in Design Flow, Journals, or Agent modes
});
