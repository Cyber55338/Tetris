// Chat API Module - Claude API Integration
const chatAPI = {
    apiKey: '', // Set via localStorage or setApiKey()
    model: 'claude-3-haiku-20240307',

    setApiKey(key) {
        this.apiKey = key;
        try {
            localStorage.setItem('idea-engine-api-key', key);
        } catch (e) {
            console.error('Failed to save API key:', e);
        }
    },

    getApiKey() {
        if (!this.apiKey) {
            try {
                this.apiKey = localStorage.getItem('idea-engine-api-key');
            } catch (e) {
                console.error('Failed to load API key:', e);
            }
        }
        return this.apiKey;
    },

    clearApiKey() {
        this.apiKey = null;
        try {
            localStorage.removeItem('idea-engine-api-key');
        } catch (e) {
            console.error('Failed to clear API key:', e);
        }
    },

    async generateResponse(messages, temperature = 0.7) {
        const apiKey = this.getApiKey();

        if (!apiKey) {
            // Prompt for API key
            const key = prompt('Enter your Claude API key:\n\nYou can get one at console.anthropic.com');
            if (!key) {
                throw new Error('API key required');
            }
            this.setApiKey(key);
        }

        // Separate system message from conversation messages
        const systemMessage = messages.find(m => m.role === 'system');
        const conversationMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            }));

        // Ensure we have at least one message
        if (conversationMessages.length === 0) {
            throw new Error('No messages to send');
        }

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.getApiKey(),
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 1024,
                    temperature: temperature,
                    messages: conversationMessages,
                    system: systemMessage?.content || 'You are a helpful assistant.'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || `HTTP ${response.status}`;

                // Clear API key if unauthorized
                if (response.status === 401) {
                    this.clearApiKey();
                    throw new Error('Invalid API key. Please try again.');
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data.content[0]?.text || 'No response received';

        } catch (error) {
            console.error('Chat API error:', error);

            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error. Check your connection and CORS settings.');
            }

            throw error;
        }
    },

    // Set a different model
    setModel(modelId) {
        this.model = modelId;
    },

    // Get available models (for future use)
    getAvailableModels() {
        return [
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Fast)' },
            { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet (Balanced)' },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Powerful)' }
        ];
    }
};

// Make globally available
window.chatAPI = chatAPI;
