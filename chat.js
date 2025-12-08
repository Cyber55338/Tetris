// Chat Mode Module - Flux-style Conversational AI Tree Interface
const CHAT_SESSIONS_KEY = 'idea-engine-chat-sessions';
const CHAT_SETTINGS_KEY = 'idea-engine-chat-settings';
const CHAT_GAMIFICATION_KEY = 'idea-engine-chat-gamification';

let chatMode = false;
let previousDesignFlowStateChat = null;
let selectedChatNodeId = null;
let chatSettings = {
    temperature: 0.7,
    numResponses: 3
};

// Session management
let chatSessions = []; // Array of { id, title, nodes, connections, createdAt, updatedAt }
let currentSessionId = null;
let contextMenuSessionId = null; // For right-click context menu

// Gamification state
let chatGamification = {
    thinkingLevel: 0,       // Current display level (for current tree)
    thinkingMode: 'initial', // 'initial' | 'divergent' | 'convergent'
    streak: 0,              // Compose answer streak
    totalComposes: 0,       // Total compose actions
    lastComposeDate: null
};

// Track max level per tree (key = root SystemMessage node ID, value = max level reached)
let treeLevels = {};

// Track gold per tree (key = root node ID, value = { gold, lastThreshold })
let treeGold = {};

// ============ GAMIFICATION FUNCTIONS ============
function loadGamification() {
    try {
        const stored = localStorage.getItem(CHAT_GAMIFICATION_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Migration: convert old binary level to new structure
            if (parsed.level !== undefined && parsed.thinkingMode === undefined) {
                parsed.thinkingLevel = 0;
                parsed.thinkingMode = 'initial';
                delete parsed.level;
            }
            chatGamification = { ...chatGamification, ...parsed };
        }
    } catch (e) {
        console.error('Failed to load gamification data:', e);
    }
}

function saveGamification() {
    try {
        localStorage.setItem(CHAT_GAMIFICATION_KEY, JSON.stringify(chatGamification));
    } catch (e) {
        console.error('Failed to save gamification data:', e);
    }
}

function showGamificationUI() {
    const container = document.getElementById('chat-gamification');
    if (container) {
        container.classList.add('visible');
        updateGamificationDisplay();
    }
}

function hideGamificationUI() {
    const container = document.getElementById('chat-gamification');
    if (container) {
        container.classList.remove('visible');
    }
}

function updateGamificationDisplay() {
    const labelEl = document.getElementById('thinking-label');
    const levelEl = document.getElementById('thinking-level');

    if (labelEl) {
        // Three-state label: initial, divergent, convergent
        switch (chatGamification.thinkingMode) {
            case 'initial':
                labelEl.textContent = 'Thinking';
                break;
            case 'divergent':
                labelEl.textContent = 'Divergent Thinking';
                break;
            case 'convergent':
                labelEl.textContent = 'Convergent Thinking';
                break;
            default:
                labelEl.textContent = 'Thinking';
        }
    }
    if (levelEl) {
        const displayLevel = chatGamification.thinkingLevel || 0;
        levelEl.textContent = displayLevel > 0 ? `Level ${displayLevel}` : '';
        levelEl.classList.toggle('convergent', chatGamification.thinkingMode === 'convergent');
    }
}

function incrementStreak() {
    chatGamification.streak++;
    chatGamification.totalComposes++;
    chatGamification.lastComposeDate = new Date().toISOString();
    updateGamificationDisplay();
    saveGamification();
}

// Show "Level X Thinking" popup centered on canvas
function showLevelUpOverlay(level) {
    let overlay = document.getElementById('level-up-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'level-up-overlay';
        overlay.className = 'level-up-overlay';
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer) {
            canvasContainer.appendChild(overlay);
        }
    }

    overlay.innerHTML = `
        <div class="level-up-text">Level ${level}</div>
        <div class="level-up-subtext">Thinking</div>
    `;

    // Trigger animation
    overlay.classList.remove('fade-out');
    overlay.classList.add('visible');

    // Fade out after 2 seconds
    setTimeout(() => {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.classList.remove('visible', 'fade-out');
        }, 500);
    }, 2000);
}

// Transition to divergent thinking mode (on 2+ response generation)
// Now tracks per-tree and shows level-up only when NEW level is reached for that tree
function transitionToDivergentThinking() {
    if (!selectedChatNodeId) return;

    const rootId = getTreeRootId(selectedChatNodeId);
    if (!rootId) return;

    // Calculate what level we're at now (based on current lineage position)
    const lineage = getNodeLineage(selectedChatNodeId);
    const currentPositionLevel = lineage.filter(n =>
        n.type === 'UserMessage' && n.properties?.text?.trim()
    ).length;

    // Get the tree's current max level
    const previousMaxLevel = getTreeLevel(rootId);

    // If this is a NEW level for this tree, celebrate!
    if (currentPositionLevel > previousMaxLevel) {
        // Update the tree's max level
        updateTreeLevel(rootId, currentPositionLevel);

        // Show level-up overlay first
        showLevelUpOverlay(currentPositionLevel);

        // Check for gold reward AFTER level popup finishes (2.5s delay)
        setTimeout(() => {
            checkAndAwardGold(rootId, currentPositionLevel);
        }, 2600);
    }

    // Always update display to divergent mode
    chatGamification.thinkingLevel = getTreeLevel(rootId);
    chatGamification.thinkingMode = 'divergent';
    updateGamificationDisplay();
    updateRewardBarDisplay();
    saveGamification();
}

// Transition to convergent thinking mode (on compose)
function transitionToConvergentThinking() {
    chatGamification.thinkingMode = 'convergent';
    updateGamificationDisplay();
    saveGamification();
}

// Initialize thinking state for new trees/sessions
function initializeThinkingState() {
    chatGamification.thinkingMode = 'initial';
    chatGamification.thinkingLevel = 0;
    updateGamificationDisplay();
    saveGamification();
}

// Get root node (SystemMessage) of a tree from any node in the lineage
function getTreeRootId(nodeId) {
    if (!nodeId) return null;
    const lineage = getNodeLineage(nodeId);
    if (lineage.length === 0) return null;
    // Root is the first node in lineage (should be SystemMessage)
    return lineage[0].id;
}

// Calculate the full tree level by finding the deepest path from root
// Level = count of compose cycles (user messages with content after first)
function calculateTreeMaxLevel(rootId) {
    if (!rootId || !app?.canvasRenderer) return 0;

    // Find all nodes connected to this tree
    const allNodes = app.canvasRenderer.nodes;
    const connections = app.connectionManager.connections;

    // BFS/DFS to find all UserMessage nodes in this tree
    const visited = new Set();
    const queue = [rootId];
    let maxUserMessages = 0;

    // For each leaf, count user messages in its lineage
    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        // Find children (nodes where this is the output)
        const children = connections
            .filter(c => c.outputNode.id === currentId)
            .map(c => c.inputNode.id);

        if (children.length === 0) {
            // This is a leaf - count user messages in its lineage
            const lineage = getNodeLineage(currentId);
            const userMsgCount = lineage.filter(n =>
                n.type === 'UserMessage' && n.properties?.text?.trim()
            ).length;
            maxUserMessages = Math.max(maxUserMessages, userMsgCount);
        } else {
            children.forEach(childId => queue.push(childId));
        }
    }

    return maxUserMessages;
}

// Get or calculate max level for a tree
function getTreeLevel(rootId) {
    if (!rootId) return 0;
    // If we have a stored max, use it; otherwise calculate
    if (treeLevels[rootId] !== undefined) {
        return treeLevels[rootId];
    }
    // Calculate from tree structure
    const calculated = calculateTreeMaxLevel(rootId);
    treeLevels[rootId] = calculated;
    return calculated;
}

// Update tree level (only increases, never decreases)
function updateTreeLevel(rootId, newLevel) {
    if (!rootId) return;
    const currentMax = treeLevels[rootId] || 0;
    if (newLevel > currentMax) {
        treeLevels[rootId] = newLevel;
        // Save to session
        saveTreeLevels();
    }
}

// Save tree levels to current session
function saveTreeLevels() {
    if (!currentSessionId) return;
    const session = chatSessions.find(s => s.id === currentSessionId);
    if (session) {
        session.treeLevels = { ...treeLevels };
        saveChatSessions();
    }
}

// Load tree levels from session
function loadTreeLevels(session) {
    if (session && session.treeLevels) {
        treeLevels = { ...session.treeLevels };
    } else {
        treeLevels = {};
    }
}

// Helper to update level display for current tree (shows max level, never goes down)
function updateLevelForCurrentTree() {
    if (!selectedChatNodeId) {
        chatGamification.thinkingLevel = 0;
        chatGamification.thinkingMode = 'initial';
    } else {
        const rootId = getTreeRootId(selectedChatNodeId);
        const maxLevel = getTreeLevel(rootId);
        chatGamification.thinkingLevel = maxLevel;
        chatGamification.thinkingMode = maxLevel > 0 ? 'divergent' : 'initial';
    }
    updateGamificationDisplay();
    updateRewardBarDisplay();
}

// ============ GOLD REWARD SYSTEM ============

// Calculate next gold threshold based on current level
function getNextThreshold(level) {
    if (level < 100) {
        return Math.ceil((level + 1) / 10) * 10;  // 10, 20, 30... 100
    } else {
        return Math.ceil((level + 1) / 100) * 100;  // 200, 300... 1000
    }
}

// Calculate previous threshold (for progress bar calculation)
function getPreviousThreshold(level) {
    if (level < 10) return 0;
    if (level <= 100) return Math.floor(level / 10) * 10;
    return Math.floor(level / 100) * 100;
}

// Get gold data for a tree
function getTreeGold(rootId) {
    if (!rootId) return { gold: 0, lastThreshold: 0 };
    return treeGold[rootId] || { gold: 0, lastThreshold: 0 };
}

// Save tree gold to session
function saveTreeGold() {
    if (!currentSessionId) return;
    const session = chatSessions.find(s => s.id === currentSessionId);
    if (session) {
        session.treeGold = { ...treeGold };
        saveChatSessions();
    }
}

// Load tree gold from session
function loadTreeGold(session) {
    if (session && session.treeGold) {
        treeGold = { ...session.treeGold };
    } else {
        treeGold = {};
    }
}

// Update reward bar display based on current tree's level
function updateRewardBarDisplay() {
    const fillEl = document.getElementById('reward-bar-fill');
    const iconEl = document.getElementById('reward-bar-icon');
    const textEl = document.getElementById('reward-bar-text');
    const goldEl = document.getElementById('reward-bar-gold');
    if (!fillEl || !iconEl) return;

    const rootId = getTreeRootId(selectedChatNodeId);
    const level = getTreeLevel(rootId);

    const prevThreshold = getPreviousThreshold(level);
    const nextThreshold = getNextThreshold(level);
    const range = nextThreshold - prevThreshold;
    const progress = range > 0 ? ((level - prevThreshold) / range) * 100 : 0;

    fillEl.style.width = `${Math.min(progress, 100)}%`;

    // Update progress text (e.g., "5/10 levels")
    if (textEl) {
        textEl.textContent = `${level}/${nextThreshold} levels`;
    }

    // Update gold amount display
    const goldAmount = nextThreshold <= 100 ? 100 : 1000;
    if (goldEl) {
        goldEl.textContent = `+${goldAmount}`;
    }

    // Show chest when at a threshold level
    const isAtThreshold = (level > 0 && level <= 100 && level % 10 === 0) ||
                          (level > 100 && level % 100 === 0);

    if (isAtThreshold) {
        iconEl.textContent = '📦';
        iconEl.classList.add('chest');
        fillEl.classList.add('full');
    } else {
        iconEl.textContent = '🪙';
        iconEl.classList.remove('chest');
        fillEl.classList.remove('full');
    }
}

// Show gold reward popup on canvas
function showGoldRewardOverlay(gold) {
    let overlay = document.getElementById('gold-reward-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'gold-reward-overlay';
        overlay.className = 'gold-reward-overlay';
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer) {
            canvasContainer.appendChild(overlay);
        }
    }

    overlay.innerHTML = `
        <div class="gold-reward-text">+${gold} 🪙</div>
        <div class="gold-reward-subtext">Gold Earned!</div>
    `;

    // Trigger animation
    overlay.classList.remove('fade-out');
    overlay.classList.add('visible');

    // Fade out after 2 seconds
    setTimeout(() => {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.classList.remove('visible', 'fade-out');
        }, 500);
    }, 2000);
}

// Check if level reached a new threshold and award gold
function checkAndAwardGold(rootId, newLevel) {
    if (!rootId || newLevel <= 0) return;

    const treeData = treeGold[rootId] || { gold: 0, lastThreshold: 0 };

    // Calculate what threshold this level should trigger
    let thresholdToCheck;
    if (newLevel <= 100) {
        thresholdToCheck = Math.floor(newLevel / 10) * 10;
    } else {
        thresholdToCheck = Math.floor(newLevel / 100) * 100;
    }

    // Only award if we've reached a new threshold beyond last awarded
    if (thresholdToCheck > treeData.lastThreshold && thresholdToCheck > 0) {
        // Award gold for this threshold
        const goldAmount = thresholdToCheck <= 100 ? 100 : 1000;
        treeData.gold += goldAmount;
        treeData.lastThreshold = thresholdToCheck;
        treeGold[rootId] = treeData;

        // Show celebration popup
        showGoldRewardOverlay(goldAmount);

        // Save to session
        saveTreeGold();
    }
}

// Typewriter effect for streaming text appearance
let chatTypewriterIntervalId = null;

function typewriterEffect(text, element, speed = 15) {
    return new Promise((resolve) => {
        // Clear any existing typewriter
        if (chatTypewriterIntervalId) {
            clearInterval(chatTypewriterIntervalId);
        }

        element.textContent = '';
        element.classList.remove('generating');
        let i = 0;

        chatTypewriterIntervalId = setInterval(() => {
            if (i < text.length) {
                element.textContent += text[i];
                i++;
                // Auto-scroll sidebar as text appears
                const container = document.getElementById('chat-conversation');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            } else {
                clearInterval(chatTypewriterIntervalId);
                chatTypewriterIntervalId = null;
                resolve();
            }
        }, speed);
    });
}

// ============ INITIALIZATION ============
function initChat() {
    loadChatSessions();
    loadChatSettings();
    loadGamification();
    setupChatEventListeners();
    // Note: renderChatHistory() is called in enterChatMode() when DOM is ready
}

function loadChatSettings() {
    try {
        const stored = localStorage.getItem(CHAT_SETTINGS_KEY);
        if (stored) {
            chatSettings = { ...chatSettings, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to load chat settings:', e);
    }
}

function saveChatSettings() {
    try {
        localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(chatSettings));
    } catch (e) {
        console.error('Failed to save chat settings:', e);
    }
}

// ============ TREE COUNT ============
// Count trees on canvas (SystemMessage nodes without parents = root nodes)
function countTrees() {
    if (!app?.canvasRenderer || !app?.connectionManager) return 0;

    const nodes = app.canvasRenderer.nodes;
    const connections = app.connectionManager.connections;

    // Find SystemMessage nodes that have no parent connection (root nodes)
    const rootNodes = nodes.filter(node => {
        if (node.type !== 'SystemMessage') return false;
        // Check if any connection points to this node as input
        const hasParent = connections.some(c => c.inputNode.id === node.id);
        return !hasParent;
    });

    return rootNodes.length;
}

// Update tree count display
function updateTreeCount() {
    const treesEl = document.getElementById('canvas-trees');
    if (treesEl) {
        treesEl.textContent = `Trees: ${countTrees()}`;
    }
}

// ============ MODE SWITCHING ============
function enterChatMode() {
    // Exit other modes first if active
    if (typeof journalMode !== 'undefined' && journalMode && typeof exitJournalMode === 'function') {
        exitJournalMode();
    }
    if (typeof isAgentMode === 'function' && isAgentMode() && typeof resetAgentModeState === 'function') {
        // Don't call exitAgentMode() as it will re-activate Design Flow
        // Just reset agent mode state
        resetAgentModeState();
    }
    if (typeof isTasksMode === 'function' && isTasksMode() && typeof resetTasksModeState === 'function') {
        resetTasksModeState();
    }

    // Hide tasks view container and section
    const tasksView = document.getElementById('tasks-view-container');
    const tasksSection = document.getElementById('tasks-section');
    if (tasksView) tasksView.style.display = 'none';
    if (tasksSection) tasksSection.style.display = 'none';
    document.getElementById('tasks-header')?.classList.remove('active');

    chatMode = true;

    // Add body class for wider panel
    document.body.classList.add('chat-mode-active');

    // Save Design Flow state
    if (typeof app !== 'undefined' && app.canvasRenderer && app.connectionManager) {
        previousDesignFlowStateChat = {
            nodes: app.canvasRenderer.nodes.map(node => node.toJSON()),
            connections: app.connectionManager.connections.map(conn => ({
                output: { nodeId: conn.outputNode.id, index: conn.outputIndex },
                input: { nodeId: conn.inputNode.id, index: conn.inputIndex }
            }))
        };
    }

    // Expand sidebar if collapsed
    const sidebar = document.getElementById('node-library');
    if (sidebar && sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        if (typeof app !== 'undefined' && app.canvasRenderer) {
            app.canvasRenderer.resizeCanvas();
        }
    }

    // Update headers
    document.getElementById('chat-header')?.classList.add('active');
    document.getElementById('journals-header')?.classList.remove('active');
    document.getElementById('design-flow-header')?.classList.remove('active');
    document.getElementById('agent-header')?.classList.remove('active');

    // Switch sections
    const designFlowSection = document.getElementById('design-flow-section');
    const journalsSection = document.getElementById('journals-section');
    const chatSection = document.getElementById('chat-section');
    const agentSection = document.getElementById('agent-section');

    if (designFlowSection) designFlowSection.style.display = 'none';
    if (journalsSection) journalsSection.style.display = 'none';
    if (agentSection) agentSection.style.display = 'none';
    if (chatSection) chatSection.style.display = 'flex';

    // Hide workflow buttons
    ['btn-execute', 'btn-simulate', 'btn-send'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Rename toolbar buttons for chat mode
    const btnNew = document.getElementById('btn-new');
    const btnSave = document.getElementById('btn-save');
    const btnClear = document.getElementById('btn-clear');
    if (btnNew) btnNew.lastChild.textContent = ' New Session';
    if (btnSave) btnSave.lastChild.textContent = ' Download';
    if (btnClear) btnClear.lastChild.textContent = ' Delete';

    // Override btn-new to create new session (not just clear canvas)
    if (btnNew) {
        btnNew._chatModeHandler = () => {
            createNewSession();
        };
        btnNew.addEventListener('click', btnNew._chatModeHandler);
    }

    // Add chat-specific toolbar buttons
    addChatToolbarButtons();

    // Clear watermark in chat mode
    const watermark = document.getElementById('canvas-watermark');
    if (watermark) watermark.textContent = '';

    // Show gamification UI (level will be set by loadChatTreeToCanvas)
    showGamificationUI();

    // Show reward bar at bottom of canvas
    const rewardBar = document.getElementById('reward-bar-bottom');
    if (rewardBar) rewardBar.classList.add('visible');

    // Hide X/Y coords, show tree count in chat mode
    const coordsEl = document.getElementById('canvas-coords');
    const treesEl = document.getElementById('canvas-trees');
    if (coordsEl) coordsEl.style.display = 'none';
    if (treesEl) treesEl.style.display = 'inline';
    updateTreeCount();

    const lottieContainer = document.getElementById('canvas-mode-lottie');
    if (lottieContainer && typeof lottie !== 'undefined') {
        // Destroy previous animation if exists
        if (window.canvasModeLottie) {
            window.canvasModeLottie.destroy();
        }
        lottieContainer.innerHTML = '';
        window.canvasModeLottie = lottie.loadAnimation({
            container: lottieContainer,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: 'assets/idea.json'
        });
    }

    // Load chat tree onto canvas FIRST (creates/loads session)
    loadChatTreeToCanvas();

    // Render chat history sidebar AFTER session is loaded
    renderChatHistory();

    // Transform properties panel to chat interface
    showChatPanel();

    // Rename Properties header to "Chat Tree"
    const propertiesHeader = document.querySelector('#properties-panel .sidebar-header h2');
    if (propertiesHeader) propertiesHeader.textContent = 'Chat Tree';

    // Resize canvas for wider panel
    if (typeof app !== 'undefined' && app.canvasRenderer) {
        setTimeout(() => app.canvasRenderer.resizeCanvas(), 50);
    }

}

function exitChatMode() {
    if (!chatMode) return;

    // Save chat tree before exiting
    saveChatTreeData();
    chatMode = false;

    // Hide gamification UI
    hideGamificationUI();

    // Hide reward bar
    const rewardBar = document.getElementById('reward-bar-bottom');
    if (rewardBar) rewardBar.classList.remove('visible');

    // Show X/Y coords, hide tree count when leaving chat mode
    const coordsEl = document.getElementById('canvas-coords');
    const treesEl = document.getElementById('canvas-trees');
    if (coordsEl) coordsEl.style.display = 'inline';
    if (treesEl) treesEl.style.display = 'none';

    // Destroy lottie animation (only visible in chat mode)
    if (window.canvasModeLottie) {
        window.canvasModeLottie.destroy();
        window.canvasModeLottie = null;
    }
    const lottieContainer = document.getElementById('canvas-mode-lottie');
    if (lottieContainer) lottieContainer.innerHTML = '';

    // Remove body class
    document.body.classList.remove('chat-mode-active');

    // Update headers - only remove chat-header active
    document.getElementById('chat-header')?.classList.remove('active');

    // Hide chat section
    const chatSection = document.getElementById('chat-section');
    if (chatSection) chatSection.style.display = 'none';

    // Restore toolbar button texts
    const btnNew = document.getElementById('btn-new');
    const btnSave = document.getElementById('btn-save');
    const btnClear = document.getElementById('btn-clear');
    if (btnNew) btnNew.lastChild.textContent = ' New';
    if (btnSave) btnSave.lastChild.textContent = ' Save';
    if (btnClear) btnClear.lastChild.textContent = ' Clear';

    // Remove chat mode handler from btn-new
    if (btnNew && btnNew._chatModeHandler) {
        btnNew.removeEventListener('click', btnNew._chatModeHandler);
        delete btnNew._chatModeHandler;
    }

    // Remove chat-specific toolbar buttons
    removeChatToolbarButtons();

    // Only restore Design Flow state if NOT entering Journal mode
    // (Journal mode will set up its own state)
    const isEnteringJournals = typeof journalMode !== 'undefined' && journalMode;

    if (!isEnteringJournals) {
        // Set Design Flow as active
        document.getElementById('design-flow-header')?.classList.add('active');

        // Show Design Flow section
        const designFlowSection = document.getElementById('design-flow-section');
        if (designFlowSection) designFlowSection.style.display = 'flex';

        // Show workflow buttons
        ['btn-execute', 'btn-simulate', 'btn-send'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'flex';
        });

        // Restore watermark (no text - animation only in chat mode)
        const watermark = document.getElementById('canvas-watermark');
        if (watermark) watermark.textContent = '';

        // Note: Lottie animation only shows in Chat mode (gamification)
        // No animation loading for Design Flow mode

        // Restore Design Flow canvas
        if (previousDesignFlowStateChat && typeof app !== 'undefined' && app.canvasRenderer && app.connectionManager) {
            app.canvasRenderer.nodes = [];
            app.connectionManager.connections = [];

            previousDesignFlowStateChat.nodes.forEach(nodeData => {
                const node = Node.fromJSON(nodeData);
                app.canvasRenderer.nodes.push(node);
            });

            previousDesignFlowStateChat.connections.forEach(connData => {
                const outputNode = app.canvasRenderer.nodes.find(n => n.id === connData.output.nodeId);
                const inputNode = app.canvasRenderer.nodes.find(n => n.id === connData.input.nodeId);
                if (outputNode && inputNode) {
                    app.connectionManager.addConnection(outputNode, connData.output.index, inputNode, connData.input.index);
                }
            });

            app.canvasRenderer.render();
            app.updateNodeCount();
        }
    }

    // Restore Properties header
    const propertiesHeader = document.querySelector('#properties-panel .sidebar-header h2');
    if (propertiesHeader) propertiesHeader.textContent = 'Properties';

    // Restore properties panel
    hideChatPanel();

    // Resize canvas back
    if (typeof app !== 'undefined' && app.canvasRenderer) {
        setTimeout(() => app.canvasRenderer.resizeCanvas(), 50);
    }
}

function isChatMode() {
    return chatMode;
}

// ============ CHAT PANEL (Properties Panel Transform) ============
let originalPropertiesContent = null;

function showChatPanel() {
    const container = document.getElementById('properties-content');
    if (!container) return;

    originalPropertiesContent = container.innerHTML;
    container.innerHTML = generateChatPanelHTML();
    attachChatPanelListeners();
    renderConversation();
}

function hideChatPanel() {
    const container = document.getElementById('properties-content');
    if (container && originalPropertiesContent) {
        container.innerHTML = originalPropertiesContent;
    }
}

function generateChatPanelHTML() {
    return `
        <div class="chat-panel-container">
            <!-- Scrollable conversation area - inline editing -->
            <div class="chat-conversation" id="chat-conversation">
                <!-- Messages rendered by renderConversation() -->
            </div>

            <!-- Single action button - Flux style -->
            <div class="chat-generate-section">
                <button class="chat-generate-btn" id="chat-compose-btn">
                    Compose <strong>User</strong> response
                </button>
            </div>
        </div>
    `;
}

function attachChatPanelListeners() {
    // Single compose button - adds User message below selected node
    document.getElementById('chat-compose-btn')?.addEventListener('click', composeUserResponse);
}

// ============ CONVERSATION RENDERING (Flux-style editable messages) ============
function renderConversation() {
    const container = document.getElementById('chat-conversation');
    if (!container || !chatMode) return;

    if (!selectedChatNodeId) {
        container.innerHTML = `<p class="text-muted" style="padding: 20px; text-align: center;">
            Select a node to view conversation
        </p>`;
        return;
    }

    const lineage = getNodeLineage(selectedChatNodeId);

    if (lineage.length === 0) {
        container.innerHTML = `<p class="text-muted" style="padding: 20px; text-align: center;">
            No conversation path
        </p>`;
        return;
    }

    container.innerHTML = lineage.map((node, index) => {
        const isLast = index === lineage.length - 1;
        const typeClass = node.type === 'SystemMessage' ? 'system' :
                         node.type === 'UserMessage' ? 'user' : 'gpt';
        const label = node.type === 'SystemMessage' ? 'System' :
                     node.type === 'UserMessage' ? 'User' : 'IDEA Engine';
        const isEditable = node.type !== 'GPTMessage';
        const text = node.properties.text || '';

        if (isEditable) {
            return `
                <div class="chat-message ${typeClass} ${isLast ? 'active' : ''}"
                     data-node-id="${node.id}">
                    <div class="chat-message-label">${label}:</div>
                    <textarea class="chat-message-textarea"
                              data-node-id="${node.id}"
                              rows="${node.type === 'UserMessage' ? 3 : 1}"
                              placeholder="${node.type === 'SystemMessage' ?
                                'You are a helpful assistant...' :
                                'Write your message...'}"
                    >${escapeHtml(text)}</textarea>
                </div>
            `;
        } else {
            // Show empty text for "Generating..." state to trigger CSS animation
            const isGenerating = text === 'Generating...';
            const displayText = isGenerating ? '' : escapeHtml(text);
            return `
                <div class="chat-message ${typeClass} ${isLast ? 'active' : ''}"
                     data-node-id="${node.id}">
                    <div class="chat-message-label">${label}:</div>
                    <div class="chat-message-text${isGenerating ? ' generating' : ''}">${displayText}</div>
                </div>
            `;
        }
    }).join('');

    // Add inline Generate GPT button if last node is UserMessage
    const lastNode = lineage[lineage.length - 1];
    if (lastNode && lastNode.type === 'UserMessage') {
        container.innerHTML += `
            <button class="chat-inline-generate-btn" id="chat-inline-generate-btn">
                Generate <strong>IDEA Engine</strong> response
            </button>
        `;
    }

    // Attach textarea listeners for inline editing
    container.querySelectorAll('.chat-message-textarea').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const nodeId = e.target.dataset.nodeId;
            const node = app.canvasRenderer.nodes.find(n => n.id === nodeId);
            if (node) {
                node.properties.text = e.target.value;
                app.canvasRenderer.render();
                saveChatTreeData();
            }
        });
    });

    // Attach inline generate button listener
    const inlineGenerateBtn = document.getElementById('chat-inline-generate-btn');
    if (inlineGenerateBtn) {
        inlineGenerateBtn.addEventListener('click', generateGPTResponse);
    }

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ LINEAGE & TREE LOGIC ============
function getNodeLineage(nodeId) {
    const lineage = [];
    let currentId = nodeId;

    while (currentId) {
        const node = app.canvasRenderer.nodes.find(n => n.id === currentId);
        if (!node) break;
        lineage.unshift(node);

        // Find parent (node connected to this node's input)
        const parentConn = app.connectionManager.connections.find(
            c => c.inputNode.id === currentId
        );
        currentId = parentConn ? parentConn.outputNode.id : null;
    }

    return lineage;
}

// ============ NODE OPERATIONS ============
async function generateGPTResponse() {
    if (!selectedChatNodeId) {
        if (typeof app !== 'undefined' && app.workflowManager) {
            app.workflowManager.showNotification('Please select a node first', 'warning');
        }
        return;
    }

    const selectedNode = app.canvasRenderer.nodes.find(n => n.id === selectedChatNodeId);
    if (!selectedNode) return;

    // Build messages from lineage
    const lineage = getNodeLineage(selectedChatNodeId);
    const messages = lineage.map(node => ({
        role: node.type === 'SystemMessage' ? 'system' :
              node.type === 'UserMessage' ? 'user' : 'assistant',
        content: node.properties.text || ''
    }));

    const numResponses = chatSettings.numResponses;
    const temperature = chatSettings.temperature;

    // 1. INSTANT FEEDBACK: Button glow animation
    const generateBtn = document.querySelector('.chat-inline-generate-btn, .chat-compose-btn');
    if (generateBtn) {
        generateBtn.classList.add('generating-glow');
        generateBtn.disabled = true;
    }

    // 2. Create GPT nodes on canvas IMMEDIATELY
    const gptNodes = [];
    for (let i = 0; i < numResponses; i++) {
        const offsetX = (i - (numResponses - 1) / 2) * 180;
        const gptNode = new Node('GPTMessage',
            selectedNode.x + offsetX,
            selectedNode.y + 100
        );
        gptNode.properties.text = 'Generating...';
        app.canvasRenderer.addNode(gptNode);

        if (selectedNode.outputs.length > 0) {
            app.connectionManager.addConnection(selectedNode, 0, gptNode, 0);
        }

        gptNodes.push(gptNode);
    }

    app.canvasRenderer.render();
    app.updateNodeCount();

    // 3. TRIGGER GAMIFICATION NOW (when nodes appear)
    if (numResponses >= 2) {
        transitionToDivergentThinking();
    }

    // 4. Select first node and update sidebar to show "Generating..." state
    if (gptNodes.length > 0) {
        app.canvasRenderer.selectNode(gptNodes[0]);
        selectedChatNodeId = gptNodes[0].id;
    }
    renderConversation();

    // 5. Call API and typewriter each response
    for (let i = 0; i < gptNodes.length; i++) {
        // Select this node to show it in sidebar
        app.canvasRenderer.selectNode(gptNodes[i]);
        selectedChatNodeId = gptNodes[i].id;
        renderConversation();

        try {
            const response = await chatAPI.generateResponse(messages, temperature);
            gptNodes[i].properties.text = response;

            // Typewriter effect in sidebar
            const msgElement = document.querySelector(`[data-node-id="${gptNodes[i].id}"] .chat-message-text`);
            if (msgElement) {
                await typewriterEffect(response, msgElement, 12);
            }
        } catch (error) {
            gptNodes[i].properties.text = `Error: ${error.message}`;
            if (typeof app !== 'undefined' && app.workflowManager) {
                app.workflowManager.showNotification(`API Error: ${error.message}`, 'error');
            }
        }

        // Update canvas after each response
        app.canvasRenderer.render();
    }

    // 6. Final cleanup - restore button
    if (generateBtn) {
        generateBtn.classList.remove('generating-glow');
        generateBtn.disabled = false;
    }

    renderConversation();
    saveChatTreeData();

    if (typeof app !== 'undefined' && app.workflowManager) {
        app.workflowManager.showNotification(`Generated ${numResponses} response(s)`, 'success');
    }
}

// Compose a new User response below the selected node (Flux-style)
function composeUserResponse() {
    if (!selectedChatNodeId) {
        if (typeof app !== 'undefined' && app.workflowManager) {
            app.workflowManager.showNotification('Select a node first', 'warning');
        }
        return;
    }

    const selectedNode = app.canvasRenderer.nodes.find(n => n.id === selectedChatNodeId);
    if (!selectedNode) return;

    // Gamification: Switch to Convergent Thinking and increment streak
    transitionToConvergentThinking();
    incrementStreak();

    // Create new empty User node below selected
    const userNode = new Node('UserMessage', selectedNode.x, selectedNode.y + 80);
    userNode.properties.text = '';
    app.canvasRenderer.addNode(userNode);

    // Connect to selected node
    if (selectedNode.outputs.length > 0) {
        app.connectionManager.addConnection(selectedNode, 0, userNode, 0);
    }

    // Select new node
    app.canvasRenderer.selectNode(userNode);
    selectedChatNodeId = userNode.id;

    // Recalculate level for this tree after adding node
    updateLevelForCurrentTree();

    app.canvasRenderer.render();
    app.updateNodeCount();
    renderConversation();
    saveChatTreeData();
}

// ============ SESSION MANAGEMENT ============
function loadChatSessions() {
    try {
        const stored = localStorage.getItem(CHAT_SESSIONS_KEY);
        if (stored) {
            chatSessions = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load chat sessions:', e);
        chatSessions = [];
    }
}

function saveChatSessions() {
    try {
        localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(chatSessions));
    } catch (e) {
        console.error('Failed to save chat sessions:', e);
    }
}

function generateSessionTitle(nodes) {
    // Find first User message with content
    const userNode = nodes.find(n => n.type === 'UserMessage' && n.properties?.text);
    if (userNode && userNode.properties.text) {
        const text = userNode.properties.text.trim();
        return text.length > 30 ? text.substring(0, 30) + '...' : text;
    }
    // Fallback to date
    return `Chat ${new Date().toLocaleDateString()}`;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
}

function createNewSession() {
    // Save current session first
    saveCurrentSession();

    const session = {
        id: 'session_' + Date.now(),
        title: 'New Chat',
        customTitle: false,
        nodes: [],
        connections: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        thinkingLevel: 0  // Per-session thinking level
    };
    chatSessions.unshift(session); // Add to beginning
    currentSessionId = session.id;
    saveChatSessions();
    renderChatHistory();

    // Clear canvas before creating new starter nodes
    app.canvasRenderer.nodes = [];
    app.connectionManager.connections = [];

    // Reset tree levels and gold for new session
    treeLevels = {};
    treeGold = {};

    // Reset thinking state display (level 0)
    chatGamification.thinkingLevel = 0;
    chatGamification.thinkingMode = 'initial';
    updateGamificationDisplay();
    updateRewardBarDisplay();

    createStarterNodes();
}

function loadSession(sessionId) {
    // Save current session first
    saveCurrentSession();

    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;

    currentSessionId = sessionId;

    // Load tree levels and gold from session BEFORE loading canvas
    loadTreeLevels(session);
    loadTreeGold(session);

    loadSessionToCanvas(session);

    // Update level display for selected tree
    updateLevelForCurrentTree();

    renderChatHistory();
    renderConversation();
}

function saveCurrentSession() {
    if (!currentSessionId || !app?.canvasRenderer || !app?.connectionManager) return;
    const session = chatSessions.find(s => s.id === currentSessionId);
    if (!session) return;

    session.nodes = app.canvasRenderer.nodes.map(n => n.toJSON());
    session.connections = app.connectionManager.connections.map(c => ({
        output: { nodeId: c.outputNode.id, index: c.outputIndex },
        input: { nodeId: c.inputNode.id, index: c.inputIndex }
    }));
    if (!session.customTitle) {
        session.title = generateSessionTitle(session.nodes);
    }
    session.updatedAt = Date.now();
    // Save tree levels and gold (per-tree data)
    session.treeLevels = { ...treeLevels };
    session.treeGold = { ...treeGold };
    saveChatSessions();
}

function loadSessionToCanvas(session) {
    if (!app?.canvasRenderer || !app?.connectionManager) return;

    app.canvasRenderer.nodes = [];
    app.connectionManager.connections = [];

    if (session.nodes && session.nodes.length > 0) {
        session.nodes.forEach(nodeData => {
            const node = Node.fromJSON(nodeData);
            app.canvasRenderer.nodes.push(node);
        });

        if (session.connections) {
            session.connections.forEach(connData => {
                const outputNode = app.canvasRenderer.nodes.find(n => n.id === connData.output.nodeId);
                const inputNode = app.canvasRenderer.nodes.find(n => n.id === connData.input.nodeId);
                if (outputNode && inputNode) {
                    app.connectionManager.addConnection(outputNode, connData.output.index, inputNode, connData.input.index);
                }
            });
        }

        // Select the last node
        if (app.canvasRenderer.nodes.length > 0) {
            const lastNode = app.canvasRenderer.nodes[app.canvasRenderer.nodes.length - 1];
            app.canvasRenderer.selectNode(lastNode);
            selectedChatNodeId = lastNode.id;
        }
    } else {
        createStarterNodes();
    }

    app.canvasRenderer.render();
    app.updateNodeCount();
    updateTreeCount();  // Update tree count display

    // Fit nodes to view after loading
    setTimeout(() => {
        if (app?.canvasRenderer?.fitToView) {
            app.canvasRenderer.fitToView();
        }
    }, 100);
}

// Backwards compatibility wrapper
function saveChatTreeData() {
    saveCurrentSession();
}

function loadChatTreeToCanvas() {
    // Load or create session
    if (chatSessions.length === 0) {
        createNewSession();
    } else {
        // If no current session set, use the most recent one (first in array)
        if (!currentSessionId) {
            currentSessionId = chatSessions[0].id;
        }
        const session = chatSessions.find(s => s.id === currentSessionId) || chatSessions[0];
        if (session) {
            currentSessionId = session.id;

            // Load tree levels and gold from session BEFORE loading canvas
            loadTreeLevels(session);
            loadTreeGold(session);

            loadSessionToCanvas(session);

            // Update level display for selected tree
            updateLevelForCurrentTree();
        }
    }
}

function createStarterNodes() {
    const canvas = app.canvasRenderer.canvas;
    const centerX = canvas.width / 2 - 75;

    // Create System node
    const systemNode = new Node('SystemMessage', centerX, 100);
    systemNode.properties.text = 'You are a helpful assistant.';
    app.canvasRenderer.addNode(systemNode);

    // Create User node below (100px vertical spacing)
    const userNode = new Node('UserMessage', centerX, 200);
    userNode.properties.text = '';
    app.canvasRenderer.addNode(userNode);

    // Connect them
    app.connectionManager.addConnection(systemNode, 0, userNode, 0);

    // Select User node
    app.canvasRenderer.selectNode(userNode);
    selectedChatNodeId = userNode.id;

    // Update tree count display
    updateTreeCount();
}

// ============ EVENT LISTENERS ============
function setupChatEventListeners() {
    // Chat header click
    const chatHeader = document.getElementById('chat-header');
    if (chatHeader) {
        chatHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.collapse-btn')) {
                enterChatMode();
            }
        });
    }

    // Design Flow header click - handle exiting chat mode
    const designFlowHeader = document.getElementById('design-flow-header');
    if (designFlowHeader) {
        designFlowHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.collapse-btn') && chatMode) {
                exitChatMode();
            }
        });
    }

    // Journals header click - handle exiting chat mode
    const journalsHeader = document.getElementById('journals-header');
    if (journalsHeader) {
        journalsHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.collapse-btn') && chatMode) {
                exitChatMode();
            }
        });
    }

    // Agent header click - handle exiting chat mode
    const agentHeader = document.getElementById('agent-header');
    if (agentHeader) {
        agentHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.collapse-btn') && chatMode) {
                exitChatMode();
            }
        });
    }

    // Header "New" button - creates new chat when in chat mode
    const btnNew = document.getElementById('btn-new');
    if (btnNew) {
        btnNew.addEventListener('click', (e) => {
            if (chatMode) {
                e.preventDefault();
                e.stopImmediatePropagation();  // Prevent comfyui.js handler
                saveCurrentSession();
                createNewSession();
            }
            // Default workflow behavior handled by comfyui.js when not in chat mode
        }, true);  // Use capture phase to run first
    }

    // Save button - Download chat session in chat mode
    const btnSave = document.getElementById('btn-save');
    if (btnSave) {
        btnSave.addEventListener('click', (e) => {
            if (chatMode) {
                e.preventDefault();
                e.stopImmediatePropagation();
                downloadChatSession();
            }
        }, true);
    }

    // Clear button - Delete current session in chat mode
    const btnClear = document.getElementById('btn-clear');
    if (btnClear) {
        btnClear.addEventListener('click', (e) => {
            if (chatMode) {
                e.preventDefault();
                e.stopImmediatePropagation();
                deleteCurrentSession();
            }
        }, true);
    }

    // Chat session context menu handlers
    document.addEventListener('click', hideChatSessionContextMenu);

    const sessionContextMenu = document.getElementById('chat-session-context-menu');
    if (sessionContextMenu) {
        sessionContextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!contextMenuSessionId) return;

            if (action === 'rename-session') renameSession(contextMenuSessionId);
            else if (action === 'download-session') downloadSession(contextMenuSessionId);
            else if (action === 'delete-session') deleteSessionFromMenu(contextMenuSessionId);

            hideChatSessionContextMenu();
        });
    }

    // Auto-save interval
    setInterval(() => {
        if (chatMode) saveChatTreeData();
    }, 5000);
}

function renderChatHistory() {
    const container = document.getElementById('chat-history-list');
    if (!container) return;

    if (chatSessions.length === 0) {
        container.innerHTML = '<p class="text-muted" style="padding: 12px; text-align: center;">No chat history yet</p>';
        return;
    }

    container.innerHTML = chatSessions.map(session => `
        <div class="chat-session-item ${session.id === currentSessionId ? 'active' : ''}"
             data-session-id="${session.id}">
            <span class="session-title">${escapeHtml(session.title)}</span>
            <span class="session-date">${formatDate(session.updatedAt)}</span>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.chat-session-item').forEach(item => {
        item.addEventListener('click', () => {
            loadSession(item.dataset.sessionId);
        });
        // Add right-click context menu
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showChatSessionContextMenu(e, item.dataset.sessionId);
        });
    });
}

// ============ CHAT SESSION CONTEXT MENU ============
function showChatSessionContextMenu(e, sessionId) {
    const menu = document.getElementById('chat-session-context-menu');
    if (!menu) return;

    contextMenuSessionId = sessionId;
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.classList.remove('hidden');
}

function hideChatSessionContextMenu() {
    const menu = document.getElementById('chat-session-context-menu');
    if (menu) menu.classList.add('hidden');
    contextMenuSessionId = null;
}

function renameSession(sessionId) {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;

    const newTitle = prompt('Enter new name:', session.title);
    if (newTitle && newTitle.trim()) {
        session.title = newTitle.trim();
        session.customTitle = true;
        session.updatedAt = Date.now();
        saveChatSessions();
        renderChatHistory();
    }
}

function downloadSession(sessionId) {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;

    const data = JSON.stringify(session, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title || 'chat-session'}.json`;
    a.click();
    URL.revokeObjectURL(url);

    if (app?.workflowManager) {
        app.workflowManager.showNotification('Session downloaded', 'success');
    }
}

function deleteSessionFromMenu(sessionId) {
    if (!confirm('Delete this chat session?')) return;

    const index = chatSessions.findIndex(s => s.id === sessionId);
    if (index > -1) {
        chatSessions.splice(index, 1);
        saveChatSessions();

        // If deleted session was current, load another or clear
        if (sessionId === currentSessionId) {
            currentSessionId = null;
            if (chatSessions.length > 0) {
                loadSession(chatSessions[0].id);
            } else {
                app.canvasRenderer.nodes = [];
                app.connectionManager.connections = [];
                app.canvasRenderer.render();
                app.updateNodeCount();
                selectedChatNodeId = null;
                renderConversation();
            }
        }
        renderChatHistory();

        if (app?.workflowManager) {
            app.workflowManager.showNotification('Session deleted', 'success');
        }
    }
}

function addChatNodeToCanvas(type) {
    if (!app?.canvasRenderer) return;

    // Calculate position below selected node or at center
    let x, y;
    if (selectedChatNodeId) {
        const selectedNode = app.canvasRenderer.nodes.find(n => n.id === selectedChatNodeId);
        if (selectedNode) {
            x = selectedNode.x;
            y = selectedNode.y + 100;
        } else {
            const canvas = app.canvasRenderer.canvas;
            const centerPos = app.canvasRenderer.screenToCanvas(canvas.width / 2, canvas.height / 2);
            x = centerPos.x - 75;
            y = centerPos.y - 20;
        }
    } else {
        const canvas = app.canvasRenderer.canvas;
        const centerPos = app.canvasRenderer.screenToCanvas(canvas.width / 2, canvas.height / 2);
        x = centerPos.x - 75;
        y = centerPos.y - 20;
    }

    const node = new Node(type, x, y);
    app.canvasRenderer.addNode(node);

    // Connect to selected node if valid
    if (selectedChatNodeId) {
        const selectedNode = app.canvasRenderer.nodes.find(n => n.id === selectedChatNodeId);
        if (selectedNode && selectedNode.outputs.length > 0 && node.inputs.length > 0) {
            app.connectionManager.addConnection(selectedNode, 0, node, 0);
        }
    }

    app.canvasRenderer.selectNode(node);
    selectedChatNodeId = node.id;

    app.canvasRenderer.render();
    app.updateNodeCount();
    renderConversation();
    saveChatTreeData();
}

// Handle node selection in chat mode
function onChatNodeSelected(node) {
    if (!chatMode) return;
    selectedChatNodeId = node?.id || null;

    // Update level for THIS tree's lineage (per-tree level tracking)
    updateLevelForCurrentTree();

    renderConversation();
}

// ============ CHAT TOOLBAR BUTTONS ============
function addChatToolbarButtons() {
    const toolbarActions = document.querySelector('.toolbar-actions');
    if (!toolbarActions) return;

    // Find the separator after Load button
    const separator = toolbarActions.querySelector('.toolbar-separator');

    // Create chat-specific buttons container
    const chatBtns = document.createElement('div');
    chatBtns.id = 'chat-toolbar-buttons';
    chatBtns.className = 'chat-toolbar-group';
    chatBtns.style.display = 'contents';
    chatBtns.innerHTML = `
        <div class="toolbar-separator"></div>
        <button id="btn-add-tree" class="toolbar-btn" title="Add new tree branch">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 3v18M5 12h14"/>
            </svg>
            Add Tree
        </button>
        <button id="btn-add-system" class="toolbar-btn" title="Add System message node">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M1 12h4M19 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            System
        </button>
        <button id="btn-add-user" class="toolbar-btn" title="Add User message node">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>
            User
        </button>
    `;

    // Insert before the separator (before Execute/Simulate/Send)
    if (separator) {
        separator.before(chatBtns);
    } else {
        toolbarActions.appendChild(chatBtns);
    }

    // Wire up button handlers
    document.getElementById('btn-add-tree')?.addEventListener('click', addNewTreeBranch);
    document.getElementById('btn-add-system')?.addEventListener('click', () => addChatNodeToCanvas('SystemMessage'));
    document.getElementById('btn-add-user')?.addEventListener('click', () => addChatNodeToCanvas('UserMessage'));
}

function removeChatToolbarButtons() {
    const chatBtns = document.getElementById('chat-toolbar-buttons');
    if (chatBtns) chatBtns.remove();
}

// Download current chat session as JSON
function downloadChatSession() {
    if (!currentSessionId) return;

    saveCurrentSession();  // Ensure latest data
    const session = chatSessions.find(s => s.id === currentSessionId);
    if (!session) return;

    const data = JSON.stringify(session, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title || 'chat-session'}.json`;
    a.click();
    URL.revokeObjectURL(url);

    if (app?.workflowManager) {
        app.workflowManager.showNotification('Chat session downloaded', 'success');
    }
}

// Delete current chat session
function deleteCurrentSession() {
    if (!currentSessionId) return;

    if (!confirm('Delete this chat session?')) return;

    // Remove from sessions array
    const index = chatSessions.findIndex(s => s.id === currentSessionId);
    if (index > -1) {
        chatSessions.splice(index, 1);
        saveChatSessions();
    }

    // After deleting, load another session or clear canvas
    currentSessionId = null;
    if (chatSessions.length > 0) {
        // Load the most recent session
        loadSession(chatSessions[0].id);
    } else {
        // No sessions left - just clear canvas
        app.canvasRenderer.nodes = [];
        app.connectionManager.connections = [];
        app.canvasRenderer.render();
        app.updateNodeCount();
        selectedChatNodeId = null;
        renderConversation();
        renderChatHistory();
    }

    if (app?.workflowManager) {
        app.workflowManager.showNotification('Chat session deleted', 'success');
    }
}

// Add new tree branch (System → User starter)
function addNewTreeBranch() {
    // Find rightmost node to position new tree
    let maxX = 0;
    app.canvasRenderer.nodes.forEach(n => {
        if (n.x > maxX) maxX = n.x;
    });

    const newX = maxX + 250;  // 250px right of rightmost node

    // Create System node
    const systemNode = new Node('SystemMessage', newX, 100);
    systemNode.properties.text = 'You are a helpful assistant.';
    app.canvasRenderer.addNode(systemNode);

    // Create User node below
    const userNode = new Node('UserMessage', newX, 200);
    userNode.properties.text = '';
    app.canvasRenderer.addNode(userNode);

    // Connect them
    app.connectionManager.addConnection(systemNode, 0, userNode, 0);

    // Select User node
    app.canvasRenderer.selectNode(userNode);
    selectedChatNodeId = userNode.id;

    // Reset level for new tree (starts at 0)
    updateLevelForCurrentTree();

    app.canvasRenderer.render();
    app.updateNodeCount();
    updateTreeCount();  // Update tree count display
    renderConversation();
    saveChatTreeData();

    if (app?.workflowManager) {
        app.workflowManager.showNotification('New tree branch added', 'success');
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
} else {
    initChat();
}

// Export for global access
window.isChatMode = isChatMode;
window.onChatNodeSelected = onChatNodeSelected;
window.enterChatMode = enterChatMode;
window.exitChatMode = exitChatMode;
