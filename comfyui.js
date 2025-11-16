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
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.isConnecting = false;
        this.connectionStartPort = null;

        // Clipboard
        this.clipboard = null;

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
            this.workflowManager.newWorkflow();
            this.updateNodeCount();
        });

        document.getElementById('btn-save').addEventListener('click', () => {
            this.workflowManager.saveWorkflow();
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

        document.getElementById('btn-zoom-reset').addEventListener('click', () => {
            this.canvasRenderer.resetZoom();
        });

        document.getElementById('btn-fit-view').addEventListener('click', () => {
            this.canvasRenderer.fitToView();
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

        // Sidebar collapse buttons
        document.getElementById('collapse-library').addEventListener('click', () => {
            document.getElementById('node-library').classList.toggle('collapsed');
        });

        document.getElementById('collapse-properties').addEventListener('click', () => {
            document.getElementById('properties-panel').classList.toggle('collapsed');
        });

        // Context menu
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

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
        document.getElementById('save-workflow-btn').addEventListener('click', () => {
            document.getElementById('save-workflow-form').classList.remove('hidden');
        });

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

            // Select node
            if (!e.ctrlKey && !e.metaKey) {
                this.canvasRenderer.selectNode(clickedNode2, false);
            } else {
                this.canvasRenderer.selectNode(clickedNode2, true);
            }

            this.updatePropertiesPanel(clickedNode2);
        } else {
            // Start panning
            if (e.button === 0 || e.button === 1) { // Left or middle button
                this.isPanning = true;
                this.panStartX = e.clientX;
                this.panStartY = e.clientY;
                this.canvas.classList.add('dragging');

                // Deselect all
                this.canvasRenderer.deselectAll();
                this.updatePropertiesPanel(null);
            }
        }
    }

    onCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const canvasPos = this.canvasRenderer.screenToCanvas(screenX, screenY);

        // Update canvas coordinates display
        document.getElementById('canvas-coords').textContent =
            `X: ${Math.round(canvasPos.x)}, Y: ${Math.round(canvasPos.y)}`;

        if (this.isDraggingNode && this.draggedNode) {
            // Drag node
            this.draggedNode.x = canvasPos.x - this.dragOffsetX;
            this.draggedNode.y = canvasPos.y - this.dragOffsetY;
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

            // Find target port
            for (const node of this.canvasRenderer.nodes) {
                const port = node.getPortAtPosition(canvasPos.x, canvasPos.y);
                if (port && port.type === 'input') {
                    // Create connection
                    if (this.connectionManager.canConnect(this.connectionStartPort, port)) {
                        this.connectionManager.addConnection(
                            this.connectionStartPort.node,
                            this.connectionStartPort.index,
                            node,
                            port.index
                        );
                        this.workflowManager.markDirty();
                    } else {
                        this.workflowManager.showNotification('Incompatible port types', 'error');
                    }
                    break;
                }
            }

            this.isConnecting = false;
            this.connectionStartPort = null;
            this.canvasRenderer.connectionStart = null;
            this.canvasRenderer.tempConnectionEnd = null;
            this.canvasRenderer.isConnecting = false;
            this.canvasRenderer.render();
        }

        this.isDraggingNode = false;
        this.draggedNode = null;
        this.isPanning = false;
        this.canvas.classList.remove('dragging');
    }

    onCanvasWheel(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const centerX = e.clientX - rect.left;
        const centerY = e.clientY - rect.top;

        if (e.deltaY < 0) {
            this.canvasRenderer.zoomIn(centerX, centerY);
        } else {
            this.canvasRenderer.zoomOut(centerX, centerY);
        }
    }

    onCanvasContextMenu(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        this.showContextMenu(e.clientX, e.clientY);
    }

    onCanvasDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const canvasPos = this.canvasRenderer.screenToCanvas(screenX, screenY);

        // Check if double-clicked on a connection
        const connection = this.connectionManager.getConnectionAtPosition(canvasPos.x, canvasPos.y, 10);
        if (connection) {
            // Remove connection
            this.connectionManager.removeConnection(connection);
            this.canvasRenderer.render();
            this.workflowManager.markDirty();
        }
    }

    onKeyDown(e) {
        // Check if user is typing in an input field
        const isTyping = document.activeElement &&
                        (document.activeElement.tagName === 'INPUT' ||
                         document.activeElement.tagName === 'TEXTAREA' ||
                         document.activeElement.tagName === 'SELECT');

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
        if (e.key === 'f' || e.key === 'F') {
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
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.remove('hidden');

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

        this.clipboard = {
            nodes: this.canvasRenderer.selectedNodes.map(n => n.toJSON()),
            connections: this.connectionManager.connections
                .filter(c => this.canvasRenderer.selectedNodes.includes(c.outputNode) &&
                           this.canvasRenderer.selectedNodes.includes(c.inputNode))
                .map(c => c.toJSON())
        };

        this.workflowManager.showNotification(`Copied ${this.clipboard.nodes.length} node(s)`, 'info');
    }

    paste() {
        if (!this.clipboard || this.clipboard.nodes.length === 0) return;

        const offset = 50;
        const nodeIdMap = new Map();

        // Paste nodes
        this.clipboard.nodes.forEach(nodeData => {
            const newNode = Node.fromJSON(nodeData);
            newNode.id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            newNode.x += offset;
            newNode.y += offset;

            nodeIdMap.set(nodeData.id, newNode);
            this.canvasRenderer.addNode(newNode);
        });

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
                    <div class="workflow-item-header">
                        <div class="workflow-item-name">${wf.name}</div>
                    </div>
                    <div class="workflow-item-meta">
                        ${nodeCount} nodes • ${dateStr}
                    </div>
                    <div class="workflow-item-actions">
                        <button class="btn btn-primary btn-small load-workflow-btn" data-id="${wf.id}">Load</button>
                        <button class="btn btn-secondary btn-small rename-workflow-btn" data-id="${wf.id}">Rename</button>
                        <button class="btn btn-danger btn-small delete-workflow-btn" data-id="${wf.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners
        container.querySelectorAll('.load-workflow-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.loadSavedWorkflow(id);
            });
        });

        container.querySelectorAll('.delete-workflow-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.deleteSavedWorkflow(id);
            });
        });

        container.querySelectorAll('.rename-workflow-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.renameSavedWorkflow(id);
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
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ComfyUIApp();
    console.log('ComfyUI Clone initialized');
});
