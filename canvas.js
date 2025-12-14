// Canvas Rendering and Manipulation

class CanvasRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nodes = [];
        this.selectedNodes = [];
        this.hoveredNode = null;
        this.hoveredPort = null;

        // Transform state
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;

        // Interaction state
        this.isDragging = false;
        this.isConnecting = false;
        this.isPanning = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.connectionStart = null;
        this.tempConnectionEnd = null;

        // Marquee selection state
        this.marquee = null; // { startX, startY, endX, endY } in screen coords

        // Simulation mode highlighting
        this.executingNodeId = null;
        this.completedNodeIds = [];

        // Node Lottie animations
        this.nodeLottieAnimations = new Map(); // nodeId -> lottie animation instance
        this.lottieOverlay = null;
        this.nodeAnimationPaths = {
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

        this.resizeCanvas();

        // Keep canvas in sync with its container size (including sidebar collapse/expand)
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
            this.resizeObserver.observe(this.canvas.parentElement);
        }

        // Fallback for window-level resizes
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.render();
    }

    // Coordinate transformation
    screenToCanvas(x, y) {
        return {
            x: (x - this.offsetX) / this.scale,
            y: (y - this.offsetY) / this.scale
        };
    }

    canvasToScreen(x, y) {
        return {
            x: x * this.scale + this.offsetX,
            y: y * this.scale + this.offsetY
        };
    }

    // Add node to canvas
    addNode(node) {
        this.nodes.push(node);
        this.render();
    }

    // Remove node from canvas
    removeNode(node) {
        const index = this.nodes.indexOf(node);
        if (index > -1) {
            // Remove all connections to this node
            if (window.connectionManager) {
                window.connectionManager.removeNodeConnections(node);
            }
            this.nodes.splice(index, 1);
            this.render();
        }
    }

    // Clear all nodes
    clearNodes() {
        this.nodes = [];
        this.selectedNodes = [];
        if (window.connectionManager) {
            window.connectionManager.clearConnections();
        }
        this.clearNodeLottieAnimations();
        this.render();
    }

    // Find node at position
    getNodeAtPosition(x, y) {
        // Iterate in reverse to check top nodes first
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            if (this.nodes[i].containsPoint(x, y)) {
                return this.nodes[i];
            }
        }
        return null;
    }

    // Select/deselect nodes
    selectNode(node, multi = false) {
        if (!multi) {
            this.selectedNodes.forEach(n => n.selected = false);
            this.selectedNodes = [];
        }

        if (node && !node.selected) {
            node.selected = true;
            this.selectedNodes.push(node);
        }

        this.render();
    }

    deselectAll() {
        this.selectedNodes.forEach(n => n.selected = false);
        this.selectedNodes = [];
        this.render();
    }

    // Marquee selection methods
    setMarquee(startX, startY, endX, endY) {
        this.marquee = { startX, startY, endX, endY };
    }

    clearMarquee() {
        this.marquee = null;
    }

    getMarqueeBounds() {
        if (!this.marquee) return null;
        const { startX, startY, endX, endY } = this.marquee;
        return {
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: Math.abs(endX - startX),
            height: Math.abs(endY - startY)
        };
    }

    getNodesInRect(screenRect) {
        if (!screenRect) return [];

        // Convert screen rect to canvas coords
        const topLeft = this.screenToCanvas(screenRect.x, screenRect.y);
        const bottomRight = this.screenToCanvas(
            screenRect.x + screenRect.width,
            screenRect.y + screenRect.height
        );

        const canvasRect = {
            x: Math.min(topLeft.x, bottomRight.x),
            y: Math.min(topLeft.y, bottomRight.y),
            width: Math.abs(bottomRight.x - topLeft.x),
            height: Math.abs(bottomRight.y - topLeft.y)
        };

        return this.nodes.filter(node => {
            return node.x < canvasRect.x + canvasRect.width &&
                   node.x + node.width > canvasRect.x &&
                   node.y < canvasRect.y + canvasRect.height &&
                   node.y + node.height > canvasRect.y;
        });
    }

    // Delete selected nodes
    deleteSelected() {
        this.selectedNodes.forEach(node => {
            this.removeNode(node);
        });
        this.selectedNodes = [];
        this.render();
    }

    // Zoom
    setZoom(newScale, centerX = this.canvas.width / 2, centerY = this.canvas.height / 2) {
        const oldScale = this.scale;
        newScale = Math.max(0.1, Math.min(3, newScale));

        // Adjust offset to zoom towards the center point
        this.offsetX = centerX - (centerX - this.offsetX) * (newScale / oldScale);
        this.offsetY = centerY - (centerY - this.offsetY) * (newScale / oldScale);

        this.scale = newScale;
        this.render();

        // Update UI
        if (window.updateZoomDisplay) {
            window.updateZoomDisplay(this.scale);
        }
    }

    zoomIn(centerX, centerY) {
        this.setZoom(this.scale * 1.2, centerX, centerY);
    }

    zoomOut(centerX, centerY) {
        this.setZoom(this.scale / 1.2, centerX, centerY);
    }

    resetZoom() {
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.render();

        if (window.updateZoomDisplay) {
            window.updateZoomDisplay(this.scale);
        }
    }

    // Pan
    pan(dx, dy) {
        this.offsetX += dx;
        this.offsetY += dy;
        this.render();
    }

    // Main render function
    render() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Save state
        ctx.save();

        // Apply transform
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);

        // Draw connections
        if (window.connectionManager) {
            window.connectionManager.render(ctx);
        }

        // Draw temporary connection
        if (this.isConnecting && this.connectionStart && this.tempConnectionEnd) {
            this.drawConnection(ctx, this.connectionStart, this.tempConnectionEnd, '#5a9fd4', true);
        }

        // Draw annotations (annotation-enabled modes) - rendered BEFORE nodes so nodes appear on top
        if (typeof isAnnotationEnabled === 'function' && isAnnotationEnabled() && window.annotationManager) {
            window.annotationManager.render(ctx);
        }

        // Draw nodes
        this.nodes.forEach(node => {
            this.drawNode(ctx, node);
        });

        // Draw simulation particles
        if (typeof app !== 'undefined' && app.simulationParticles && app.simulationParticles.length > 0) {
            this.drawSimulationParticles(ctx, app.simulationParticles);
        }

        // Restore state
        ctx.restore();

        // Draw marquee selection rectangle (in screen coordinates)
        if (this.marquee) {
            const bounds = this.getMarqueeBounds();
            ctx.strokeStyle = '#5a9fd4';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
            ctx.fillStyle = 'rgba(90, 159, 212, 0.1)';
            ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
            ctx.setLineDash([]);
        }

        // Render minimap
        this.renderMinimap();

        // Update node Lottie animations
        this.updateNodeLottieAnimations();
    }

    // Update Lottie animations positioned on nodes
    updateNodeLottieAnimations() {
        if (typeof lottie === 'undefined') return;

        // Get or create the overlay container
        if (!this.lottieOverlay) {
            this.lottieOverlay = document.getElementById('canvas-lottie-overlay');
        }
        if (!this.lottieOverlay) return;

        // Track which nodes currently exist
        const currentNodeIds = new Set(this.nodes.map(n => n.id));

        // Remove animations for nodes that no longer exist
        for (const [nodeId, animData] of this.nodeLottieAnimations) {
            if (!currentNodeIds.has(nodeId)) {
                if (animData.animation) animData.animation.destroy();
                if (animData.container) animData.container.remove();
                this.nodeLottieAnimations.delete(nodeId);
            }
        }

        // Update or create animations for current nodes
        this.nodes.forEach((node, nodeIndex) => {
            const animPath = this.nodeAnimationPaths[node.type];
            if (!animPath) return; // No animation for this node type

            // Calculate screen position
            const screenPos = this.canvasToScreen(node.x, node.y);

            // Position animation inside node header, vertically centered
            const lottieSize = 24 * this.scale;
            const lottieX = screenPos.x + (4 * this.scale);
            const lottieY = screenPos.y + ((28 * this.scale - lottieSize) / 2);

            // Check if this Lottie is occluded by any node drawn on top (higher index)
            const lottieCenterX = lottieX + lottieSize / 2;
            const lottieCenterY = lottieY + lottieSize / 2;
            let isOccluded = false;

            for (let i = nodeIndex + 1; i < this.nodes.length; i++) {
                const otherNode = this.nodes[i];
                const otherScreenPos = this.canvasToScreen(otherNode.x, otherNode.y);
                const otherWidth = 180 * this.scale;
                const otherHeight = 150 * this.scale;

                // Check if Lottie center is inside other node's bounds
                if (lottieCenterX >= otherScreenPos.x &&
                    lottieCenterX <= otherScreenPos.x + otherWidth &&
                    lottieCenterY >= otherScreenPos.y &&
                    lottieCenterY <= otherScreenPos.y + otherHeight) {
                    isOccluded = true;
                    break;
                }
            }

            if (this.nodeLottieAnimations.has(node.id)) {
                // Update existing animation position
                const animData = this.nodeLottieAnimations.get(node.id);
                animData.container.style.left = `${lottieX}px`;
                animData.container.style.top = `${lottieY}px`;
                animData.container.style.width = `${lottieSize}px`;
                animData.container.style.height = `${lottieSize}px`;
                animData.container.style.visibility = isOccluded ? 'hidden' : 'visible';
            } else {
                // Create new animation
                const container = document.createElement('div');
                container.className = 'node-lottie';
                container.style.left = `${lottieX}px`;
                container.style.top = `${lottieY}px`;
                container.style.width = `${lottieSize}px`;
                container.style.height = `${lottieSize}px`;
                container.style.visibility = isOccluded ? 'hidden' : 'visible';
                this.lottieOverlay.appendChild(container);

                const animation = lottie.loadAnimation({
                    container: container,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    path: animPath
                });

                this.nodeLottieAnimations.set(node.id, { container, animation });
            }
        });
    }

    // Clear all node Lottie animations
    clearNodeLottieAnimations() {
        for (const [nodeId, animData] of this.nodeLottieAnimations) {
            if (animData.animation) animData.animation.destroy();
            if (animData.container) animData.container.remove();
        }
        this.nodeLottieAnimations.clear();
    }

    // Draw grid background
    drawGrid(ctx) {
        const gridSize = 20;
        const startX = Math.floor(-this.offsetX / this.scale / gridSize) * gridSize;
        const startY = Math.floor(-this.offsetY / this.scale / gridSize) * gridSize;
        const endX = startX + (this.canvas.width / this.scale) + gridSize;
        const endY = startY + (this.canvas.height / this.scale) + gridSize;

        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 1 / this.scale;

        // Draw vertical lines
        for (let x = startX; x < endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = startY; y < endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }

    // Check if a node is connected downstream from a "Users input" node
    // Terminal nodes stop the glow flow - they don't glow and nodes after them don't glow
    isConnectedFromUsersInput(node) {
        if (!window.connectionManager) return false;

        // Terminal nodes never glow - they stop the flow
        if (node.type === 'Terminal') return false;

        // If this node IS a Users input node
        if (node.type === 'Users input') return true;

        // Check if any upstream connection leads to a Users input node
        const visited = new Set();
        const queue = [node];

        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current.id)) continue;
            visited.add(current.id);

            // Check each input of the current node
            for (const input of current.inputs || []) {
                if (input.connection) {
                    const sourceNode = input.connection.outputNode;
                    if (sourceNode) {
                        // Terminal stops the glow - don't traverse past it
                        if (sourceNode.type === 'Terminal') {
                            continue;
                        }
                        if (sourceNode.type === 'Users input') {
                            return true;
                        }
                        queue.push(sourceNode);
                    }
                }
            }
        }
        return false;
    }

    // Draw individual node
    drawNode(ctx, node) {
        // Check if in chat mode and node is a chat type
        const inChatMode = typeof isChatMode === 'function' && isChatMode();
        const isChatNode = ['SystemMessage', 'UserMessage', 'GPTMessage'].includes(node.type);

        if (inChatMode && isChatNode) {
            this.drawChatNode(ctx, node);
            return;
        }

        const isHovered = this.hoveredNode === node;
        const isSelected = node.selected;

        // Simulation mode states
        const isExecuting = this.executingNodeId === node.id;
        const isCompleted = this.completedNodeIds && this.completedNodeIds.includes(node.id);

        // Check if this node is connected from Users input (special glow)
        const isUsersInputFlow = this.isConnectedFromUsersInput(node);

        // Shadow for selected/hovered/executing nodes
        if (isUsersInputFlow && !isExecuting && !isCompleted) {
            // Special golden glow for Users input flow
            ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else if (isExecuting) {
            // Pulsing glow for executing node
            const pulseAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 200);
            ctx.shadowColor = `rgba(95, 138, 247, ${pulseAlpha})`;
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else if (isCompleted) {
            ctx.shadowColor = 'rgba(97, 159, 131, 0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else if (isSelected || isHovered) {
            ctx.shadowColor = isSelected ? '#5a9fd4' : '#808080';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        // Node background
        ctx.fillStyle = '#2d2d2d';
        this.roundRect(ctx, node.x, node.y, node.width, node.height, 6);
        ctx.fill();

        // Border - different colors for simulation states and special nodes
        let borderColor = isSelected ? '#5a9fd4' : (isHovered ? '#4a4a4a' : '#3a3a3a');
        let borderWidth = isSelected ? 2 : 1;

        if (isExecuting) {
            borderColor = '#5F8AF7';
            borderWidth = 3;
        } else if (isCompleted) {
            borderColor = '#619F83';
            borderWidth = 2;
        } else if (isUsersInputFlow) {
            // Golden border for Users input flow
            borderColor = '#f59e0b';
            borderWidth = 2;
        }

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.stroke();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Node header
        ctx.fillStyle = node.color || '#404040';
        this.roundRect(ctx, node.x, node.y, node.width, 28, 6, true, false);
        ctx.fill();

        // Title - offset to make room for Lottie animation if node has one
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const hasAnimation = this.nodeAnimationPaths && this.nodeAnimationPaths[node.type];
        const titleOffset = hasAnimation ? 32 : 8;
        const titleText = this.truncateText(ctx, node.title, node.width - titleOffset - 8);
        ctx.fillText(titleText, node.x + titleOffset, node.y + 14);

        // Draw ports
        this.drawPorts(ctx, node);

        // Draw properties
        this.drawProperties(ctx, node);

        // Draw image visualization if set
        this.drawImageVisualization(ctx, node);
    }

    // Draw image in sphere or rectangular form
    drawImageVisualization(ctx, node) {
        // Only for nodes with visualization property and image
        if (!node.properties.visualization || !node.properties.image) {
            return;
        }

        const img = this.getOrLoadImage(node.properties.image, node.id);
        if (!img || !img.complete) {
            return;
        }

        const vizType = node.properties.visualization;
        const padding = 8;
        const imgSize = 60;
        const imgX = node.x + node.width - imgSize - padding;
        const imgY = node.y + 35;

        ctx.save();

        if (vizType === 'Sphere') {
            // Circular clip mask
            ctx.beginPath();
            ctx.arc(imgX + imgSize / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
        } else if (vizType === 'Rectangular') {
            // Rectangular with rounded corners
            ctx.beginPath();
            this.roundRect(ctx, imgX, imgY, imgSize, imgSize, 4);
            ctx.clip();
            ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
        }

        ctx.restore();

        // Draw border around the image
        ctx.strokeStyle = '#5a9fd4';
        ctx.lineWidth = 2;
        if (vizType === 'Sphere') {
            ctx.beginPath();
            ctx.arc(imgX + imgSize / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
            ctx.stroke();
        } else if (vizType === 'Rectangular') {
            ctx.beginPath();
            this.roundRect(ctx, imgX, imgY, imgSize, imgSize, 4);
            ctx.stroke();
        }
    }

    // Get or load an image from cache
    getOrLoadImage(src, nodeId) {
        if (!this.imageCache) {
            this.imageCache = {};
        }

        const cacheKey = `${nodeId}_${src.substring(0, 50)}`;
        if (this.imageCache[cacheKey]) {
            return this.imageCache[cacheKey];
        }

        const img = new Image();
        img.onload = () => {
            this.render(); // Re-render when image loads
        };
        img.src = src;
        this.imageCache[cacheKey] = img;
        return img;
    }

    // Draw Flux-style chat node (vertical tree with top/bottom handles)
    drawChatNode(ctx, node) {
        const isHovered = this.hoveredNode === node;
        const isSelected = node.selected;

        // Fixed Flux-style dimensions - NO dynamic resizing
        const width = 150;
        const height = 50;  // Fixed height regardless of text content
        // Always show fixed type name for chat nodes
        const text = node.type === 'SystemMessage' ? 'System' :
                     node.type === 'UserMessage' ? 'User' : 'Idea';

        // Update node dimensions for hit testing
        node.width = width;
        node.height = height;

        // Selection glow (Flux-style orange)
        if (isSelected) {
            ctx.shadowColor = '#e73324';
            ctx.shadowBlur = 20;
        } else if (isHovered) {
            ctx.shadowColor = '#1a192b';
            ctx.shadowBlur = 5;
        }

        // Node background with node type color
        ctx.fillStyle = node.color || '#404040';
        ctx.beginPath();
        this.roundRect(ctx, node.x, node.y, width, height, 6);
        ctx.fill();

        // Selection border
        if (isSelected) {
            ctx.strokeStyle = '#e73324';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Draw text - black for System/User (light bg), white for Idea (dark bg)
        ctx.fillStyle = (node.type === 'SystemMessage' || node.type === 'UserMessage') ? '#000000' : '#ffffff';
        ctx.font = '12px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Truncate and wrap text
        const maxChars = 22;
        const displayText = text.length > maxChars ?
            text.substring(0, maxChars - 3) + '...' : text;
        ctx.fillText(displayText, node.x + width / 2, node.y + height / 2);

        // Draw vertical connection handles
        const handleRadius = 5;

        // Input handle (top center) - only for User and GPT nodes
        if (node.type !== 'SystemMessage') {
            ctx.fillStyle = '#333333';
            ctx.beginPath();
            ctx.arc(node.x + width / 2, node.y, handleRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Output handle (bottom center) - for ALL chat nodes including GPT
        // This enables continuing conversations from GPT responses
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.arc(node.x + width / 2, node.y + height, handleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Draw node ports
    drawPorts(ctx, node) {
        const portRadius = 6;

        // Draw inputs
        node.inputs.forEach((input, index) => {
            const pos = node.getInputPosition(index);
            const isHovered = this.hoveredPort &&
                            this.hoveredPort.node === node &&
                            this.hoveredPort.type === 'input' &&
                            this.hoveredPort.index === index;

            // Port circle
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, portRadius, 0, Math.PI * 2);
            ctx.fillStyle = input.type.color;
            ctx.fill();
            ctx.strokeStyle = isHovered ? '#ffffff' : '#1a1a1a';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Port label
            ctx.fillStyle = '#b0b0b0';
            ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
            ctx.textAlign = 'left';
            ctx.fillText(input.name, pos.x + 12, pos.y + 4);
        });

        // Draw outputs
        node.outputs.forEach((output, index) => {
            const pos = node.getOutputPosition(index);
            const isHovered = this.hoveredPort &&
                            this.hoveredPort.node === node &&
                            this.hoveredPort.type === 'output' &&
                            this.hoveredPort.index === index;

            // Port circle
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, portRadius, 0, Math.PI * 2);
            ctx.fillStyle = output.type.color;
            ctx.fill();
            ctx.strokeStyle = isHovered ? '#ffffff' : '#1a1a1a';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Port label
            ctx.fillStyle = '#b0b0b0';
            ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
            ctx.textAlign = 'right';
            ctx.fillText(output.name, pos.x - 12, pos.y + 4);
        });
    }

    // Draw node properties
    drawProperties(ctx, node) {
        let yOffset = 40 + (Math.max(node.inputs.length, node.outputs.length) * 20);

        // Check if we're in Journal mode
        const inJournalMode = typeof isJournalMode === 'function' && isJournalMode();

        // Check if text/image should be hidden based on dataSource
        const hideOptions = ['Generated by AI', 'Answered by the user', 'Picked manually by the user from user\'s data', 'Auto Picked randomly from user\'s data'];
        const shouldHideTextImage = node.properties.hasOwnProperty('dataSource') && hideOptions.includes(node.properties.dataSource);

        Object.entries(node.properties).forEach(([key, value]) => {
            // In Journal mode, skip dataSource property on canvas
            if (inJournalMode && key === 'dataSource') {
                return;
            }

            // Skip text and image properties when dataSource is set to hide them
            if (shouldHideTextImage && (key === 'text' || key === 'image')) {
                return;
            }

            // Skip fallbackAction property on canvas (only shown in properties panel)
            if (key === 'fallbackAction') {
                return;
            }

            // Skip visualization property on canvas (shown as image)
            if (key === 'visualization') {
                return;
            }

            ctx.fillStyle = '#808080';
            ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
            ctx.textAlign = 'left';
            ctx.fillText(key + ':', node.x + 8, node.y + yOffset);

            ctx.fillStyle = '#e0e0e0';
            const valueText = this.truncateText(ctx, String(value), node.width - 16);
            ctx.fillText(valueText, node.x + 8, node.y + yOffset + 12);

            yOffset += 25;
        });
    }

    // Draw connection between two points
    drawConnection(ctx, start, end, color = '#5a9fd4', dashed = false) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        if (dashed) {
            ctx.setLineDash([5, 5]);
        }

        const dx = end.x - start.x;
        const controlPointOffset = Math.abs(dx) * 0.5;

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(
            start.x + controlPointOffset, start.y,
            end.x - controlPointOffset, end.y,
            end.x, end.y
        );
        ctx.stroke();

        ctx.setLineDash([]);
    }

    // Helper function to draw rounded rectangles
    roundRect(ctx, x, y, width, height, radius, topOnly = false, bottomOnly = false) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);

        if (topOnly) {
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x, y + height);
        } else {
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        }

        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // Helper function to truncate text
    truncateText(ctx, text, maxWidth) {
        const metrics = ctx.measureText(text);
        if (metrics.width <= maxWidth) {
            return text;
        }

        let truncated = text;
        while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        return truncated + '...';
    }

    // Render minimap
    renderMinimap() {
        const minimapCanvas = document.getElementById('minimap-canvas');
        if (!minimapCanvas) return;

        const minimapCtx = minimapCanvas.getContext('2d');
        const minimapWidth = minimapCanvas.width;
        const minimapHeight = minimapCanvas.height;

        // Always clear minimap background
        minimapCtx.clearRect(0, 0, minimapWidth, minimapHeight);
        minimapCtx.fillStyle = '#1a1a1a';
        minimapCtx.fillRect(0, 0, minimapWidth, minimapHeight);

        // If there are no nodes, don't draw anything else (prevents stale view)
        if (this.nodes.length === 0) {
            return;
        }

        // Calculate bounds of all nodes
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        });

        const workflowWidth = maxX - minX + 200; // Add padding
        const workflowHeight = maxY - minY + 200;

        // Calculate scale to fit minimap
        const scaleX = minimapWidth / workflowWidth;
        const scaleY = minimapHeight / workflowHeight;
        const minimapScale = Math.min(scaleX, scaleY) * 0.9;

        // Center the view
        const offsetX = (minimapWidth - workflowWidth * minimapScale) / 2 - minX * minimapScale + 100 * minimapScale;
        const offsetY = (minimapHeight - workflowHeight * minimapScale) / 2 - minY * minimapScale + 100 * minimapScale;

        minimapCtx.save();
        minimapCtx.translate(offsetX, offsetY);
        minimapCtx.scale(minimapScale, minimapScale);

        // Draw connections
        if (window.connectionManager) {
            minimapCtx.strokeStyle = '#5a9fd4';
            minimapCtx.lineWidth = 2 / minimapScale;
            window.connectionManager.connections.forEach(conn => {
                const start = conn.outputNode.getOutputPosition(conn.outputIndex);
                const end = conn.inputNode.getInputPosition(conn.inputIndex);
                minimapCtx.beginPath();
                minimapCtx.moveTo(start.x, start.y);
                minimapCtx.lineTo(end.x, end.y);
                minimapCtx.stroke();
            });
        }

        // Draw nodes as small rectangles
        this.nodes.forEach(node => {
            minimapCtx.fillStyle = node.selected ? '#5a9fd4' : node.color || '#404040';
            minimapCtx.fillRect(node.x, node.y, node.width, node.height);
        });

        // Draw viewport rectangle
        const viewX = -this.offsetX / this.scale;
        const viewY = -this.offsetY / this.scale;
        const viewWidth = this.canvas.width / this.scale;
        const viewHeight = this.canvas.height / this.scale;

        minimapCtx.strokeStyle = '#5a9fd4';
        minimapCtx.lineWidth = 2 / minimapScale;
        minimapCtx.strokeRect(viewX, viewY, viewWidth, viewHeight);
        minimapCtx.fillStyle = 'rgba(90, 159, 212, 0.1)';
        minimapCtx.fillRect(viewX, viewY, viewWidth, viewHeight);

        minimapCtx.restore();
    }

    // Fit view to show all nodes
    fitToView(padding = 100) {
        if (this.nodes.length === 0) return;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        });

        const workflowWidth = maxX - minX;
        const workflowHeight = maxY - minY;
        const workflowCenterX = minX + workflowWidth / 2;
        const workflowCenterY = minY + workflowHeight / 2;

        // Calculate scale to fit
        const scaleX = this.canvas.width / (workflowWidth + padding * 2);
        const scaleY = this.canvas.height / (workflowHeight + padding * 2);
        const newScale = Math.min(scaleX, scaleY, 1); // Don't zoom in more than 100%

        // Center the view
        this.scale = newScale;
        this.offsetX = this.canvas.width / 2 - workflowCenterX * newScale;
        this.offsetY = this.canvas.height / 2 - workflowCenterY * newScale;

        this.render();

        if (window.updateZoomDisplay) {
            window.updateZoomDisplay(this.scale);
        }
    }

    // Get all nodes as JSON
    toJSON() {
        return this.nodes.map(node => node.toJSON());
    }

    // Load nodes from JSON
    fromJSON(data) {
        this.clearNodes();
        data.forEach(nodeData => {
            const node = Node.fromJSON(nodeData);
            this.addNode(node);
        });
    }

    // Center view on a specific node
    centerOnNode(node) {
        if (!node) return;

        const nodeCenterX = node.x + node.width / 2;
        const nodeCenterY = node.y + node.height / 2;

        this.offsetX = this.canvas.width / 2 - nodeCenterX * this.scale;
        this.offsetY = this.canvas.height / 2 - nodeCenterY * this.scale;

        this.render();
    }

    // Draw simulation particles along connections
    drawSimulationParticles(ctx, particles) {
        particles.forEach(particle => {
            const conn = particle.connection;
            if (!conn) return;

            // Get connection endpoints
            const startPos = conn.outputNode.getOutputPosition(conn.outputIndex);
            const endPos = conn.inputNode.getInputPosition(conn.inputIndex);

            // Calculate bezier curve point
            const t = particle.progress;
            const cp1x = startPos.x + 50;
            const cp1y = startPos.y;
            const cp2x = endPos.x - 50;
            const cp2y = endPos.y;

            // Cubic bezier calculation
            const x = Math.pow(1-t, 3) * startPos.x +
                     3 * Math.pow(1-t, 2) * t * cp1x +
                     3 * (1-t) * Math.pow(t, 2) * cp2x +
                     Math.pow(t, 3) * endPos.x;

            const y = Math.pow(1-t, 3) * startPos.y +
                     3 * Math.pow(1-t, 2) * t * cp1y +
                     3 * (1-t) * Math.pow(t, 2) * cp2y +
                     Math.pow(t, 3) * endPos.y;

            // Draw particle with glow
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#5F8AF7';
            ctx.shadowColor = '#5F8AF7';
            ctx.shadowBlur = 15;
            ctx.fill();

            // Draw trail
            for (let i = 1; i <= 5; i++) {
                const trailT = Math.max(0, t - i * 0.02);
                const trailX = Math.pow(1-trailT, 3) * startPos.x +
                              3 * Math.pow(1-trailT, 2) * trailT * cp1x +
                              3 * (1-trailT) * Math.pow(trailT, 2) * cp2x +
                              Math.pow(trailT, 3) * endPos.x;
                const trailY = Math.pow(1-trailT, 3) * startPos.y +
                              3 * Math.pow(1-trailT, 2) * trailT * cp1y +
                              3 * (1-trailT) * Math.pow(trailT, 2) * cp2y +
                              Math.pow(trailT, 3) * endPos.y;

                ctx.beginPath();
                ctx.arc(trailX, trailY, 8 - i, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(95, 138, 247, ${0.6 - i * 0.1})`;
                ctx.shadowBlur = 10 - i * 2;
                ctx.fill();
            }

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        });
    }
}
