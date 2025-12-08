// Connection Management

class Connection {
    constructor(outputNode, outputIndex, inputNode, inputIndex) {
        this.id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.outputNode = outputNode;
        this.outputIndex = outputIndex;
        this.inputNode = inputNode;
        this.inputIndex = inputIndex;
    }

    toJSON() {
        return {
            id: this.id,
            output: {
                nodeId: this.outputNode.id,
                index: this.outputIndex
            },
            input: {
                nodeId: this.inputNode.id,
                index: this.inputIndex
            }
        };
    }
}

class ConnectionManager {
    constructor() {
        this.connections = [];
    }

    // Check if connection is valid based on type matching
    canConnect(outputPort, inputPort) {
        // Basic null check
        if (!outputPort || !inputPort) {
            return false;
        }

        // Allow all connections regardless of type
        return true;
    }

    // Add a connection
    addConnection(outputNode, outputIndex, inputNode, inputIndex) {
        // Validate connection
        const outputPort = outputNode.outputs[outputIndex];
        const inputPort = inputNode.inputs[inputIndex];

        if (!outputPort || !inputPort) {
            console.error('Invalid port indices');
            return null;
        }

        // Determine if multiple connections are allowed on this input
        // - Journals mode: all nodes can have multiple input connections
        // - Design Flow: utility nodes as SOURCE don't break existing connections
        // - Terminal node: always accepts multiple input connections
        const isJournalMode = typeof journalMode !== 'undefined' && journalMode;
        const isUtilityNode = outputNode.category === 'utility';
        const isTerminalInput = inputNode.type === 'Terminal';
        const allowMultipleInputs = isJournalMode || isUtilityNode || isTerminalInput;

        // Check if input already has a connection
        const existingInputConnection = this.connections.find(conn =>
            conn.inputNode === inputNode && conn.inputIndex === inputIndex
        );

        // Only remove existing input connection if multiple connections NOT allowed
        if (existingInputConnection && !allowMultipleInputs) {
            this.removeConnection(existingInputConnection);
        }

        // Terminal OUTPUT can only connect to Agent nodes (but can have multiple Agent connections)
        if (outputNode.type === 'Terminal') {
            // Only allow connection to Agent node
            if (inputNode.type !== 'Agent') {
                console.warn('Terminal can only connect to Agent nodes');
                return null;
            }
            // Multiple connections to Agent nodes are allowed - no removal of existing connections
        }

        // Create new connection
        const connection = new Connection(outputNode, outputIndex, inputNode, inputIndex);
        this.connections.push(connection);

        // Update node port states - support multiple connections
        if (!inputPort.connections) {
            inputPort.connections = [];
        }
        inputPort.connections.push(connection);
        inputPort.connection = connection; // Keep for backwards compatibility
        outputPort.connections.push(connection);

        return connection;
    }

    // Remove a connection
    removeConnection(connection) {
        const index = this.connections.indexOf(connection);
        if (index > -1) {
            // Update port states
            const inputPort = connection.inputNode.inputs[connection.inputIndex];
            const outputPort = connection.outputNode.outputs[connection.outputIndex];

            if (inputPort) {
                // Remove from connections array if it exists
                if (inputPort.connections) {
                    const connIndex = inputPort.connections.indexOf(connection);
                    if (connIndex > -1) {
                        inputPort.connections.splice(connIndex, 1);
                    }
                }
                // Update single connection reference for backwards compatibility
                if (inputPort.connection === connection) {
                    inputPort.connection = inputPort.connections?.[0] || null;
                }
            }

            if (outputPort) {
                const connIndex = outputPort.connections.indexOf(connection);
                if (connIndex > -1) {
                    outputPort.connections.splice(connIndex, 1);
                }
            }

            this.connections.splice(index, 1);
        }
    }

    // Remove all connections for a node
    removeNodeConnections(node) {
        const connectionsToRemove = this.connections.filter(conn =>
            conn.inputNode === node || conn.outputNode === node
        );

        connectionsToRemove.forEach(conn => this.removeConnection(conn));
    }

    // Find connection at position (for clicking on connections)
    getConnectionAtPosition(x, y, threshold = 5) {
        for (const conn of this.connections) {
            const start = conn.outputNode.getOutputPosition(conn.outputIndex);
            const end = conn.inputNode.getInputPosition(conn.inputIndex);

            if (this.isPointNearCurve(x, y, start, end, threshold)) {
                return conn;
            }
        }
        return null;
    }

    // Check if point is near a bezier curve
    isPointNearCurve(x, y, start, end, threshold) {
        const dx = end.x - start.x;
        const controlPointOffset = Math.abs(dx) * 0.5;

        // Sample points along the curve
        for (let t = 0; t <= 1; t += 0.05) {
            const point = this.getBezierPoint(
                start.x, start.y,
                start.x + controlPointOffset, start.y,
                end.x - controlPointOffset, end.y,
                end.x, end.y,
                t
            );

            const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
            if (dist <= threshold) {
                return true;
            }
        }

        return false;
    }

    // Get point on bezier curve at t
    getBezierPoint(x0, y0, x1, y1, x2, y2, x3, y3, t) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;

        return {
            x: mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3,
            y: mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3
        };
    }

    // Clear all connections
    clearConnections() {
        this.connections = [];
    }

    // Render all connections
    render(ctx) {
        const inChatMode = typeof isChatMode === 'function' && isChatMode();

        this.connections.forEach(conn => {
            // Check if this is a chat connection
            const isChatConnection = inChatMode &&
                ['SystemMessage', 'UserMessage', 'GPTMessage'].includes(conn.outputNode.type) &&
                ['SystemMessage', 'UserMessage', 'GPTMessage'].includes(conn.inputNode.type);

            if (isChatConnection) {
                // Vertical connection (bottom of parent to top of child)
                const start = {
                    x: conn.outputNode.x + conn.outputNode.width / 2,
                    y: conn.outputNode.y + conn.outputNode.height
                };
                const end = {
                    x: conn.inputNode.x + conn.inputNode.width / 2,
                    y: conn.inputNode.y
                };

                // Use output node color for connection
                const color = conn.outputNode.color || '#5a9fd4';
                this.drawVerticalConnection(ctx, start, end, color);
            } else {
                // Standard horizontal connection
                const start = conn.outputNode.getOutputPosition(conn.outputIndex);
                const end = conn.inputNode.getInputPosition(conn.inputIndex);

                // Get color from output type
                const outputType = conn.outputNode.outputs[conn.outputIndex].type;
                const color = outputType.color;

                this.drawConnection(ctx, start, end, color);
            }
        });
    }

    // Draw a horizontal connection curve (original style)
    drawConnection(ctx, start, end, color = '#5a9fd4', dashed = false) {
        const dx = end.x - start.x;
        const controlPointOffset = Math.abs(dx) * 0.5;

        // Draw shadow/glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;

        if (dashed) {
            ctx.setLineDash([5, 5]);
        }

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(
            start.x + controlPointOffset, start.y,
            end.x - controlPointOffset, end.y,
            end.x, end.y
        );
        ctx.stroke();

        // Reset
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
    }

    // Draw a vertical connection curve (Flux-style for chat nodes)
    drawVerticalConnection(ctx, start, end, color = '#5a9fd4') {
        const dy = end.y - start.y;
        const controlPointOffset = Math.abs(dy) * 0.5;

        // Subtle shadow
        ctx.shadowColor = color;
        ctx.shadowBlur = 3;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(
            start.x, start.y + controlPointOffset,  // Control point 1 (below start)
            end.x, end.y - controlPointOffset,      // Control point 2 (above end)
            end.x, end.y
        );
        ctx.stroke();

        // Reset
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }

    // Get all connections as JSON
    toJSON() {
        return this.connections.map(conn => conn.toJSON());
    }

    // Load connections from JSON
    fromJSON(data, nodes) {
        this.clearConnections();

        data.forEach(connData => {
            // Find nodes by ID
            const outputNode = nodes.find(n => n.id === connData.output.nodeId);
            const inputNode = nodes.find(n => n.id === connData.input.nodeId);

            if (outputNode && inputNode) {
                this.addConnection(
                    outputNode,
                    connData.output.index,
                    inputNode,
                    connData.input.index
                );
            }
        });
    }

    // Validate workflow (check for cycles, missing connections, etc.)
    validateWorkflow(nodes) {
        const errors = [];

        // Check for disconnected required inputs
        nodes.forEach(node => {
            node.inputs.forEach((input, index) => {
                if (!input.connection) {
                    errors.push({
                        type: 'warning',
                        node: node,
                        message: `Input "${input.name}" is not connected`
                    });
                }
            });
        });

        // Check for cycles using DFS
        const hasCycle = this.detectCycle(nodes);
        if (hasCycle) {
            errors.push({
                type: 'error',
                message: 'Workflow contains a cycle'
            });
        }

        return errors;
    }

    // Detect cycles in the graph
    detectCycle(nodes) {
        const visited = new Set();
        const recursionStack = new Set();

        const dfs = (node) => {
            visited.add(node);
            recursionStack.add(node);

            // Get all nodes this node connects to
            const connections = this.connections.filter(conn => conn.outputNode === node);

            for (const conn of connections) {
                const nextNode = conn.inputNode;

                if (!visited.has(nextNode)) {
                    if (dfs(nextNode)) {
                        return true;
                    }
                } else if (recursionStack.has(nextNode)) {
                    return true; // Cycle detected
                }
            }

            recursionStack.delete(node);
            return false;
        };

        for (const node of nodes) {
            if (!visited.has(node)) {
                if (dfs(node)) {
                    return true;
                }
            }
        }

        return false;
    }

    // Get all nodes connected to a starting node (finds the connected flow/component)
    getConnectedComponent(startNode, allNodes) {
        const visited = new Set();
        const component = [];

        const traverse = (node) => {
            if (visited.has(node.id)) return;
            visited.add(node.id);
            component.push(node);

            // Find all connected nodes (both directions)
            this.connections.forEach(conn => {
                if (conn.outputNode.id === node.id) {
                    const targetNode = allNodes.find(n => n.id === conn.inputNode.id);
                    if (targetNode) traverse(targetNode);
                }
                if (conn.inputNode.id === node.id) {
                    const targetNode = allNodes.find(n => n.id === conn.outputNode.id);
                    if (targetNode) traverse(targetNode);
                }
            });
        };

        traverse(startNode);
        return component;
    }

    // Get execution order (topological sort based on connection hierarchy)
    getExecutionOrder(nodes) {
        if (nodes.length === 0) return [];

        const visited = new Set();
        const order = [];

        // Build adjacency: for each node, find what nodes feed into it
        // Uses this.connections as source of truth (not stale node.input.connection)
        const getInputNodes = (node) => {
            return this.connections
                .filter(conn => conn.inputNode.id === node.id)
                .map(conn => conn.outputNode);
        };

        // Check if node has any incoming connections
        const hasIncomingConnections = (node) => {
            return this.connections.some(conn => conn.inputNode.id === node.id);
        };

        const dfs = (node) => {
            if (visited.has(node.id)) return;
            visited.add(node.id);

            // Visit all dependencies first (nodes that feed into this one)
            const inputNodes = getInputNodes(node);
            inputNodes.forEach(depNode => dfs(depNode));

            order.push(node);
        };

        // Run DFS from all nodes to ensure we catch everything
        // The order is determined by connection hierarchy, not array order
        nodes.forEach(node => dfs(node));

        return order;
    }
}
