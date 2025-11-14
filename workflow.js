// Workflow Management - Save/Load Functionality

class WorkflowManager {
    constructor(canvasRenderer, connectionManager) {
        this.canvasRenderer = canvasRenderer;
        this.connectionManager = connectionManager;
        this.currentWorkflow = null;
        this.workflowName = 'Untitled';
        this.isDirty = false;
    }

    // Create a new workflow
    newWorkflow() {
        if (this.isDirty) {
            const confirm = window.confirm('You have unsaved changes. Create new workflow anyway?');
            if (!confirm) return false;
        }

        this.canvasRenderer.clearNodes();
        this.connectionManager.clearConnections();
        this.currentWorkflow = null;
        this.workflowName = 'Untitled';
        this.isDirty = false;

        this.showNotification('New workflow created', 'success');
        return true;
    }

    // Save workflow to JSON
    saveWorkflow() {
        const workflow = {
            version: '1.0',
            name: this.workflowName,
            created: new Date().toISOString(),
            nodes: this.canvasRenderer.toJSON(),
            connections: this.connectionManager.toJSON(),
            metadata: {
                nodeCount: this.canvasRenderer.nodes.length,
                connectionCount: this.connectionManager.connections.length
            }
        };

        this.currentWorkflow = workflow;
        this.isDirty = false;

        // Download as JSON file
        const json = JSON.stringify(workflow, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.workflowName.replace(/[^a-z0-9]/gi, '_')}_workflow.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Workflow saved successfully', 'success');
        return workflow;
    }

    // Load workflow from JSON
    loadWorkflow(workflowData) {
        try {
            // Validate workflow data
            if (!workflowData.nodes || !workflowData.connections) {
                throw new Error('Invalid workflow format');
            }

            // Clear current workflow
            this.canvasRenderer.clearNodes();
            this.connectionManager.clearConnections();

            // Load nodes
            workflowData.nodes.forEach(nodeData => {
                const node = Node.fromJSON(nodeData);
                this.canvasRenderer.addNode(node);
            });

            // Load connections
            this.connectionManager.fromJSON(workflowData.connections, this.canvasRenderer.nodes);

            // Update state
            this.currentWorkflow = workflowData;
            this.workflowName = workflowData.name || 'Untitled';
            this.isDirty = false;

            // Center view on workflow
            this.centerView();

            this.showNotification('Workflow loaded successfully', 'success');
            return true;
        } catch (error) {
            console.error('Failed to load workflow:', error);
            this.showNotification('Failed to load workflow: ' + error.message, 'error');
            return false;
        }
    }

    // Load workflow from file
    loadWorkflowFromFile(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const workflowData = JSON.parse(e.target.result);
                this.loadWorkflow(workflowData);
            } catch (error) {
                console.error('Failed to parse workflow file:', error);
                this.showNotification('Failed to parse workflow file', 'error');
            }
        };

        reader.onerror = () => {
            this.showNotification('Failed to read file', 'error');
        };

        reader.readAsText(file);
    }

    // Save workflow to localStorage
    saveToLocalStorage(key = 'comfyui_autosave') {
        const workflow = {
            version: '1.0',
            name: this.workflowName,
            saved: new Date().toISOString(),
            nodes: this.canvasRenderer.toJSON(),
            connections: this.connectionManager.toJSON()
        };

        try {
            localStorage.setItem(key, JSON.stringify(workflow));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    }

    // Load workflow from localStorage
    loadFromLocalStorage(key = 'comfyui_autosave') {
        try {
            const data = localStorage.getItem(key);
            if (data) {
                const workflow = JSON.parse(data);
                return workflow;
            }
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
        }
        return null;
    }

    // Auto-save functionality
    enableAutoSave(intervalMs = 30000) {
        setInterval(() => {
            if (this.isDirty) {
                this.saveToLocalStorage();
                console.log('Auto-saved workflow');
            }
        }, intervalMs);
    }

    // Export workflow as PNG with embedded data
    exportAsPNG() {
        // Create a temporary canvas to render the workflow
        const tempCanvas = document.createElement('canvas');
        const padding = 50;

        // Calculate bounds
        const bounds = this.calculateWorkflowBounds();
        if (!bounds) {
            this.showNotification('No nodes to export', 'warning');
            return;
        }

        tempCanvas.width = bounds.width + padding * 2;
        tempCanvas.height = bounds.height + padding * 2;

        const tempCtx = tempCanvas.getContext('2d');

        // Fill background
        tempCtx.fillStyle = '#1a1a1a';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Save current transform
        const originalOffsetX = this.canvasRenderer.offsetX;
        const originalOffsetY = this.canvasRenderer.offsetY;
        const originalScale = this.canvasRenderer.scale;

        // Temporarily adjust for export
        this.canvasRenderer.offsetX = padding - bounds.minX;
        this.canvasRenderer.offsetY = padding - bounds.minY;
        this.canvasRenderer.scale = 1;

        // Render to temp canvas
        const originalCanvas = this.canvasRenderer.canvas;
        const originalCtx = this.canvasRenderer.ctx;
        this.canvasRenderer.canvas = tempCanvas;
        this.canvasRenderer.ctx = tempCtx;
        this.canvasRenderer.render();

        // Restore original canvas
        this.canvasRenderer.canvas = originalCanvas;
        this.canvasRenderer.ctx = originalCtx;
        this.canvasRenderer.offsetX = originalOffsetX;
        this.canvasRenderer.offsetY = originalOffsetY;
        this.canvasRenderer.scale = originalScale;
        this.canvasRenderer.render();

        // Download the image
        tempCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.workflowName}_workflow.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('Workflow exported as PNG', 'success');
        });
    }

    // Calculate bounds of all nodes
    calculateWorkflowBounds() {
        const nodes = this.canvasRenderer.nodes;
        if (nodes.length === 0) return null;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        });

        return {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    // Center view on workflow
    centerView() {
        const bounds = this.calculateWorkflowBounds();
        if (!bounds) return;

        const canvas = this.canvasRenderer.canvas;
        const centerX = bounds.minX + bounds.width / 2;
        const centerY = bounds.minY + bounds.height / 2;

        this.canvasRenderer.offsetX = canvas.width / 2 - centerX;
        this.canvasRenderer.offsetY = canvas.height / 2 - centerY;
        this.canvasRenderer.render();
    }

    // Mark workflow as modified
    markDirty() {
        this.isDirty = true;
    }

    // Validate current workflow
    validateWorkflow() {
        const errors = this.connectionManager.validateWorkflow(this.canvasRenderer.nodes);

        if (errors.length === 0) {
            this.showNotification('Workflow is valid', 'success');
        } else {
            const errorMessages = errors.map(e => e.message).join('\n');
            this.showNotification('Workflow validation failed:\n' + errorMessages, 'error');
        }

        return errors;
    }

    // Execute workflow (simulation)
    executeWorkflow() {
        // Validate first
        const errors = this.connectionManager.validateWorkflow(this.canvasRenderer.nodes);
        const hasErrors = errors.some(e => e.type === 'error');

        if (hasErrors) {
            this.showNotification('Cannot execute: Workflow has errors', 'error');
            return false;
        }

        // Get execution order
        const executionOrder = this.connectionManager.getExecutionOrder(this.canvasRenderer.nodes);

        console.log('Executing workflow...');
        console.log('Execution order:', executionOrder.map(n => n.title));

        // Simulate execution
        this.showNotification(`Executing ${executionOrder.length} nodes...`, 'info');

        // In a real implementation, this would send the workflow to a backend
        setTimeout(() => {
            this.showNotification('Workflow executed successfully', 'success');
        }, 1000);

        return true;
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Style
        Object.assign(notification.style, {
            position: 'fixed',
            top: '70px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            zIndex: '10000',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'slideIn 0.3s ease',
            backgroundColor: type === 'success' ? '#10b981' :
                           type === 'error' ? '#ef4444' :
                           type === 'warning' ? '#f59e0b' : '#3b82f6'
        });

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
