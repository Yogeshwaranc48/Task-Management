// ====== State & Data ======
let tasks = JSON.parse(localStorage.getItem('taskflow_tasks')) || [];
let currentFilter = 'all'; // all, pending, completed
let currentCategory = null;
let dragStartIndex = null;

// ====== DOM Elements ======
// Theme
const themeToggleBtn = document.getElementById('themeToggle');
const body = document.body;

// Dates & Stats
const liveDateTimeEl = document.getElementById('liveDateTime');
const greetingTextEl = document.getElementById('greetingText');
const totalCountEl = document.getElementById('totalCount');
const completedCountEl = document.getElementById('completedCount');
const pendingCountEl = document.getElementById('pendingCount');
const progressBarEl = document.getElementById('progressBar');
const progressTextEl = document.getElementById('progressText');

// Tasks
const tasksListEl = document.getElementById('tasksList');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');

// Navigation
const navLinks = document.querySelectorAll('.sidebar-nav a');

// Modals & Forms
const taskModal = document.getElementById('taskModal');
const deleteModal = document.getElementById('deleteModal');
const taskForm = document.getElementById('taskForm');
const modalTitle = document.getElementById('modalTitle');
const taskIdInput = document.getElementById('taskId');
const taskTitleInput = document.getElementById('taskTitle');
const taskDescInput = document.getElementById('taskDesc');
const taskDateInput = document.getElementById('taskDate');
const taskPriorityInput = document.getElementById('taskPriority');
const taskCategoryInput = document.getElementById('taskCategory');

// Buttons
const headerAddTaskBtn = document.getElementById('headerAddTaskBtn');
const closeTaskModalBtn = document.getElementById('closeTaskModal');
const cancelTaskBtn = document.getElementById('cancelTaskBtn');
const closeDeleteModalBtn = document.getElementById('closeDeleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importInput = document.getElementById('importInput');

let taskToDeleteId = null;

// ====== Initialization ======
function init() {
    // Set Theme
    const savedTheme = localStorage.getItem('taskflow_theme') || 'dark';
    if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
        body.classList.add('dark-mode');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    updateDateTime();
    setInterval(updateDateTime, 1000); // update every second
    
    renderTasks();
    setupEventListeners();
}

// ====== Utility Functions ======
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveTasks() {
    localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
    updateStats();
}

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'info') icon = 'fa-info-circle';
    
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300); // Wait for animation
    }, 3000);
}

function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options);
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    liveDateTimeEl.textContent = `${dateStr} | ${timeStr}`;
    
    const hour = now.getHours();
    if (hour < 12) greetingTextEl.textContent = 'Good Morning!';
    else if (hour < 18) greetingTextEl.textContent = 'Good Afternoon!';
    else greetingTextEl.textContent = 'Good Evening!';
}

// ====== Core Logic ======
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    
    totalCountEl.textContent = total;
    completedCountEl.textContent = completed;
    pendingCountEl.textContent = pending;
    
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressBarEl.style.width = `${progress}%`;
    progressTextEl.textContent = `${progress}%`;

    // Confetti on 100%
    if (total > 0 && progress === 100) {
        triggerConfetti();
    }
}

function renderTasks() {
    let filteredTasks = tasks;
    
    // Search
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredTasks = filteredTasks.filter(t => 
            t.title.toLowerCase().includes(searchTerm) || 
            t.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Sidebar filter
    if (currentFilter === 'pending') {
        filteredTasks = filteredTasks.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = filteredTasks.filter(t => t.completed);
    }
    
    // Category filter
    if (currentCategory) {
        filteredTasks = filteredTasks.filter(t => t.category === currentCategory);
    }
    
    // Sort
    const sortVal = sortSelect.value;
    filteredTasks.sort((a, b) => {
        if (sortVal === 'recentlyAdded') return b.createdAt - a.createdAt;
        if (sortVal === 'dueDate') return new Date(a.dueDate) - new Date(b.dueDate);
        if (sortVal === 'alphabetical') return a.title.localeCompare(b.title);
        if (sortVal === 'priority') {
            const p = { 'High': 3, 'Medium': 2, 'Low': 1 };
            return p[b.priority] - p[a.priority];
        }
        return 0;
    });

    tasksListEl.innerHTML = '';
    
    if (filteredTasks.length === 0) {
        tasksListEl.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-folder-open"></i>
                <p>No tasks found.</p>
            </div>
        `;
        updateStats();
        return;
    }
    
    filteredTasks.forEach((task, index) => {
        const taskEl = document.createElement('div');
        taskEl.className = `task-card ${task.completed ? 'completed' : ''}`;
        taskEl.setAttribute('draggable', 'true');
        taskEl.dataset.id = task.id;
        taskEl.dataset.index = tasks.findIndex(t => t.id === task.id); // original index

        // Formatted Date
        const dateObj = new Date(task.dueDate);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        taskEl.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskStatus('${task.id}')">
            <div class="task-content">
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    ${task.description ? `<div class="task-desc">${task.description}</div>` : ''}
                </div>
                <div class="task-meta">
                    <span class="task-badge badge-priority-${task.priority}">${task.priority}</span>
                    <span class="task-badge badge-category">${task.category}</span>
                    <span class="badge-date">${formattedDate}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="icon-btn btn-edit" onclick="openEditModal('${task.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="icon-btn btn-delete" onclick="confirmDelete('${task.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;

        // Drag events
        taskEl.addEventListener('dragstart', handleDragStart);
        taskEl.addEventListener('dragover', handleDragOver);
        taskEl.addEventListener('drop', handleDrop);
        taskEl.addEventListener('dragend', handleDragEnd);

        tasksListEl.appendChild(taskEl);
    });
    
    updateStats();
}

// ====== Drag & Drop ======
function handleDragStart(e) {
    dragStartIndex = +this.dataset.index;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}
function handleDrop(e) {
    e.preventDefault();
    const dragEndIndex = +this.dataset.index;
    if (dragStartIndex !== null && dragStartIndex !== dragEndIndex) {
        // Swap tasks
        const temp = tasks[dragStartIndex];
        tasks[dragStartIndex] = tasks[dragEndIndex];
        tasks[dragEndIndex] = temp;
        saveTasks();
        renderTasks();
    }
}
function handleDragEnd() {
    this.classList.remove('dragging');
    dragStartIndex = null;
}

// ====== Task Actions ======
window.toggleTaskStatus = (id) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        if (task.completed) {
            showToast('Task marked as completed!');
        }
    }
};

window.openEditModal = (id) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
        modalTitle.textContent = 'Edit Task';
        taskIdInput.value = task.id;
        taskTitleInput.value = task.title;
        taskDescInput.value = task.description;
        taskDateInput.value = task.dueDate;
        taskPriorityInput.value = task.priority;
        taskCategoryInput.value = task.category;
        openModal(taskModal);
    }
};

window.confirmDelete = (id) => {
    taskToDeleteId = id;
    openModal(deleteModal);
};

// ====== Modal Control ======
function openModal(modal) {
    modal.classList.add('active');
}
function closeModal(modal) {
    modal.classList.remove('active');
    if (modal === taskModal) {
        taskForm.reset();
        taskIdInput.value = '';
    }
}

// ====== Event Listeners ======
function setupEventListeners() {
    // Theme Toggle
    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem('taskflow_theme', isDark ? 'dark' : 'light');
        themeToggleBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    });

    // Sidebar Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            if (link.dataset.filter) {
                currentFilter = link.dataset.filter;
                currentCategory = null;
            } else if (link.dataset.category) {
                currentFilter = 'all';
                currentCategory = link.dataset.category;
            }
            renderTasks();
        });
    });

    // Search and Sort
    searchInput.addEventListener('input', renderTasks);
    sortSelect.addEventListener('change', renderTasks);

    // Modal Actions
    headerAddTaskBtn.addEventListener('click', () => {
        modalTitle.textContent = 'Add New Task';
        // set default date to today
        taskDateInput.valueAsDate = new Date();
        openModal(taskModal);
    });
    
    closeTaskModalBtn.addEventListener('click', () => closeModal(taskModal));
    cancelTaskBtn.addEventListener('click', () => closeModal(taskModal));
    
    closeDeleteModalBtn.addEventListener('click', () => closeModal(deleteModal));
    cancelDeleteBtn.addEventListener('click', () => closeModal(deleteModal));

    // Close on overlay click
    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) closeModal(taskModal);
    });
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeModal(deleteModal);
    });

    // Form Submit (Add/Edit)
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = taskIdInput.value;
        const title = taskTitleInput.value.trim();
        const desc = taskDescInput.value.trim();
        const date = taskDateInput.value;
        const priority = taskPriorityInput.value;
        const category = taskCategoryInput.value;

        if (!title || !date) {
            showToast('Please fill required fields.', 'error');
            return;
        }

        if (id) {
            // Edit
            const taskIndex = tasks.findIndex(t => t.id === id);
            if (taskIndex > -1) {
                tasks[taskIndex] = { ...tasks[taskIndex], title, description: desc, dueDate: date, priority, category };
                showToast('Task updated successfully!');
            }
        } else {
            // Add
            const newTask = {
                id: generateId(),
                title,
                description: desc,
                dueDate: date,
                priority,
                category,
                completed: false,
                createdAt: Date.now()
            };
            tasks.unshift(newTask); // add to top
            showToast('New task added!');
        }

        saveTasks();
        renderTasks();
        closeModal(taskModal);
    });

    // Delete Confirmation
    confirmDeleteBtn.addEventListener('click', () => {
        if (taskToDeleteId) {
            tasks = tasks.filter(t => t.id !== taskToDeleteId);
            saveTasks();
            renderTasks();
            closeModal(deleteModal);
            showToast('Task deleted successfully.');
            taskToDeleteId = null;
        }
    });

    // Export JSON
    exportBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "tasks.json");
        dlAnchorElem.click();
        showToast('Tasks exported successfully!');
    });

    // Import JSON
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedTasks = JSON.parse(e.target.result);
                    if (Array.isArray(importedTasks)) {
                        tasks = importedTasks;
                        saveTasks();
                        renderTasks();
                        showToast('Tasks imported successfully!');
                    } else {
                        showToast('Invalid JSON format.', 'error');
                    }
                } catch (err) {
                    showToast('Error reading file.', 'error');
                }
            };
            reader.readAsText(file);
        }
    });
}

// ====== Confetti Celebration ======
function triggerConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#f43f5e', '#ec4899', '#d946ef', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#eab308', '#f59e0b', '#f97316'];

    for (let i = 0; i < 150; i++) {
        pieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 10 + 5,
            h: Math.random() * 10 + 5,
            c: colors[Math.floor(Math.random() * colors.length)],
            dy: Math.random() * 5 + 2,
            r: Math.random() * 360,
            dr: Math.random() * 10 - 5
        });
    }

    let animationId;
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let allDone = true;
        
        pieces.forEach(p => {
            ctx.save();
            ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
            ctx.rotate(p.r * Math.PI / 180);
            ctx.fillStyle = p.c;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
            
            p.y += p.dy;
            p.r += p.dr;
            
            if (p.y < canvas.height) allDone = false;
        });

        if (!allDone) {
            animationId = requestAnimationFrame(draw);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            cancelAnimationFrame(animationId);
        }
    }
    
    draw();
}

// ====== Run ======
document.addEventListener('DOMContentLoaded', init);
