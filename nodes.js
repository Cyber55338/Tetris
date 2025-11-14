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
        node.properties = data.properties || {};
        return node;
    }
}

// Node Definitions
const NodeDefinitions = {
    // Loaders
    'CheckpointLoader': {
        title: 'Load Checkpoint',
        category: 'loaders',
        color: '#f59e0b',
        inputs: [],
        outputs: [
            { name: 'MODEL', type: DataTypes.MODEL },
            { name: 'CLIP', type: DataTypes.CLIP },
            { name: 'VAE', type: DataTypes.VAE }
        ],
        properties: [
            { name: 'checkpoint_name', type: 'string', default: 'model.safetensors' }
        ]
    },
    'VAELoader': {
        title: 'Load VAE',
        category: 'loaders',
        color: '#ef4444',
        inputs: [],
        outputs: [
            { name: 'VAE', type: DataTypes.VAE }
        ],
        properties: [
            { name: 'vae_name', type: 'string', default: 'vae.safetensors' }
        ]
    },
    'LoraLoader': {
        title: 'Load LoRA',
        category: 'loaders',
        color: '#f59e0b',
        inputs: [
            { name: 'MODEL', type: DataTypes.MODEL },
            { name: 'CLIP', type: DataTypes.CLIP }
        ],
        outputs: [
            { name: 'MODEL', type: DataTypes.MODEL },
            { name: 'CLIP', type: DataTypes.CLIP }
        ],
        properties: [
            { name: 'lora_name', type: 'string', default: 'lora.safetensors' },
            { name: 'strength_model', type: 'number', default: 1.0 },
            { name: 'strength_clip', type: 'number', default: 1.0 }
        ]
    },

    // Conditioning
    'CLIPTextEncode': {
        title: 'CLIP Text Encode (Prompt)',
        category: 'conditioning',
        color: '#10b981',
        inputs: [
            { name: 'CLIP', type: DataTypes.CLIP }
        ],
        outputs: [
            { name: 'CONDITIONING', type: DataTypes.CONDITIONING }
        ],
        properties: [
            { name: 'text', type: 'text', default: 'a beautiful landscape' }
        ]
    },

    // Sampling
    'KSampler': {
        title: 'KSampler',
        category: 'sampling',
        color: '#ec4899',
        inputs: [
            { name: 'MODEL', type: DataTypes.MODEL },
            { name: 'positive', type: DataTypes.CONDITIONING },
            { name: 'negative', type: DataTypes.CONDITIONING },
            { name: 'latent_image', type: DataTypes.LATENT }
        ],
        outputs: [
            { name: 'LATENT', type: DataTypes.LATENT }
        ],
        properties: [
            { name: 'seed', type: 'number', default: 0 },
            { name: 'steps', type: 'number', default: 20 },
            { name: 'cfg', type: 'number', default: 7.0 },
            { name: 'sampler_name', type: 'select', default: 'euler', options: ['euler', 'euler_a', 'dpm_2', 'dpm_2_a'] },
            { name: 'scheduler', type: 'select', default: 'normal', options: ['normal', 'karras', 'exponential'] },
            { name: 'denoise', type: 'number', default: 1.0 }
        ]
    },

    // Latent
    'EmptyLatentImage': {
        title: 'Empty Latent Image',
        category: 'latent',
        color: '#ec4899',
        inputs: [],
        outputs: [
            { name: 'LATENT', type: DataTypes.LATENT }
        ],
        properties: [
            { name: 'width', type: 'number', default: 512 },
            { name: 'height', type: 'number', default: 512 },
            { name: 'batch_size', type: 'number', default: 1 }
        ]
    },
    'VAEDecode': {
        title: 'VAE Decode',
        category: 'latent',
        color: '#ef4444',
        inputs: [
            { name: 'samples', type: DataTypes.LATENT },
            { name: 'VAE', type: DataTypes.VAE }
        ],
        outputs: [
            { name: 'IMAGE', type: DataTypes.IMAGE }
        ],
        properties: []
    },
    'VAEEncode': {
        title: 'VAE Encode',
        category: 'latent',
        color: '#ef4444',
        inputs: [
            { name: 'pixels', type: DataTypes.IMAGE },
            { name: 'VAE', type: DataTypes.VAE }
        ],
        outputs: [
            { name: 'LATENT', type: DataTypes.LATENT }
        ],
        properties: []
    },

    // Image
    'LoadImage': {
        title: 'Load Image',
        category: 'image',
        color: '#8b5cf6',
        inputs: [],
        outputs: [
            { name: 'IMAGE', type: DataTypes.IMAGE }
        ],
        properties: [
            { name: 'image', type: 'string', default: 'image.png' }
        ]
    },
    'SaveImage': {
        title: 'Save Image',
        category: 'image',
        color: '#8b5cf6',
        inputs: [
            { name: 'images', type: DataTypes.IMAGE }
        ],
        outputs: [],
        properties: [
            { name: 'filename_prefix', type: 'string', default: 'ComfyUI' }
        ]
    },
    'ImageScale': {
        title: 'Scale Image',
        category: 'image',
        color: '#8b5cf6',
        inputs: [
            { name: 'image', type: DataTypes.IMAGE }
        ],
        outputs: [
            { name: 'IMAGE', type: DataTypes.IMAGE }
        ],
        properties: [
            { name: 'width', type: 'number', default: 512 },
            { name: 'height', type: 'number', default: 512 },
            { name: 'method', type: 'select', default: 'lanczos', options: ['nearest', 'bilinear', 'bicubic', 'lanczos'] }
        ]
    },

    // Math & Logic
    'MathOperation': {
        title: 'Math',
        category: 'math',
        color: '#6366f1',
        inputs: [
            { name: 'a', type: DataTypes.NUMBER },
            { name: 'b', type: DataTypes.NUMBER }
        ],
        outputs: [
            { name: 'result', type: DataTypes.NUMBER }
        ],
        properties: [
            { name: 'operation', type: 'select', default: 'add', options: ['add', 'subtract', 'multiply', 'divide'] }
        ]
    },
    'NumberConstant': {
        title: 'Number',
        category: 'math',
        color: '#6366f1',
        inputs: [],
        outputs: [
            { name: 'value', type: DataTypes.NUMBER }
        ],
        properties: [
            { name: 'value', type: 'number', default: 0 }
        ]
    },
    'StringConstant': {
        title: 'String',
        category: 'utils',
        color: '#84cc16',
        inputs: [],
        outputs: [
            { name: 'text', type: DataTypes.STRING }
        ],
        properties: [
            { name: 'text', type: 'text', default: '' }
        ]
    }
};

// Category definitions
const NodeCategories = {
    'loaders': { title: 'Loaders', icon: '📁' },
    'conditioning': { title: 'Conditioning', icon: '📝' },
    'sampling': { title: 'Sampling', icon: '🎨' },
    'latent': { title: 'Latent', icon: '🔲' },
    'image': { title: 'Image', icon: '🖼️' },
    'math': { title: 'Math', icon: '🔢' },
    'utils': { title: 'Utils', icon: '🔧' }
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
