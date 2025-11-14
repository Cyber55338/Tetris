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

        this.resizeCanvas();
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

        // Draw grid
        this.drawGrid(ctx);

        // Draw connections
        if (window.connectionManager) {
            window.connectionManager.render(ctx);
        }

        // Draw temporary connection
        if (this.isConnecting && this.connectionStart && this.tempConnectionEnd) {
            this.drawConnection(ctx, this.connectionStart, this.tempConnectionEnd, '#5a9fd4', true);
        }

        // Draw nodes
        this.nodes.forEach(node => {
            this.drawNode(ctx, node);
        });

        // Restore state
        ctx.restore();
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

    // Draw individual node
    drawNode(ctx, node) {
        const isHovered = this.hoveredNode === node;
        const isSelected = node.selected;

        // Shadow for selected/hovered nodes
        if (isSelected || isHovered) {
            ctx.shadowColor = isSelected ? '#5a9fd4' : '#808080';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        // Node background
        ctx.fillStyle = '#2d2d2d';
        this.roundRect(ctx, node.x, node.y, node.width, node.height, 6);
        ctx.fill();

        // Border
        ctx.strokeStyle = isSelected ? '#5a9fd4' : (isHovered ? '#4a4a4a' : '#3a3a3a');
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Node header
        ctx.fillStyle = node.color || '#404040';
        this.roundRect(ctx, node.x, node.y, node.width, 28, 6, true, false);
        ctx.fill();

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const titleText = this.truncateText(ctx, node.title, node.width - 16);
        ctx.fillText(titleText, node.x + 8, node.y + 14);

        // Draw ports
        this.drawPorts(ctx, node);

        // Draw properties
        this.drawProperties(ctx, node);
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

        Object.entries(node.properties).forEach(([key, value]) => {
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
}
