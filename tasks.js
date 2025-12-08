// Tasks Mode - Habitica-Style Gamified Task Management
// Manages habits, dailies, todos, and rewards with RPG mechanics

// State
let tasksMode = false;
let previousDesignFlowStateTasks = null;
let tasksData = null;

// LocalStorage keys
const TASKS_STORAGE_KEY = 'idea-engine-tasks';

// Default player stats
const DEFAULT_PLAYER = {
    username: 'Adventurer',
    level: 12,
    health: 50,
    maxHealth: 50,
    exp: 95,
    expToLevel: 100,
    mana: 30,
    maxMana: 30,
    gold: 2847,
    gems: 156
};

// Note: Health is already full (50/50). To see new values, clear localStorage:
// localStorage.removeItem('idea-engine-tasks')

// ============================================
// Data Management
// ============================================

function loadTasksData() {
    try {
        const stored = localStorage.getItem(TASKS_STORAGE_KEY);
        if (stored) {
            tasksData = JSON.parse(stored);
            // Ensure player stats exist
            if (!tasksData.player) {
                tasksData.player = { ...DEFAULT_PLAYER };
            }
        } else {
            tasksData = {
                player: { ...DEFAULT_PLAYER },
                habits: [],
                dailies: [],
                todos: [],
                rewards: []
            };
            saveTasksData();
        }
    } catch (e) {
        console.error('Error loading tasks data:', e);
        tasksData = {
            player: { ...DEFAULT_PLAYER },
            habits: [],
            dailies: [],
            todos: [],
            rewards: []
        };
    }
}

function saveTasksData() {
    try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasksData));
    } catch (e) {
        console.error('Error saving tasks data:', e);
    }
}

// ============================================
// Player Stats Management
// ============================================

function gainExp(amount) {
    tasksData.player.exp += amount;

    // Level up check
    while (tasksData.player.exp >= tasksData.player.expToLevel) {
        tasksData.player.exp -= tasksData.player.expToLevel;
        tasksData.player.level++;
        tasksData.player.expToLevel = Math.floor(tasksData.player.expToLevel * 1.5);
        tasksData.player.maxHealth += 5;
        tasksData.player.health = tasksData.player.maxHealth;
        tasksData.player.maxMana += 3;
        tasksData.player.mana = tasksData.player.maxMana;
        showNotification(`Level Up! You are now level ${tasksData.player.level}!`, 'success');
    }

    saveTasksData();
    updateStatsDisplay();
}

function gainGold(amount) {
    tasksData.player.gold += amount;
    saveTasksData();
    updateStatsDisplay();
}

function loseHealth(amount) {
    tasksData.player.health = Math.max(0, tasksData.player.health - amount);
    if (tasksData.player.health === 0) {
        // Death penalty - lose gold and reset health
        tasksData.player.gold = Math.floor(tasksData.player.gold * 0.5);
        tasksData.player.health = tasksData.player.maxHealth;
        showNotification('You fainted! Lost half your gold.', 'error');
    }
    saveTasksData();
    updateStatsDisplay();
}

function spendGold(amount) {
    if (tasksData.player.gold >= amount) {
        tasksData.player.gold -= amount;
        saveTasksData();
        updateStatsDisplay();
        return true;
    }
    return false;
}

function updateStatsDisplay() {
    const player = tasksData.player;

    // Update username and level
    const usernameEl = document.getElementById('tasks-username');
    const levelEl = document.getElementById('tasks-level');
    if (usernameEl) usernameEl.textContent = player.username;
    if (levelEl) levelEl.textContent = `Level ${player.level}`;

    // Update health bar
    const healthFill = document.getElementById('health-bar-fill');
    const healthText = document.getElementById('health-text');
    if (healthFill) healthFill.style.width = `${(player.health / player.maxHealth) * 100}%`;
    if (healthText) healthText.textContent = `${Math.floor(player.health)}/${player.maxHealth}`;

    // Update exp bar
    const expFill = document.getElementById('exp-bar-fill');
    const expText = document.getElementById('exp-text');
    if (expFill) expFill.style.width = `${(player.exp / player.expToLevel) * 100}%`;
    if (expText) expText.textContent = `${Math.floor(player.exp)}/${player.expToLevel}`;

    // Update mana bar
    const manaFill = document.getElementById('mana-bar-fill');
    const manaText = document.getElementById('mana-text');
    if (manaFill) manaFill.style.width = `${(player.mana / player.maxMana) * 100}%`;
    if (manaText) manaText.textContent = `${Math.floor(player.mana)}/${player.maxMana}`;

    // Update currency
    const goldEl = document.getElementById('gold-amount');
    const gemsEl = document.getElementById('gems-amount');
    if (goldEl) goldEl.textContent = Math.floor(player.gold);
    if (gemsEl) gemsEl.textContent = player.gems;
}

// ============================================
// Task CRUD Operations
// ============================================

function createTask(type, title, options = {}) {
    const task = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title,
        notes: options.notes || '',
        difficulty: options.difficulty || 'easy', // trivial, easy, medium, hard
        createdAt: Date.now(),
        ...getTypeSpecificDefaults(type, options)
    };

    tasksData[type + 's'].push(task);
    saveTasksData();
    return task;
}

function getTypeSpecificDefaults(type, options) {
    switch (type) {
        case 'habit':
            return {
                positive: options.positive !== false,
                negative: options.negative !== false,
                counterUp: 0,
                counterDown: 0
            };
        case 'daily':
            return {
                completed: false,
                streak: 0,
                lastCompleted: null
            };
        case 'todo':
            return {
                completed: false,
                dueDate: options.dueDate || null
            };
        case 'reward':
            return {
                cost: options.cost || 10
            };
        default:
            return {};
    }
}

function deleteTask(type, taskId) {
    const list = tasksData[type + 's'];
    const index = list.findIndex(t => t.id === taskId);
    if (index !== -1) {
        list.splice(index, 1);
        saveTasksData();
        renderAllColumns();
    }
}

// ============================================
// Task Actions
// ============================================

function performHabitPositive(taskId) {
    const habit = tasksData.habits.find(h => h.id === taskId);
    if (habit && habit.positive) {
        habit.counterUp++;
        const expGain = getDifficultyValue(habit.difficulty, 'exp');
        const goldGain = getDifficultyValue(habit.difficulty, 'gold');
        gainExp(expGain);
        gainGold(goldGain);
        saveTasksData();
        renderColumn('habits');
        showNotification(`+${expGain} XP, +${goldGain} Gold`, 'success');
    }
}

function performHabitNegative(taskId) {
    const habit = tasksData.habits.find(h => h.id === taskId);
    if (habit && habit.negative) {
        habit.counterDown++;
        const damage = getDifficultyValue(habit.difficulty, 'damage');
        loseHealth(damage);
        saveTasksData();
        renderColumn('habits');
        showNotification(`-${damage} Health`, 'error');
    }
}

function toggleDaily(taskId) {
    const daily = tasksData.dailies.find(d => d.id === taskId);
    if (daily) {
        daily.completed = !daily.completed;

        if (daily.completed) {
            daily.streak++;
            daily.lastCompleted = Date.now();
            const expGain = getDifficultyValue(daily.difficulty, 'exp');
            const goldGain = getDifficultyValue(daily.difficulty, 'gold');
            gainExp(expGain);
            gainGold(goldGain);
            showNotification(`+${expGain} XP, +${goldGain} Gold`, 'success');
        } else {
            daily.streak = Math.max(0, daily.streak - 1);
        }

        saveTasksData();
        renderColumn('dailies');
    }
}

function toggleTodo(taskId) {
    const todo = tasksData.todos.find(t => t.id === taskId);
    if (todo) {
        todo.completed = !todo.completed;

        if (todo.completed) {
            const expGain = getDifficultyValue(todo.difficulty, 'exp');
            const goldGain = getDifficultyValue(todo.difficulty, 'gold');
            gainExp(expGain);
            gainGold(goldGain);
            showNotification(`+${expGain} XP, +${goldGain} Gold`, 'success');
        }

        saveTasksData();
        renderColumn('todos');
    }
}

function buyReward(taskId) {
    const reward = tasksData.rewards.find(r => r.id === taskId);
    if (reward && spendGold(reward.cost)) {
        showNotification(`Purchased ${reward.title}!`, 'success');
        renderColumn('rewards');
    } else {
        showNotification('Not enough gold!', 'error');
    }
}

function getDifficultyValue(difficulty, type) {
    const values = {
        trivial: { exp: 2, gold: 1, damage: 1 },
        easy: { exp: 5, gold: 2, damage: 2 },
        medium: { exp: 10, gold: 5, damage: 5 },
        hard: { exp: 20, gold: 10, damage: 10 }
    };
    return values[difficulty]?.[type] || values.easy[type];
}

function showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (typeof app !== 'undefined' && app.workflowManager?.showNotification) {
        app.workflowManager.showNotification(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

// ============================================
// Rendering
// ============================================

function renderAllColumns() {
    renderColumn('habits');
    renderColumn('dailies');
    renderColumn('todos');
    renderColumn('rewards');
}

function renderColumn(type) {
    const container = document.getElementById(`${type}-list`);
    if (!container) return;

    const items = tasksData[type] || [];

    if (items.length === 0) {
        const typeLabels = {
            'habits': 'agents',
            'dailies': 'flows',
            'todos': 'to-dos',
            'rewards': 'rewards'
        };
        container.innerHTML = `<div class="column-empty">No ${typeLabels[type] || type} yet</div>`;
        return;
    }

    switch (type) {
        case 'habits':
            container.innerHTML = items.map(renderHabitCard).join('');
            break;
        case 'dailies':
            container.innerHTML = items.map(renderDailyCard).join('');
            break;
        case 'todos':
            container.innerHTML = items.map(renderTodoCard).join('');
            break;
        case 'rewards':
            container.innerHTML = items.map(renderRewardCard).join('');
            break;
    }

    attachColumnListeners(type);
}

function renderHabitCard(habit) {
    return `
        <div class="task-card difficulty-${habit.difficulty}" data-id="${habit.id}">
            <div class="task-card-header">
                <div class="habit-buttons">
                    ${habit.positive ? `<button class="habit-btn positive" data-action="positive" data-id="${habit.id}">+</button>` : ''}
                    ${habit.negative ? `<button class="habit-btn negative" data-action="negative" data-id="${habit.id}">−</button>` : ''}
                </div>
                <div class="task-card-content">
                    <div class="task-card-title">${escapeHtml(habit.title)}</div>
                    ${habit.notes ? `<div class="task-card-notes">${escapeHtml(habit.notes)}</div>` : ''}
                    <div class="task-card-notes">↑${habit.counterUp} ↓${habit.counterDown}</div>
                </div>
            </div>
        </div>
    `;
}

function renderDailyCard(daily) {
    return `
        <div class="task-card difficulty-${daily.difficulty} ${daily.completed ? 'completed' : ''}" data-id="${daily.id}">
            <div class="task-card-header">
                <button class="task-checkbox-btn ${daily.completed ? 'checked' : ''}" data-action="toggle" data-id="${daily.id}">
                    ${daily.completed ? '✓' : ''}
                </button>
                <div class="task-card-content">
                    <div class="task-card-title">${escapeHtml(daily.title)}</div>
                    ${daily.notes ? `<div class="task-card-notes">${escapeHtml(daily.notes)}</div>` : ''}
                    ${daily.streak > 0 ? `<div class="task-streak">🔥 ${daily.streak} day streak</div>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderTodoCard(todo) {
    const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;
    return `
        <div class="task-card difficulty-${todo.difficulty} ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
            <div class="task-card-header">
                <button class="task-checkbox-btn ${todo.completed ? 'checked' : ''}" data-action="toggle" data-id="${todo.id}">
                    ${todo.completed ? '✓' : ''}
                </button>
                <div class="task-card-content">
                    <div class="task-card-title">${escapeHtml(todo.title)}</div>
                    ${todo.notes ? `<div class="task-card-notes">${escapeHtml(todo.notes)}</div>` : ''}
                    ${todo.dueDate ? `<div class="task-due-date ${isOverdue ? 'overdue' : ''}">Due: ${formatDate(todo.dueDate)}</div>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderRewardCard(reward) {
    const canAfford = tasksData.player.gold >= reward.cost;
    return `
        <div class="task-card reward-card" data-id="${reward.id}">
            <div class="task-card-content">
                <div class="task-card-title">${escapeHtml(reward.title)}</div>
                ${reward.notes ? `<div class="task-card-notes">${escapeHtml(reward.notes)}</div>` : ''}
                <div class="reward-cost">🪙 ${reward.cost}</div>
                <button class="buy-reward-btn" data-action="buy" data-id="${reward.id}" ${!canAfford ? 'disabled' : ''}>
                    Buy
                </button>
            </div>
        </div>
    `;
}

function attachColumnListeners(type) {
    const container = document.getElementById(`${type}-list`);
    if (!container) return;

    // Habit buttons
    if (type === 'habits') {
        container.querySelectorAll('.habit-btn.positive').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                performHabitPositive(btn.dataset.id);
            });
        });
        container.querySelectorAll('.habit-btn.negative').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                performHabitNegative(btn.dataset.id);
            });
        });
    }

    // Daily/Todo checkboxes
    if (type === 'dailies') {
        container.querySelectorAll('.task-checkbox-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDaily(btn.dataset.id);
            });
        });
    }

    if (type === 'todos') {
        container.querySelectorAll('.task-checkbox-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleTodo(btn.dataset.id);
            });
        });
    }

    // Reward buy buttons
    if (type === 'rewards') {
        container.querySelectorAll('.buy-reward-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                buyReward(btn.dataset.id);
            });
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================
// Mode Switching
// ============================================

function enterTasksMode() {
    if (tasksMode) return;

    // Exit other modes first
    if (typeof exitChatMode === 'function' && typeof isChatMode === 'function' && isChatMode()) {
        exitChatMode();
    }
    if (typeof exitJournalMode === 'function' && typeof isJournalMode === 'function' && isJournalMode()) {
        exitJournalMode();
    }
    if (typeof exitAgentMode === 'function' && typeof isAgentMode === 'function' && isAgentMode()) {
        exitAgentMode();
    }

    // Clean up any leftover UI from other modes
    if (typeof cleanupAllModeUI === 'function') {
        cleanupAllModeUI();
    }

    tasksMode = true;

    // Save current Design Flow state
    if (typeof app !== 'undefined' && app.canvasRenderer && app.connectionManager) {
        const validConnections = app.connectionManager.connections.filter(c => c.fromNode && c.toNode);
        previousDesignFlowStateTasks = {
            nodes: app.canvasRenderer.nodes.map(n => n.toJSON()),
            connections: validConnections.map(c => ({
                fromNode: c.fromNode.id,
                fromOutput: c.fromOutput,
                toNode: c.toNode.id,
                toInput: c.toInput
            }))
        };
    }

    // Update sidebar headers
    document.getElementById('tasks-header')?.classList.add('active');
    document.getElementById('design-flow-header')?.classList.remove('active');
    document.getElementById('journals-header')?.classList.remove('active');
    document.getElementById('chat-header')?.classList.remove('active');
    document.getElementById('agent-header')?.classList.remove('active');

    // Show/hide sections
    document.getElementById('design-flow-section').style.display = 'none';
    document.getElementById('journals-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'none';
    document.getElementById('agent-section').style.display = 'none';
    document.getElementById('tasks-section').style.display = 'flex';

    // Hide canvas, show tasks view
    document.querySelector('.canvas-container').style.display = 'none';
    document.getElementById('tasks-view-container').style.display = 'flex';

    // Hide workflow buttons and properties panel
    const executeBtn = document.getElementById('btn-execute');
    const simulateBtn = document.getElementById('btn-simulate');
    const sendBtn = document.getElementById('btn-send');
    const propertiesPanel = document.getElementById('properties-panel');
    if (executeBtn) executeBtn.style.display = 'none';
    if (simulateBtn) simulateBtn.style.display = 'none';
    if (sendBtn) sendBtn.style.display = 'none';
    if (propertiesPanel) propertiesPanel.style.display = 'none';

    // Hide all toolbar buttons in Tasks mode
    const btnNew = document.getElementById('btn-new');
    const btnSave = document.getElementById('btn-save');
    const btnClear = document.getElementById('btn-clear');
    const btnLoad = document.getElementById('btn-load');
    const btnDownload = document.getElementById('btn-download');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnFitView = document.getElementById('btn-fit-view');
    const btnProfile = document.getElementById('btn-profile');
    const zoomLevel = document.getElementById('zoom-level');

    if (btnNew) btnNew.style.display = 'none';
    if (btnSave) btnSave.style.display = 'none';
    if (btnClear) btnClear.style.display = 'none';
    if (btnLoad) btnLoad.style.display = 'none';
    if (btnDownload) btnDownload.style.display = 'none';
    if (btnZoomIn) btnZoomIn.style.display = 'none';
    if (btnZoomOut) btnZoomOut.style.display = 'none';
    if (btnFitView) btnFitView.style.display = 'none';
    // Keep btnProfile visible for UI consistency
    if (zoomLevel) zoomLevel.style.display = 'none';

    // Hide toolbar separators
    document.querySelectorAll('.toolbar-separator').forEach(sep => sep.style.display = 'none');

    // Load data and render
    loadTasksData();
    updateStatsDisplay();
    renderAllColumns();
    renderTasksSidebar();
    attachAddButtonListeners();

    console.log('Entered Tasks mode');
}

function exitTasksMode() {
    if (!tasksMode) return;

    tasksMode = false;

    // Update sidebar headers
    document.getElementById('tasks-header')?.classList.remove('active');
    document.getElementById('design-flow-header')?.classList.add('active');

    // Show/hide sections
    document.getElementById('tasks-section').style.display = 'none';
    document.getElementById('design-flow-section').style.display = 'flex';

    // Show canvas, hide tasks view
    document.querySelector('.canvas-container').style.display = 'flex';
    document.getElementById('tasks-view-container').style.display = 'none';

    // Show workflow buttons and properties panel
    const executeBtn = document.getElementById('btn-execute');
    const simulateBtn = document.getElementById('btn-simulate');
    const sendBtn = document.getElementById('btn-send');
    const propertiesPanel = document.getElementById('properties-panel');
    if (executeBtn) executeBtn.style.display = '';
    if (simulateBtn) simulateBtn.style.display = '';
    if (sendBtn) sendBtn.style.display = '';
    if (propertiesPanel) propertiesPanel.style.display = '';

    // Restore all toolbar buttons
    const btnNew = document.getElementById('btn-new');
    const btnSave = document.getElementById('btn-save');
    const btnClear = document.getElementById('btn-clear');
    const btnLoad = document.getElementById('btn-load');
    const btnDownload = document.getElementById('btn-download');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnFitView = document.getElementById('btn-fit-view');
    const btnProfile = document.getElementById('btn-profile');
    const zoomLevel = document.getElementById('zoom-level');

    if (btnNew) btnNew.style.display = '';
    if (btnSave) btnSave.style.display = '';
    if (btnClear) btnClear.style.display = '';
    if (btnLoad) btnLoad.style.display = '';
    if (btnDownload) btnDownload.style.display = '';
    if (btnZoomIn) btnZoomIn.style.display = '';
    if (btnZoomOut) btnZoomOut.style.display = '';
    if (btnFitView) btnFitView.style.display = '';
    if (btnProfile) btnProfile.style.display = '';
    if (zoomLevel) zoomLevel.style.display = '';

    // Restore toolbar separators
    document.querySelectorAll('.toolbar-separator').forEach(sep => sep.style.display = '');

    // Restore previous Design Flow state
    if (previousDesignFlowStateTasks && typeof app !== 'undefined') {
        app.canvasRenderer.nodes = [];
        app.connectionManager.connections = [];

        previousDesignFlowStateTasks.nodes.forEach(nodeData => {
            const node = Node.fromJSON(nodeData);
            app.canvasRenderer.nodes.push(node);
        });

        previousDesignFlowStateTasks.connections.forEach(connData => {
            const fromNode = app.canvasRenderer.nodes.find(n => n.id === connData.fromNode);
            const toNode = app.canvasRenderer.nodes.find(n => n.id === connData.toNode);
            if (fromNode && toNode) {
                app.connectionManager.addConnection(fromNode, connData.fromOutput, toNode, connData.toInput);
            }
        });

        app.canvasRenderer.render();
    }

    console.log('Exited Tasks mode');
}

function isTasksMode() {
    return tasksMode;
}

function resetTasksModeState() {
    tasksMode = false;

    // Restore toolbar buttons that enterTasksMode() hid
    const btnNew = document.getElementById('btn-new');
    const btnSave = document.getElementById('btn-save');
    const btnClear = document.getElementById('btn-clear');
    const btnLoad = document.getElementById('btn-load');
    const btnDownload = document.getElementById('btn-download');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnFitView = document.getElementById('btn-fit-view');
    const btnProfile = document.getElementById('btn-profile');
    const zoomLevel = document.getElementById('zoom-level');

    if (btnNew) btnNew.style.display = '';
    if (btnSave) btnSave.style.display = '';
    if (btnClear) btnClear.style.display = '';
    if (btnLoad) btnLoad.style.display = '';
    if (btnDownload) btnDownload.style.display = '';
    if (btnZoomIn) btnZoomIn.style.display = '';
    if (btnZoomOut) btnZoomOut.style.display = '';
    if (btnFitView) btnFitView.style.display = '';
    if (btnProfile) btnProfile.style.display = '';
    if (zoomLevel) zoomLevel.style.display = '';

    // Restore toolbar separators
    document.querySelectorAll('.toolbar-separator').forEach(sep => sep.style.display = '');

    // Hide tasks view container and show canvas
    const tasksView = document.getElementById('tasks-view-container');
    const canvasContainer = document.querySelector('.canvas-container');
    const propertiesPanel = document.getElementById('properties-panel');

    if (tasksView) tasksView.style.display = 'none';
    if (canvasContainer) canvasContainer.style.display = 'flex';
    if (propertiesPanel) propertiesPanel.style.display = '';

    // Reset sidebar state
    document.getElementById('tasks-header')?.classList.remove('active');
    document.getElementById('tasks-section').style.display = 'none';
}

// ============================================
// Sidebar Rendering (simplified for Tasks mode)
// ============================================

function renderTasksSidebar() {
    const section = document.getElementById('tasks-section');
    if (!section) return;

    const habits = tasksData.habits || [];
    const dailies = tasksData.dailies || [];
    const todos = tasksData.todos || [];

    section.innerHTML = `
        <div class="tasks-sidebar-content">
            <div class="tasks-stats-mini">
                <div class="stat-mini">
                    <span class="stat-mini-label">Level</span>
                    <span class="stat-mini-value">${tasksData.player.level}</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-label">Gold</span>
                    <span class="stat-mini-value">🪙 ${Math.floor(tasksData.player.gold)}</span>
                </div>
            </div>

            <div class="tasks-sidebar-summary">
                <div class="summary-item">
                    <span class="summary-count">${habits.length}</span>
                    <span class="summary-label">Agents</span>
                </div>
                <div class="summary-item">
                    <span class="summary-count">${dailies.filter(d => !d.completed).length}/${dailies.length}</span>
                    <span class="summary-label">Flows</span>
                </div>
                <div class="summary-item">
                    <span class="summary-count">${todos.filter(t => !t.completed).length}</span>
                    <span class="summary-label">To Do's</span>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// Add Task UI
// ============================================

function attachAddButtonListeners() {
    document.querySelectorAll('.column-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            promptAddTask(type);
        });
    });
}

function promptAddTask(type) {
    const typeLabels = {
        'habit': 'agent',
        'daily': 'flow',
        'todo': 'to-do',
        'reward': 'reward'
    };
    const label = typeLabels[type] || type;
    const title = prompt(`Enter ${label} title:`);
    if (title && title.trim()) {
        const options = {};

        if (type === 'reward') {
            const cost = prompt('Enter cost in gold:', '10');
            options.cost = parseInt(cost) || 10;
        }

        createTask(type, title.trim(), options);
        renderColumn(type + 's');
        renderTasksSidebar();
    }
}

// ============================================
// Initialization
// ============================================

function initTasksMode() {
    // Tasks header click handler
    const tasksHeader = document.getElementById('tasks-header');
    if (tasksHeader) {
        tasksHeader.addEventListener('click', (e) => {
            if (e.target.closest('.collapse-btn')) return;

            if (tasksMode) {
                exitTasksMode();
            } else {
                enterTasksMode();
            }
        });
    }

    // Design Flow header - exit tasks mode
    const designFlowHeader = document.getElementById('design-flow-header');
    if (designFlowHeader) {
        designFlowHeader.addEventListener('click', (e) => {
            if (e.target.closest('.collapse-btn')) return;
            if (tasksMode) {
                exitTasksMode();
            }
        });
    }

    console.log('Tasks mode initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTasksMode);
} else {
    initTasksMode();
}

// ============================================
// Distribution Countdown Timer
// ============================================

let distributionTimerInterval = null;
let distributionEndTime = null;

function initDistributionTimer() {
    // Set initial countdown: 5 hours, 21 minutes, 45 seconds from now
    const hours = 5;
    const minutes = 21;
    const seconds = 45;
    const totalMs = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
    distributionEndTime = Date.now() + totalMs;

    // Start the timer
    updateDistributionTimer();
    distributionTimerInterval = setInterval(updateDistributionTimer, 1000);
}

function updateDistributionTimer() {
    const timerEl = document.getElementById('distribution-timer');
    if (!timerEl) return;

    const now = Date.now();
    const remaining = Math.max(0, distributionEndTime - now);

    if (remaining <= 0) {
        timerEl.textContent = 'Distribution Now!';
        timerEl.style.color = '#2ecc71';
        if (distributionTimerInterval) {
            clearInterval(distributionTimerInterval);
            distributionTimerInterval = null;
        }
        return;
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    timerEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
}

function stopDistributionTimer() {
    if (distributionTimerInterval) {
        clearInterval(distributionTimerInterval);
        distributionTimerInterval = null;
    }
}

// Start timer when tasks mode is entered
const originalEnterTasksMode = enterTasksMode;
enterTasksMode = function() {
    originalEnterTasksMode();
    initDistributionTimer();
};

// Stop timer when tasks mode is exited
const originalExitTasksMode = exitTasksMode;
exitTasksMode = function() {
    stopDistributionTimer();
    originalExitTasksMode();
};
