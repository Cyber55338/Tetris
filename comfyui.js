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
        // Delete key
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.canvasRenderer.selectedNodes.length > 0) {
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

        let html = `
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

                html += `<div style="margin-top: 8px;">`;
                html += `<label style="display: block; font-size: 11px; color: #b0b0b0; margin-bottom: 4px;">${key}</label>`;

                if (propDef?.type === 'select') {
                    html += `<select class="property-select" data-property="${key}">`;
                    propDef.options.forEach(opt => {
                        html += `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`;
                    });
                    html += `</select>`;
                } else if (propDef?.type === 'text') {
                    html += `<textarea class="property-input" data-property="${key}" rows="3">${value}</textarea>`;
                } else {
                    html += `<input type="text" class="property-input" data-property="${key}" value="${value}">`;
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
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ComfyUIApp();
    console.log('ComfyUI Clone initialized');
});
