// Node Definitions and Types

// Data type definitions with colors
const DataTypes = {
    IMAGE: { name: 'IMAGE', color: '#8b5cf6' },
    LATENT: { name: 'LATENT', color: '#ec4899' },
    MODEL: { name: 'MODEL', color: '#f59e0b' },
    CONDITIONING: { name: 'CONDITIONING', color: '#10b981' },
    CLIP: { name: 'CLIP', color: '#3b82f6' },
    VAE: { name: 'VAE', color: '#ef4444' },
    CONTROL_NET: { name: 'CONTROL_NET', color: '#06b6d4' },
    NUMBER: { name: 'NUMBER', color: '#6366f1' },
    STRING: { name: 'STRING', color: '#84cc16' },
    BOOLEAN: { name: 'BOOLEAN', color: '#a78bfa' },
    ANY: { name: 'ANY', color: '#9ca3af' }
};

// Node class definition
class Node {
    constructor(type, x, y) {
        this.id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = 200;
        this.height = 100;
        this.selected = false;
        this.inputs = [];
        this.outputs = [];
        this.properties = {};

        // Initialize based on node type
        const definition = NodeDefinitions[type];
        if (definition) {
            this.title = definition.title;
            this.color = definition.color || '#404040';
            this.category = definition.category;

            // Create inputs
            if (definition.inputs) {
                this.inputs = definition.inputs.map((input, index) => ({
                    name: input.name,
                    type: input.type,
                    index: index,
                    connection: null
                }));
            }

            // Create outputs
            if (definition.outputs) {
                this.outputs = definition.outputs.map((output, index) => ({
                    name: output.name,
                    type: output.type,
                    index: index,
                    connections: []
                }));
            }

            // Initialize properties
            if (definition.properties) {
                definition.properties.forEach(prop => {
                    this.properties[prop.name] = prop.default;
                });
            }

            // Calculate height based on content
            this.calculateHeight();
        }
    }

    calculateHeight() {
        const headerHeight = 28;
        const portHeight = 20;
        const padding = 8;
        const propertyHeight = Object.keys(this.properties).length * 30;

        const portsCount = Math.max(this.inputs.length, this.outputs.length);
        this.height = headerHeight + (portsCount * portHeight) + propertyHeight + (padding * 2);
        this.height = Math.max(this.height, 80); // Minimum height
    }

    getInputPosition(index) {
        const portSpacing = 20;
        const startY = 36;
        return {
            x: this.x,
            y: this.y + startY + (index * portSpacing)
        };
    }

    getOutputPosition(index) {
        const portSpacing = 20;
        const startY = 36;
        return {
            x: this.x + this.width,
            y: this.y + startY + (index * portSpacing)
        };
    }

    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    getPortAtPosition(x, y) {
        const portRadius = 8;

        // Check inputs
        for (let i = 0; i < this.inputs.length; i++) {
            const pos = this.getInputPosition(i);
            const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
            if (dist <= portRadius) {
                return { type: 'input', index: i, port: this.inputs[i] };
            }
        }

        // Check outputs
        for (let i = 0; i < this.outputs.length; i++) {
            const pos = this.getOutputPosition(i);
            const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
            if (dist <= portRadius) {
                return { type: 'output', index: i, port: this.outputs[i] };
            }
        }

        return null;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            properties: this.properties
        };
    }

    static fromJSON(data) {
        const node = new Node(data.type, data.x, data.y);
        node.id = data.id;
        // Deep clone properties to ensure each node has independent data
        node.properties = data.properties ? JSON.parse(JSON.stringify(data.properties)) : {};
        return node;
    }
}

// Node Definitions
const NodeDefinitions = {
    // Mind Inventory
    'Thought': {
        title: 'Thought',
        category: 'mindinventory',
        color: '#ef4444',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Raw', 'Generated by AI', 'Auto Picked randomly from user\'s data', 'Picked manually by the user from user\'s data', 'Answered by the user'] }
        ]
    },
    'Emotion': {
        title: 'Emotion',
        category: 'mindinventory',
        color: '#10b981',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Raw', 'Generated by AI', 'Auto Picked randomly from user\'s data', 'Picked manually by the user from user\'s data', 'Answered by the user'] }
        ]
    },
    'Imagination': {
        title: 'Imagination',
        category: 'mindinventory',
        color: '#f59e0b',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Raw', 'Generated by AI', 'Auto Picked randomly from user\'s data', 'Picked manually by the user from user\'s data', 'Answered by the user'] }
        ]
    },
    'Belief': {
        title: 'Belief',
        category: 'mindinventory',
        color: '#78716c',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Raw', 'Generated by AI', 'Auto Picked randomly from user\'s data', 'Picked manually by the user from user\'s data', 'Answered by the user'] }
        ]
    },
    'Action': {
        title: 'Action',
        category: 'mindinventory',
        color: '#3b82f6',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Raw', 'Generated by AI', 'Auto Picked randomly from user\'s data', 'Picked manually by the user from user\'s data', 'Answered by the user'] }
        ]
    },

    // Perception Graph
    'Dreams': {
        title: 'Dreams',
        category: 'perceptiongraph',
        color: '#3b82f6',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Raw', 'Generated by AI', 'Auto Picked randomly from user\'s data', 'Picked manually by the user from user\'s data', 'Answered by the user'] }
        ]
    },
    'Goals': {
        title: 'Goals',
        category: 'perceptiongraph',
        color: '#ec4899',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Raw', 'Generated by AI', 'Auto Picked randomly from user\'s data', 'Picked manually by the user from user\'s data', 'Answered by the user'] }
        ]
    },
    'Rules': {
        title: 'Rules',
        category: 'perceptiongraph',
        color: '#f59e0b',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Raw', 'Generated by AI', 'Auto Picked randomly from user\'s data', 'Picked manually by the user from user\'s data', 'Answered by the user'] }
        ]
    },
    'Memories': {
        title: 'Memories',
        category: 'perceptiongraph',
        color: '#8b5cf6',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Raw', 'Generated by AI', 'Auto Picked randomly from user\'s data', 'Picked manually by the user from user\'s data', 'Answered by the user'] }
        ]
    },
    'Questions': {
        title: 'Questions',
        category: 'perceptiongraph',
        color: '#eab308',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Raw', 'Generated by AI', 'Auto Picked randomly from user\'s data', 'Picked manually by the user from user\'s data', 'Answered by the user'] }
        ]
    },
    'Expressions': {
        title: 'Expressions',
        category: 'perceptiongraph',
        color: '#f59e0b',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Raw', 'Generated by AI', 'Auto Picked randomly from user\'s data', 'Picked manually by the user from user\'s data', 'Answered by the user'] }
        ]
    },
    'Instructions': {
        title: 'Instructions',
        category: 'perceptiongraph',
        color: '#ec4899',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Raw', 'Generated by AI', 'Auto Picked randomly from user\'s data', 'Picked manually by the user from user\'s data', 'Answered by the user'] }
        ]
    },
    'Problem': {
        title: 'Problem',
        category: 'perceptiongraph',
        color: '#f97316',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Raw', 'Generated by AI', 'Auto Picked randomly from user\'s data', 'Picked manually by the user from user\'s data', 'Answered by the user'] }
        ]
    },
    'Danger': {
        title: 'Danger',
        category: 'perceptiongraph',
        color: '#dc2626',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Raw', 'Generated by AI', 'Auto Picked randomly from user\'s data', 'Picked manually by the user from user\'s data', 'Answered by the user'] }
        ]
    },
    'Users input': {
        title: 'Users input',
        category: 'utility',
        color: '#8b5cf6',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'action', type: 'select', default: 'Answer', options: ['Answer', 'Generate'] }
        ]
    },
    // Social
    'Friends': {
        title: 'Friends',
        category: 'social',
        color: '#3b82f6',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' }
        ]
    },
    'Family': {
        title: 'Family',
        category: 'social',
        color: '#ec4899',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' }
        ]
    },
    'Coworkers': {
        title: 'Co-workers',
        category: 'social',
        color: '#f59e0b',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' }
        ]
    },
    'Lovers': {
        title: 'Lovers',
        category: 'social',
        color: '#dc2626',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' }
        ]
    },
    // Utility
    'Picture': {
        title: 'Picture',
        category: 'utility',
        color: '#8b5cf6',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'imageUrl', type: 'string', default: '' },
            { name: 'alt', type: 'text', default: '' }
        ]
    },
    'Text': {
        title: 'Text',
        category: 'utility',
        color: '#84cc16',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'content', type: 'text', default: '' },
            { name: 'title', type: 'string', default: '' }
        ]
    },
    'Video': {
        title: 'Video',
        category: 'utility',
        color: '#ef4444',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'videoUrl', type: 'string', default: '' },
            { name: 'description', type: 'text', default: '' }
        ]
    },
    'Terminal': {
        title: 'Terminal',
        category: 'utility',
        color: '#6366f1',
        inputs: [
            { name: 'input 1', type: DataTypes.ANY },
            { name: 'input 2', type: DataTypes.ANY },
            { name: 'input 3', type: DataTypes.ANY },
            { name: 'input 4', type: DataTypes.ANY },
            { name: 'input 5', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'command', type: 'text', default: '' },
            { name: 'output', type: 'text', default: '' }
        ]
    },
    'Prompt': {
        title: 'Prompt',
        category: 'utility',
        color: '#f97316',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'prompt', type: 'text', default: '' },
            { name: 'context', type: 'text', default: '' }
        ]
    },
    'Agent': {
        title: 'Agent',
        category: 'utility',
        color: '#3b82f6',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'image', type: 'string', default: '' },
            { name: 'progress', type: 'number', default: 0 },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Generated by the agent', 'Instructed with the prompt'] },
            { name: 'heroType', type: 'select', default: 'Hero', options: ['Hero', 'Mentor', 'Villain'] }
        ]
    },
    'Win Condition': {
        title: 'Win Condition',
        category: 'utility',
        color: '#22c55e',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Generated by AI', 'Instructed with the prompt'] }
        ]
    },
    'Lose Condition': {
        title: 'Lose Condition',
        category: 'utility',
        color: '#ef4444',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Generated by AI', 'Instructed with the prompt'] }
        ]
    },
    'Reward': {
        title: 'Reward',
        category: 'utility',
        color: '#eab308',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' },
            { name: 'dataSource', type: 'select', default: 'Not defined', options: ['Not defined', 'Generated by AI', 'Instructed with the prompt'] }
        ]
    },

    // Chat Node Types (Flux-inspired colors)
    'SystemMessage': {
        title: 'System',
        category: 'chat',
        color: '#F5C842',  // Soft yellow
        inputs: [],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: 'You are a helpful assistant.' }
        ]
    },
    'UserMessage': {
        title: 'User',
        category: 'chat',
        color: '#A9ABAE',
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' }
        ]
    },
    'GPTMessage': {
        title: 'Idea',
        category: 'chat',
        color: '#0284c7',  // Sky blue (matches sidebar)
        inputs: [
            { name: 'input', type: DataTypes.ANY }
        ],
        outputs: [
            { name: 'output', type: DataTypes.ANY }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' }
        ]
    }
};

// Category definitions
const NodeCategories = {
    'mindinventory': { title: 'Mind Inventory', icon: '💭' },
    'perceptiongraph': { title: 'Perception Graph', icon: '🧠' },
    'social': { title: 'Social', icon: '👥' },
    'utility': { title: 'Utility', icon: '🛠️' },
    'chat': { title: 'Chat', icon: '💬' }
};

// Get all nodes by category
function getNodesByCategory() {
    const categories = {};

    for (const [nodeType, definition] of Object.entries(NodeDefinitions)) {
        const category = definition.category || 'other';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push({
            type: nodeType,
            title: definition.title,
            category: category
        });
    }

    return categories;
}

// Search nodes
function searchNodes(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [nodeType, definition] of Object.entries(NodeDefinitions)) {
        if (definition.title.toLowerCase().includes(lowerQuery) ||
            nodeType.toLowerCase().includes(lowerQuery) ||
            definition.category.toLowerCase().includes(lowerQuery)) {
            results.push({
                type: nodeType,
                title: definition.title,
                category: definition.category
            });
        }
    }

    return results;
}
