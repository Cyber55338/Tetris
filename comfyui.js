// Main Application - ComfyUI Clone

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

        // Whoop Health Dashboard
        this.whoopData = whoopDataManager;
        this.isWhoopViewActive = false;
        this.originalPropertiesContent = null;

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
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('btn-new').addEventListener('click', () => {
            // In chat mode, this is handled by chat.js
            if (typeof isChatMode === 'function' && isChatMode()) return;
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
            console.log('Send button clicked - functionality to be implemented');
            // Placeholder for future functionality
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

        // Profile button
        document.getElementById('btn-profile').addEventListener('click', () => {
            if (this.isWhoopViewActive) {
                this.hideWhoopDashboard();
            } else {
                this.showWhoopDashboard();
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
            // Start connection
            if (clickedPort.type === 'output') {
                this.isConnecting = true;
                this.connectionStartPort = {
                    node: clickedNode,
                    type: 'output',
                    index: clickedPort.index,
                    port: clickedPort.port
                };
                this.canvasRenderer.connectionStart = clickedNode.getOutputPosition(clickedPort.index);
                this.canvasRenderer.isConnecting = true;
            } else if (clickedPort.type === 'input') {
                // Remove existing connection if any
                if (clickedPort.port.connection) {
                    this.connectionManager.removeConnection(clickedPort.port.connection);
                    this.canvasRenderer.render();
                }
            }
            return;
        }

        // Check for node click
        const clickedNode2 = this.canvasRenderer.getNodeAtPosition(canvasPos.x, canvasPos.y);

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
        if (this.isConnecting) {
            // End connection
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const canvasPos = this.canvasRenderer.screenToCanvas(screenX, screenY);

            // Find target - first try specific port, then fall back to node
            let targetNode = null;
            let targetPortIndex = null;

            // First: Try to find exact port (existing precise behavior)
            for (const node of this.canvasRenderer.nodes) {
                const port = node.getPortAtPosition(canvasPos.x, canvasPos.y);
                if (port && port.type === 'input') {
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

                        // Find first available input port
                        if (node.inputs && node.inputs.length > 0) {
                            targetNode = node;
                            targetPortIndex = 0; // First input port
                            break;
                        }
                    }
                }
            }

            // Create connection if we found a valid target
            if (targetNode && targetPortIndex !== null) {
                const targetPort = { index: targetPortIndex, port: targetNode.inputs[targetPortIndex] };
                if (this.connectionManager.canConnect(this.connectionStartPort, targetPort)) {
                    this.connectionManager.addConnection(
                        this.connectionStartPort.node,
                        this.connectionStartPort.index,
                        targetNode,
                        targetPortIndex
                    );
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
            // Only delete nodes if NOT typing in an input field
            if (!isTyping && this.canvasRenderer.selectedNodes.length > 0) {
                e.preventDefault();
                this.canvasRenderer.deleteSelected();
                this.updateNodeCount();
                this.updatePropertiesPanel(null);
                this.workflowManager.markDirty();
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

            nodes.forEach(nodeInfo => {
                const nodeItem = document.createElement('div');
                nodeItem.className = 'node-item';
                nodeItem.textContent = nodeInfo.title;
                nodeItem.dataset.nodeType = nodeInfo.type;
                nodeItem.dataset.nodeTitle = nodeInfo.title;

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
        const items = document.querySelectorAll('.node-item');
        const lowerQuery = query.toLowerCase();

        items.forEach(item => {
            const title = item.dataset.nodeTitle.toLowerCase();
            const type = item.dataset.nodeType.toLowerCase();

            if (title.includes(lowerQuery) || type.includes(lowerQuery)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
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

        // Check if this is a Hero Journey node
        const isHeroJourneyNode = ['Hero', 'Mentor', 'Villain'].includes(node.type);

        // Profile Picture Section
        if (isHeroJourneyNode || (node.properties.image && node.properties.image !== '')) {
            const hasImage = node.properties.image && node.properties.image !== '';
            html += `
                <div class="property-group" style="text-align: center; margin-bottom: 16px;">
                    ${hasImage ? `
                        <img src="${node.properties.image}"
                             style="width: 150px; height: 150px; border-radius: 75px; object-fit: cover; border: 3px solid ${node.color};"
                             onerror="this.style.display='none'"
                             alt="Profile">
                    ` : (isHeroJourneyNode ? `
                        <div style="width: 150px; height: 150px; border-radius: 75px; border: 3px solid ${node.color};
                                    margin: 0 auto; display: flex; align-items: center; justify-content: center;
                                    background: #1a1a1a;">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="${node.color}" stroke-width="1.5">
                                <circle cx="12" cy="12" r="10"/>
                                <circle cx="12" cy="10" r="3"/>
                                <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855"/>
                            </svg>
                        </div>
                    ` : '')}
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
                } else if (key === 'text' && isHeroJourneyNode) {
                    formattedLabel = 'Prompt';
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
                    // Use larger textarea for Hero Journey nodes' prompt field
                    const rows = (key === 'text' && isHeroJourneyNode) ? '8' : '3';
                    html += `<textarea class="property-input" data-property="${key}" rows="${rows}">${value}</textarea>`;
                } else {
                    html += `<input type="text" class="property-input" data-property="${key}" value="${value}">`;
                }

                // Add buttons below image input for Hero Journey nodes
                if (key === 'image' && isHeroJourneyNode) {
                    html += `
                        <div style="display: flex; gap: 8px; margin-top: 8px;">
                            <button class="btn btn-primary" id="generate-ai-btn-${node.id}"
                                    style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                    <path d="M2 17l10 5 10-5"/>
                                    <path d="M2 12l10 5 10-5"/>
                                </svg>
                                Generate with AI
                            </button>
                            <button class="btn btn-secondary" id="add-file-btn-${node.id}"
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

        // Add event listeners for Hero Journey node buttons
        const generateAIBtn = document.getElementById(`generate-ai-btn-${node.id}`);
        if (generateAIBtn) {
            generateAIBtn.addEventListener('click', () => {
                this.generateNodeContentWithAI(node);
            });
        }

        const addFileBtn = document.getElementById(`add-file-btn-${node.id}`);
        if (addFileBtn) {
            addFileBtn.addEventListener('click', () => {
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

    // Show smartwatch simulator in properties panel
    showSmartWatchSimulator() {
        const propertiesContent = document.getElementById('properties-content');
        if (!propertiesContent) return;

        // Store original content if not already stored
        if (!this.originalPropertiesContent) {
            this.originalPropertiesContent = propertiesContent.innerHTML;
        }

        // Replace properties panel with smartwatch simulator
        propertiesContent.innerHTML = `
            <div class="smartwatch-simulator">
                <div class="smartwatch-screen">
                    <div class="smartwatch-content">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <p>Smartwatch Display</p>
                        <p style="font-size: 12px; margin-top: 8px; opacity: 0.7;">Ready to connect</p>
                    </div>
                </div>
                <button class="connect-btn" id="smartwatch-connect-btn">Connect</button>
            </div>
        `;

        // Add event listener to connect button
        const connectBtn = document.getElementById('smartwatch-connect-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                connectBtn.textContent = 'Connected ✓';
                connectBtn.style.background = '#10b981';
                connectBtn.disabled = true;

                // Update smartwatch screen content
                const smartwatchContent = document.querySelector('.smartwatch-content');
                if (smartwatchContent) {
                    smartwatchContent.innerHTML = `
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.5">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        <p style="color: #10b981;">Connected</p>
                        <p style="font-size: 12px; margin-top: 8px; opacity: 0.7;">Smartwatch is ready</p>
                    `;
                }
            });
        }
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

    // ==================== WHOOP HEALTH DASHBOARD METHODS ====================

    // Show Whoop dashboard in properties panel
    showWhoopDashboard() {
        const propertiesContent = document.getElementById('properties-content');

        // Store original content if not already stored
        if (!this.isWhoopViewActive) {
            this.originalPropertiesContent = propertiesContent.innerHTML;
        }

        this.isWhoopViewActive = true;

        // Generate Whoop UI
        propertiesContent.innerHTML = this.generateWhoopUI();

        // Attach event listeners
        this.attachWhoopEventListeners();
    }

    // Hide Whoop dashboard and restore properties panel
    hideWhoopDashboard() {
        const propertiesContent = document.getElementById('properties-content');
        if (this.originalPropertiesContent) {
            propertiesContent.innerHTML = this.originalPropertiesContent;
        }
        this.isWhoopViewActive = false;
    }

    // Generate complete Whoop UI HTML
    generateWhoopUI() {
        return `
            <div class="whoop-container">
                <!-- Custom Header Bar (redesign) -->
                <div class="whoop-custom-header">
                    <!-- Left: Profile + Flame -->
                    <div class="header-left">
                        <div class="profile-icon-small" id="header-profile">
                            <img src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80" alt="Profile">
                        </div>
                        <div class="flame-badge">
                            <svg class="flame-icon" viewBox="0 0 24 24">
                                <path fill="url(#flameGradient)" d="M13.5 3C13.5 3 17 6 17 10C17 13.5 14.5 16 12 16C12 16 14.5 13.5 14.5 11C14.5 11 11.5 12.5 11.5 15C11.5 17 12.5 17.5 13 17.5C12 20 9 21 7.5 21C5.5 21 4 19 4 16C4 11 8 7.5 13.5 3Z" />
                                <path fill="url(#flameGradientInner)" d="M12 23a7.5 7.5 0 0 1-5.138-12.963C8.202 8.726 12 3 12 3s3.798 5.726 5.138 7.037A7.5 7.5 0 0 1 12 23z"/>
                                <defs>
                                    <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                                        <stop offset="0%" style="stop-color:#FF4D4D;stop-opacity:1" />
                                        <stop offset="100%" style="stop-color:#FF9E4D;stop-opacity:1" />
                                    </linearGradient>
                                    <linearGradient id="flameGradientInner" x1="0%" y1="100%" x2="0%" y2="0%">
                                        <stop offset="0%" style="stop-color:#FF2D2D;stop-opacity:1" />
                                        <stop offset="100%" style="stop-color:#FF8E2D;stop-opacity:1" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <span class="flame-count">128</span>
                        </div>
                    </div>

                    <!-- Center: Navigation -->
                    <div class="header-center">
                        <div class="nav-pill-container">
                            <button class="nav-arrow" id="header-prev">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <button class="today-pill-btn" id="toggle-calendar">TODAY</button>
                            <button class="nav-arrow" id="header-next">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    </div>

                    <!-- Right: Battery + Watch -->
                    <div class="header-right">
                        <span class="percent-text">89%</span>
                        <div class="watch-status-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="6" y="4" width="12" height="16" rx="4" ry="4"></rect>
                                <line x1="6" y1="12" x2="18" y2="12"></line>
                                <circle cx="18" cy="6" r="2" fill="#00d26a" stroke="none"></circle>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Navigation tabs (Calendar and Profile removed) -->
                <div class="whoop-nav">
                    <button class="whoop-nav-btn active" data-view="today">Today</button>
                    <button class="whoop-nav-btn" data-view="sleep">Analytics</button>
                    <button class="whoop-nav-btn" data-view="strain">Multiplayer</button>
                </div>

                <!-- View container -->
                <div class="whoop-view-container" id="whoop-view">
                    ${this.generateTodayView()}
                </div>

                <!-- Calendar Popup Overlay (hidden by default) -->
                <div class="calendar-popup-overlay hidden" id="calendar-overlay">
                    ${this.generateCalendarPopup()}
                </div>

                <!-- Profile Popup Overlay (hidden by default) -->
                <div class="profile-popup-overlay hidden" id="profile-overlay">
                    ${this.generateProfilePopup()}
                </div>

                <!-- Close button -->
                <button class="whoop-close-btn" id="close-whoop">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Close
                </button>
            </div>
        `;
    }

    // Generate Today View (Dashboard)
    generateTodayView() {
        const data = this.whoopData.todayMetrics;
        const recoveryColor = this.getRecoveryColor(data.recovery);
        const strainGradient = this.getStrainGradient(data.strain);

        return `
            <div class="whoop-today-view">
                <!-- Recovery Circle -->
                <div class="recovery-circle">
                    <svg width="180" height="180">
                        <circle cx="90" cy="90" r="75" fill="none" stroke="#2a2a2a" stroke-width="12"/>
                        <circle cx="90" cy="90" r="75" fill="none" stroke="${recoveryColor}"
                                stroke-width="12" stroke-dasharray="471"
                                stroke-dashoffset="${471 - (471 * data.recovery / 100)}"
                                stroke-linecap="round"/>
                    </svg>
                    <div class="recovery-score-text">
                        <div class="recovery-score-value" style="color: ${recoveryColor};">${data.recovery}%</div>
                        <div class="recovery-score-label">Creativity</div>
                    </div>
                </div>

                <!-- Today's Stats -->
                <div class="whoop-metric-card">
                    <div class="whoop-metric-header">
                        <span class="whoop-metric-title">Strain</span>
                    </div>
                    <div class="whoop-metric-value">
                        ${data.strain.toFixed(1)}
                        <span class="whoop-metric-unit">/ 21</span>
                    </div>
                    <div class="whoop-progress-bar">
                        <div class="whoop-progress-fill" style="width: ${(data.strain / 21) * 100}%; background: ${strainGradient};"></div>
                    </div>
                </div>

                <!-- Sleep Card -->
                <div class="whoop-metric-card">
                    <div class="whoop-metric-header">
                        <span class="whoop-metric-title">Sleep</span>
                    </div>
                    <div class="whoop-metric-value">
                        ${data.sleep.duration}
                        <span class="whoop-metric-unit">hrs</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 12px;">
                        <div>
                            <div style="font-size: 11px; color: #888;">Quality</div>
                            <div style="font-size: 18px; font-weight: 600;">${data.sleep.quality}%</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: #888;">helped people</div>
                            <div style="font-size: 18px; font-weight: 600; color: #00d26a;">
                                88
                            </div>
                        </div>
                    </div>
                </div>

                <!-- HRV & RHR -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div class="whoop-metric-card">
                        <div class="whoop-metric-title">HRV</div>
                        <div class="whoop-metric-value" style="font-size: 28px;">${data.hrv}</div>
                        <div style="font-size: 10px; color: #888; margin-top: 4px;">ms</div>
                    </div>
                    <div class="whoop-metric-card">
                        <div class="whoop-metric-title">RHR</div>
                        <div class="whoop-metric-value" style="font-size: 28px;">${data.rhr}</div>
                        <div style="font-size: 10px; color: #888; margin-top: 4px;">bpm</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate Calendar Popup (without header bar - used as overlay)
    generateCalendarPopup() {
        const monthData = this.whoopData.monthlyData;
        const today = new Date();
        const currentDay = today.getDate();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
        const monthName = today.toLocaleString('default', { month: 'long' }).toUpperCase();

        // Calculate days with activity for highlighting
        const highlightDays = [14, 15, 16, 20, 21]; // Example highlight days

        return `
            <div class="calendar-popup">
                <!-- Month Header -->
                <div class="calendar-popup-header">
                    <button class="month-nav-btn" id="prev-month-popup">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    </button>
                    <h3 class="calendar-month-title">${monthName}</h3>
                    <button class="month-nav-btn" id="next-month-popup">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </button>
                </div>

                <!-- Day Headers -->
                <div class="calendar-popup-grid">
                    ${['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day =>
                        `<div class="calendar-day-header">${day}</div>`
                    ).join('')}

                    <!-- Empty cells before first day (adjusting for Monday start) -->
                    ${Array((firstDay === 0 ? 6 : firstDay - 1)).fill('').map(() =>
                        '<div class="calendar-day-cell empty"></div>'
                    ).join('')}

                    <!-- Calendar days -->
                    ${Array.from({length: daysInMonth}, (_, i) => i + 1).map(day => {
                        const dayData = monthData[day - 1];
                        const isToday = day === currentDay;
                        const isHighlighted = highlightDays.includes(day);
                        const recoveryColor = dayData ? this.getRecoveryColor(dayData.recovery) : '#2a2a2a';

                        return `
                            <div class="calendar-day-cell ${isToday ? 'today' : ''} ${isHighlighted ? 'highlighted' : ''}"
                                 data-date="${day}"
                                 style="border-color: ${isHighlighted ? recoveryColor : 'transparent'};">
                                <div class="calendar-day-num">${day}</div>
                                ${isHighlighted ? `<div class="day-indicator" style="background: ${recoveryColor};"></div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Recovery Indicators -->
                <div class="calendar-indicators">
                    <span class="indicator-badge green">+83%</span>
                    <span class="indicator-badge yellow">+61%</span>
                    <span class="indicator-badge red">60%</span>
                </div>
            </div>
        `;
    }

    // Generate Profile Popup (for overlay)
    generateProfilePopup() {
        const user = this.whoopData.userData;

        return `
            <div class="profile-popup">
                <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; text-align: center;">Profile</h3>

                <!-- Profile Picture -->
                <div style="text-align: center; margin-bottom: 24px;">
                    <div class="whoop-profile-picture">
                        ${user.profilePicture ?
                            `<img src="${user.profilePicture}" alt="Profile">` :
                            `<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#00d26a" stroke-width="1.5">
                                <circle cx="12" cy="12" r="10"/>
                                <circle cx="12" cy="10" r="3"/>
                                <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855"/>
                            </svg>`
                        }
                    </div>
                    <div class="whoop-profile-name">${user.name}</div>
                </div>

                <!-- Stats -->
                <div class="whoop-metric-card">
                    <div class="whoop-metric-title">Personal Info</div>
                    <div style="margin-top: 12px;">
                        <div class="whoop-info-row">
                            <span class="whoop-info-label">Age</span>
                            <span class="whoop-info-value">${user.age} years</span>
                        </div>
                        <div class="whoop-info-row">
                            <span class="whoop-info-label">Weight</span>
                            <span class="whoop-info-value">${user.weight} lbs</span>
                        </div>
                        <div class="whoop-info-row">
                            <span class="whoop-info-label">Height</span>
                            <span class="whoop-info-value">${Math.floor(user.height / 12)}' ${user.height % 12}"</span>
                        </div>
                    </div>
                </div>

                <!-- Goals -->
                <div class="whoop-metric-card">
                    <div class="whoop-metric-title">Goals</div>
                    <div style="margin-top: 12px;">
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <span style="font-size: 12px; color: #888;">Sleep Goal</span>
                                <span style="font-size: 12px; font-weight: 600;">8.0 hrs</span>
                            </div>
                            <div class="whoop-progress-bar">
                                <div class="whoop-progress-fill" style="width: 94%; background: #00d26a;"></div>
                            </div>
                        </div>
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <span style="font-size: 12px; color: #888;">Strain Goal</span>
                                <span style="font-size: 12px; font-weight: 600;">15.0</span>
                            </div>
                            <div class="whoop-progress-bar">
                                <div class="whoop-progress-fill" style="width: 97%; background: #ff9500;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Settings Button -->
                <button class="whoop-btn" onclick="alert('Edit profile functionality coming soon!')">
                    Edit Profile
                </button>
            </div>
        `;
    }

    // Generate Sleep View
    generateSleepView() {
        const sleepData = this.whoopData.todayMetrics.sleep;
        const stages = this.whoopData.generateSleepStages();

        return `
            <div class="whoop-sleep-view">
                <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; text-align: center;">AI multiplayer interactions</h3>

                <!-- Sleep Duration -->
                <div class="whoop-metric-card">
                    <div class="whoop-metric-title">Total interactions</div>
                    <div class="whoop-metric-value">33</div>
                </div>

                <!-- Sleep Stages Chart -->
                <div class="whoop-metric-card">
                    <div class="whoop-metric-title">Agents</div>
                    <div class="sleep-stages-chart">
                        ${stages.map(stage => `
                            <div class="sleep-stage-bar"
                                 style="height: ${stage.percentage}%; background: ${stage.color};"
                                 title="${stage.type}: ${stage.duration} min">
                            </div>
                        `).join('')}
                    </div>
                    <div class="sleep-stage-legend">
                        <div class="sleep-stage-legend-item">
                            <div class="sleep-stage-legend-bar" style="background: #8b5cf6;"></div>
                            <div class="sleep-stage-legend-label">Hero</div>
                        </div>
                        <div class="sleep-stage-legend-item">
                            <div class="sleep-stage-legend-bar" style="background: #3b82f6;"></div>
                            <div class="sleep-stage-legend-label">Mentor</div>
                        </div>
                        <div class="sleep-stage-legend-item">
                            <div class="sleep-stage-legend-bar" style="background: #06b6d4;"></div>
                            <div class="sleep-stage-legend-label">Villain</div>
                        </div>
                        <div class="sleep-stage-legend-item">
                            <div class="sleep-stage-legend-bar" style="background: #ef4444;"></div>
                            <div class="sleep-stage-legend-label">researcher</div>
                        </div>
                    </div>
                </div>

                <!-- Sleep Metrics Grid -->
                <div class="whoop-stats-grid">
                    <div class="whoop-metric-card">
                        <div class="whoop-metric-title">sent</div>
                        <div class="whoop-metric-value" style="font-size: 28px;">${sleepData.quality}</div>
                    </div>
                    <div class="whoop-metric-card">
                        <div class="whoop-metric-title">received</div>
                        <div class="whoop-metric-value" style="font-size: 28px; color: #00d26a;">
                            88
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate Strain View
    generateStrainView() {
        const strainData = this.whoopData.todayMetrics.strain;
        const activities = this.whoopData.activities;
        const strainColor = this.getStrainColor(strainData);

        return `
            <div class="whoop-strain-view">
                <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; text-align: center;">Day Strain</h3>

                <!-- Strain Circle -->
                <div class="recovery-circle" style="width: 160px; height: 160px; margin: 20px auto;">
                    <svg width="160" height="160">
                        <circle cx="80" cy="80" r="65" fill="none" stroke="#2a2a2a" stroke-width="12"/>
                        <circle cx="80" cy="80" r="65" fill="none" stroke="${strainColor}"
                                stroke-width="12" stroke-dasharray="408"
                                stroke-dashoffset="${408 - (408 * strainData / 21)}"
                                stroke-linecap="round"/>
                    </svg>
                    <div class="recovery-score-text">
                        <div class="recovery-score-value" style="color: ${strainColor};">${strainData.toFixed(1)}</div>
                        <div class="recovery-score-label">Strain</div>
                    </div>
                </div>

                <!-- Activities Timeline -->
                <div class="whoop-metric-card">
                    <div class="whoop-metric-title">Today's Activities</div>
                    <div style="margin-top: 12px;">
                        ${activities.map(activity => `
                            <div class="whoop-activity-item">
                                <div>
                                    <div class="whoop-activity-name">${activity.name}</div>
                                    <div class="whoop-activity-time">${activity.time}</div>
                                </div>
                                <div class="whoop-activity-strain">
                                    <div class="whoop-activity-strain-value" style="color: ${this.getStrainColor(activity.strain)};">
                                        ${activity.strain.toFixed(1)}
                                    </div>
                                    <div class="whoop-activity-strain-label">strain</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Strain Zones -->
                <div class="whoop-metric-card">
                    <div class="whoop-metric-title">Time in Zones</div>
                    <div style="margin-top: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 12px; color: #888;">Light (0-10)</span>
                            <span style="font-size: 14px; font-weight: 600;">15 min</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 12px; color: #888;">Moderate (10-14)</span>
                            <span style="font-size: 14px; font-weight: 600;">45 min</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 12px; color: #888;">All Out (14-18)</span>
                            <span style="font-size: 14px; font-weight: 600;">35 min</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate Profile View
    generateProfileView() {
        const user = this.whoopData.userData;

        return `
            <div class="whoop-profile-view">
                <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; text-align: center;">Profile</h3>

                <!-- Profile Picture -->
                <div style="text-align: center; margin-bottom: 24px;">
                    <div class="whoop-profile-picture">
                        ${user.profilePicture ?
                            `<img src="${user.profilePicture}" alt="Profile">` :
                            `<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#00d26a" stroke-width="1.5">
                                <circle cx="12" cy="12" r="10"/>
                                <circle cx="12" cy="10" r="3"/>
                                <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855"/>
                            </svg>`
                        }
                    </div>
                    <div class="whoop-profile-name">${user.name}</div>
                </div>

                <!-- Stats -->
                <div class="whoop-metric-card">
                    <div class="whoop-metric-title">Personal Info</div>
                    <div style="margin-top: 12px;">
                        <div class="whoop-info-row">
                            <span class="whoop-info-label">Age</span>
                            <span class="whoop-info-value">${user.age} years</span>
                        </div>
                        <div class="whoop-info-row">
                            <span class="whoop-info-label">Weight</span>
                            <span class="whoop-info-value">${user.weight} lbs</span>
                        </div>
                        <div class="whoop-info-row">
                            <span class="whoop-info-label">Height</span>
                            <span class="whoop-info-value">${Math.floor(user.height / 12)}' ${user.height % 12}"</span>
                        </div>
                    </div>
                </div>

                <!-- Goals -->
                <div class="whoop-metric-card">
                    <div class="whoop-metric-title">Goals</div>
                    <div style="margin-top: 12px;">
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <span style="font-size: 12px; color: #888;">Sleep Goal</span>
                                <span style="font-size: 12px; font-weight: 600;">8.0 hrs</span>
                            </div>
                            <div class="whoop-progress-bar">
                                <div class="whoop-progress-fill" style="width: 94%; background: #00d26a;"></div>
                            </div>
                        </div>
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <span style="font-size: 12px; color: #888;">Strain Goal</span>
                                <span style="font-size: 12px; font-weight: 600;">15.0</span>
                            </div>
                            <div class="whoop-progress-bar">
                                <div class="whoop-progress-fill" style="width: 97%; background: #ff9500;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Settings Button -->
                <button class="whoop-btn" onclick="alert('Edit profile functionality coming soon!')">
                    Edit Profile
                </button>
            </div>
        `;
    }

    // Attach Whoop-specific event listeners
    attachWhoopEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.whoop-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchWhoopView(view);
            });
        });

        // Close button
        const closeBtn = document.getElementById('close-whoop');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideWhoopDashboard();
            });
        }

        // TODAY text click to toggle calendar popup
        const todayText = document.getElementById('toggle-calendar');
        if (todayText) {
            todayText.addEventListener('click', () => {
                this.toggleCalendarPopup();
            });
        }

        // Calendar overlay click (close when clicking outside)
        const calendarOverlay = document.getElementById('calendar-overlay');
        if (calendarOverlay) {
            calendarOverlay.addEventListener('click', (e) => {
                // Close only if clicking on the overlay itself, not the popup
                if (e.target === calendarOverlay) {
                    this.toggleCalendarPopup();
                }
            });
        }

        // Profile icon click to toggle profile popup
        const profileIcon = document.getElementById('header-profile');
        if (profileIcon) {
            profileIcon.addEventListener('click', () => {
                this.toggleProfilePopup();
            });
        }

        // Profile overlay click (close when clicking outside)
        const profileOverlay = document.getElementById('profile-overlay');
        if (profileOverlay) {
            profileOverlay.addEventListener('click', (e) => {
                // Close only if clicking on the overlay itself, not the popup
                if (e.target === profileOverlay) {
                    this.toggleProfilePopup();
                }
            });
        }

        // Calendar day clicks
        document.querySelectorAll('.calendar-day-cell').forEach(day => {
            day.addEventListener('click', (e) => {
                const date = e.currentTarget.dataset.date;
                if (date) {
                    console.log('View details for:', date);
                    // Future: Show detailed day view
                }
            });
        });
    }

    // Switch between Whoop views
    switchWhoopView(viewName) {
        // Update nav buttons
        document.querySelectorAll('.whoop-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Generate new view
        const container = document.getElementById('whoop-view');
        if (!container) return;

        let html = '';
        switch(viewName) {
            case 'today':
                html = this.generateTodayView();
                break;
            case 'sleep':
                html = this.generateSleepView();
                break;
            case 'strain':
                html = this.generateStrainView();
                break;
        }

        container.innerHTML = html;
        this.attachWhoopEventListeners();
    }

    // Toggle calendar popup overlay
    toggleCalendarPopup() {
        const overlay = document.getElementById('calendar-overlay');
        if (overlay) {
            overlay.classList.toggle('hidden');
        }
    }

    // Toggle profile popup overlay
    toggleProfilePopup() {
        const overlay = document.getElementById('profile-overlay');
        if (overlay) {
            overlay.classList.toggle('hidden');
        }
    }

    // Helper: Get recovery color
    getRecoveryColor(recovery) {
        if (recovery >= 67) return '#00d26a';  // Green
        if (recovery >= 34) return '#ffd60a';  // Yellow
        return '#ff3b30';                      // Red
    }

    // Helper: Get strain color
    getStrainColor(strain) {
        if (strain >= 18) return '#ff3b30';    // Very high
        if (strain >= 14) return '#ff9500';    // High
        if (strain >= 10) return '#ffd60a';    // Moderate
        return '#00d26a';                       // Low
    }

    // Helper: Get strain gradient
    getStrainGradient(strain) {
        if (strain >= 18) return 'linear-gradient(90deg, #ff3b30, #ff6b6b)';
        if (strain >= 14) return 'linear-gradient(90deg, #ff9500, #ffb84d)';
        if (strain >= 10) return 'linear-gradient(90deg, #ffd60a, #ffe066)';
        return 'linear-gradient(90deg, #00d26a, #1fdf64)';
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

        // Show Lottie animation for Thought nodes
        const lottieContainer = document.getElementById('text-editor-lottie');
        if (node.type === 'Thought' && typeof lottie !== 'undefined') {
            lottieContainer.classList.add('active');
            // Clear any existing animation
            lottieContainer.innerHTML = '';
            // Load the Octahedron animation
            this.textEditorLottie = lottie.loadAnimation({
                container: lottieContainer,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: 'assets/Octahedron.json'
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
});
