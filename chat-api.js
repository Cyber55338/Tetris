// Chat API Module - Multi-Provider AI Integration

// Provider definitions with their API endpoints and configuration
const AI_PROVIDERS = {
    anthropic: {
        id: 'anthropic',
        name: 'Anthropic',
        apiEndpoint: 'https://api.anthropic.com/v1/messages',
        storageKey: 'idea-engine-api-anthropic',
        icon: '🤖',
        keyHint: 'Get your key at console.anthropic.com',
        keyUrl: 'https://console.anthropic.com/settings/keys'
    },
    openai: {
        id: 'openai',
        name: 'OpenAI',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        storageKey: 'idea-engine-api-openai',
        icon: '🧠',
        keyHint: 'Get your key at platform.openai.com',
        keyUrl: 'https://platform.openai.com/api-keys'
    },
    google: {
        id: 'google',
        name: 'Google',
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        storageKey: 'idea-engine-api-google',
        icon: '🔷',
        keyHint: 'Get your key at aistudio.google.com',
        keyUrl: 'https://aistudio.google.com/apikey'
    },
    mistral: {
        id: 'mistral',
        name: 'Mistral',
        apiEndpoint: 'https://api.mistral.ai/v1/chat/completions',
        storageKey: 'idea-engine-api-mistral',
        icon: '🌀',
        keyHint: 'Get your key at console.mistral.ai',
        keyUrl: 'https://console.mistral.ai/api-keys'
    },
    deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
        storageKey: 'idea-engine-api-deepseek',
        icon: '🔍',
        keyHint: 'Get your key at platform.deepseek.com',
        keyUrl: 'https://platform.deepseek.com/api_keys'
    },
    llama: {
        id: 'llama',
        name: 'Llama',
        apiEndpoint: '',
        storageKey: 'idea-engine-api-llama',
        icon: '🦙',
        keyHint: 'Configure your Llama API endpoint',
        keyUrl: ''
    }
};

// Model definitions grouped by provider
const AI_MODELS = {
    anthropic: [
        { id: 'claude-3-5-haiku-latest', name: 'Haiku 3.5', tier: 'fast' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Sonnet 3.5', tier: 'balanced' },
        { id: 'claude-sonnet-4-20250514', name: 'Sonnet 4', tier: 'balanced' },
        { id: 'claude-opus-4-20250514', name: 'Opus 4', tier: 'powerful' },
        { id: 'claude-opus-4-5-20251101', name: 'Opus 4.5', tier: 'powerful' }
    ],
    openai: [
        { id: 'gpt-4o', name: 'GPT-4o', tier: 'powerful' },
        { id: 'gpt-4o-mini', name: 'GPT-4o-mini', tier: 'fast' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', tier: 'balanced' },
        { id: 'o1', name: 'o1', tier: 'reasoning' },
        { id: 'o1-mini', name: 'o1-mini', tier: 'reasoning' }
    ],
    google: [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tier: 'fast' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tier: 'powerful' }
    ],
    mistral: [
        { id: 'mistral-large-latest', name: 'Mistral Large', tier: 'powerful' },
        { id: 'mistral-small-latest', name: 'Mistral Small', tier: 'fast' }
    ],
    deepseek: [
        { id: 'deepseek-chat', name: 'DeepSeek Chat', tier: 'balanced' },
        { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', tier: 'reasoning' }
    ],
    llama: [
        { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', tier: 'powerful' },
        { id: 'llama-3.2-3b', name: 'Llama 3.2 3B', tier: 'fast' }
    ]
};

// Selected model storage key
const SELECTED_MODEL_KEY = 'idea-engine-selected-model';

// Chat API Module
const chatAPI = {
    // Current selected model
    selectedModel: null,
    selectedProvider: null,

    // Provider API keys (loaded from localStorage)
    providerKeys: {},

    // Legacy compatibility
    apiKey: null,
    model: 'claude-opus-4-5-20251101',

    // Initialize from localStorage
    init() {
        // Load provider keys
        Object.keys(AI_PROVIDERS).forEach(providerId => {
            const key = localStorage.getItem(AI_PROVIDERS[providerId].storageKey);
            if (key) {
                this.providerKeys[providerId] = key;
            }
        });

        // Load selected model
        const savedModel = localStorage.getItem(SELECTED_MODEL_KEY);
        if (savedModel) {
            try {
                const parsed = JSON.parse(savedModel);
                this.selectedModel = parsed.modelId;
                this.selectedProvider = parsed.providerId;
                this.model = parsed.modelId; // Legacy compatibility
            } catch (e) {
                // Default to Anthropic Opus 4.5
                this.selectedModel = 'claude-opus-4-5-20251101';
                this.selectedProvider = 'anthropic';
            }
        } else {
            this.selectedModel = 'claude-opus-4-5-20251101';
            this.selectedProvider = 'anthropic';
        }

        // Migration: move old key to new structure
        const oldKey = localStorage.getItem('idea-engine-api-key');
        if (oldKey && !this.providerKeys.anthropic) {
            this.setProviderKey('anthropic', oldKey);
            // Keep the old key for backwards compatibility but also use new structure
        }

        // API keys should be set via the Model Selector UI or localStorage
        // Do not hardcode API keys in source code

        // Set legacy apiKey for backwards compatibility
        this.apiKey = this.providerKeys.anthropic || oldKey || null;

        // Update model display on init
        setTimeout(() => this.updateModelDisplay(), 100);
    },

    // Set API key for a provider
    setProviderKey(providerId, key) {
        this.providerKeys[providerId] = key;
        const provider = AI_PROVIDERS[providerId];
        if (provider) {
            localStorage.setItem(provider.storageKey, key);
        }
        // Update legacy key if it's anthropic
        if (providerId === 'anthropic') {
            this.apiKey = key;
            localStorage.setItem('idea-engine-api-key', key);
        }
    },

    // Get API key for a provider
    getProviderKey(providerId) {
        return this.providerKeys[providerId] || null;
    },

    // Check if provider has API key configured
    hasProviderKey(providerId) {
        return !!this.providerKeys[providerId];
    },

    // Clear API key for a provider
    clearProviderKey(providerId) {
        delete this.providerKeys[providerId];
        const provider = AI_PROVIDERS[providerId];
        if (provider) {
            localStorage.removeItem(provider.storageKey);
        }
        if (providerId === 'anthropic') {
            this.apiKey = null;
        }
    },

    // Select a model
    selectModel(providerId, modelId) {
        this.selectedProvider = providerId;
        this.selectedModel = modelId;
        this.model = modelId; // Legacy compatibility
        localStorage.setItem(SELECTED_MODEL_KEY, JSON.stringify({
            providerId,
            modelId
        }));

        // Update UI
        this.updateModelDisplay();
    },

    // Update the toolbar button display
    updateModelDisplay() {
        const displayEl = document.querySelector('.model-name-display');
        const buttonEl = document.getElementById('btn-model-selector');

        if (displayEl && this.selectedModel) {
            const models = AI_MODELS[this.selectedProvider] || [];
            const model = models.find(m => m.id === this.selectedModel);
            displayEl.textContent = model ? model.name : 'Model';
        }

        // Update connected state (show checkmark if provider has API key)
        if (buttonEl) {
            if (this.hasProviderKey(this.selectedProvider)) {
                buttonEl.classList.add('connected');
            } else {
                buttonEl.classList.remove('connected');
            }
        }
    },

    // Get current API key (for selected provider) - Legacy compatibility
    getApiKey() {
        if (this.selectedProvider) {
            return this.getProviderKey(this.selectedProvider);
        }
        // Fallback to old behavior
        if (!this.apiKey) {
            try {
                this.apiKey = localStorage.getItem('idea-engine-api-key');
            } catch (e) {
                console.error('Failed to load API key:', e);
            }
        }
        return this.apiKey;
    },

    // Legacy compatibility
    setApiKey(key) {
        if (this.selectedProvider) {
            this.setProviderKey(this.selectedProvider, key);
        } else {
            this.apiKey = key;
            try {
                localStorage.setItem('idea-engine-api-key', key);
            } catch (e) {
                console.error('Failed to save API key:', e);
            }
        }
    },

    clearApiKey() {
        if (this.selectedProvider) {
            this.clearProviderKey(this.selectedProvider);
        } else {
            this.apiKey = null;
            try {
                localStorage.removeItem('idea-engine-api-key');
            } catch (e) {
                console.error('Failed to clear API key:', e);
            }
        }
    },

    // Get all available models
    getAvailableModels() {
        return AI_MODELS;
    },

    // Get all providers
    getProviders() {
        return AI_PROVIDERS;
    },

    // Set a different model - Legacy compatibility
    setModel(modelId) {
        this.model = modelId;
        this.selectedModel = modelId;
    },

    // Generate response using selected provider
    async generateResponse(messages, temperature = 1.0) {
        const apiKey = this.getApiKey();

        if (!apiKey) {
            // Show API key modal if modelSelector is available
            if (window.modelSelector) {
                window.modelSelector.showApiKeyModal(this.selectedProvider, this.selectedModel);
                throw new Error('API key required');
            }
            // Fallback to prompt
            const key = prompt(`Enter your ${AI_PROVIDERS[this.selectedProvider]?.name || 'API'} key:`);
            if (!key) {
                throw new Error('API key required');
            }
            this.setApiKey(key);
        }

        // Route to appropriate provider handler
        try {
            switch (this.selectedProvider) {
                case 'anthropic':
                    return await this.callAnthropic(messages, temperature);
                case 'openai':
                    return await this.callOpenAI(messages, temperature);
                case 'google':
                    return await this.callGoogle(messages, temperature);
                case 'mistral':
                    return await this.callMistral(messages, temperature);
                case 'deepseek':
                    return await this.callDeepSeek(messages, temperature);
                default:
                    // Default to Anthropic for backwards compatibility
                    return await this.callAnthropic(messages, temperature);
            }
        } catch (error) {
            console.error('Chat API error:', error);
            throw error;
        }
    },

    // Anthropic API call
    async callAnthropic(messages, temperature) {
        const apiKey = this.getProviderKey('anthropic') || this.apiKey;

        const systemMessage = messages.find(m => m.role === 'system');
        const conversationMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            }));

        if (conversationMessages.length === 0) {
            throw new Error('No messages to send');
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: this.selectedModel || this.model,
                max_tokens: 1024,
                temperature: temperature,
                messages: conversationMessages,
                system: systemMessage?.content || 'You are a helpful assistant.'
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 401) {
                this.clearProviderKey('anthropic');
                throw new Error('Invalid API key. Please try again.');
            }
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.content[0]?.text || 'No response received';
    },

    // OpenAI API call
    async callOpenAI(messages, temperature) {
        const apiKey = this.getProviderKey('openai');

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: this.selectedModel,
                messages: messages,
                temperature: temperature,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 401) {
                this.clearProviderKey('openai');
                throw new Error('Invalid API key. Please try again.');
            }
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response received';
    },

    // Google Gemini API call
    async callGoogle(messages, temperature) {
        const apiKey = this.getProviderKey('google');

        // Convert messages to Google format
        const contents = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        const systemInstruction = messages.find(m => m.role === 'system');

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${this.selectedModel}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
                    generationConfig: {
                        temperature,
                        maxOutputTokens: 1024
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 401 || response.status === 403) {
                this.clearProviderKey('google');
                throw new Error('Invalid API key. Please try again.');
            }
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received';
    },

    // Mistral API call
    async callMistral(messages, temperature) {
        const apiKey = this.getProviderKey('mistral');

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: this.selectedModel,
                messages: messages,
                temperature: temperature,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 401) {
                this.clearProviderKey('mistral');
                throw new Error('Invalid API key. Please try again.');
            }
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response received';
    },

    // DeepSeek API call
    async callDeepSeek(messages, temperature) {
        const apiKey = this.getProviderKey('deepseek');

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: this.selectedModel,
                messages: messages,
                temperature: temperature,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 401) {
                this.clearProviderKey('deepseek');
                throw new Error('Invalid API key. Please try again.');
            }
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response received';
    }
};

// Initialize on load
chatAPI.init();

// Make globally available
window.chatAPI = chatAPI;
window.AI_PROVIDERS = AI_PROVIDERS;
window.AI_MODELS = AI_MODELS;
