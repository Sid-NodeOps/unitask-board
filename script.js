// State Management
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentEditingId = null;
let currentImageBase64 = null;

// DOM Elements
const cols = {
    'todo': document.getElementById('col-todo'),
    'in-progress': document.getElementById('col-in-progress'),
    'done': document.getElementById('col-done')
};

const counts = {
    'todo': document.getElementById('count-todo'),
    'in-progress': document.getElementById('count-in-progress'),
    'done': document.getElementById('count-done')
};

const modal = document.getElementById('taskModal');
const modalContent = document.getElementById('taskModalContent');
const form = document.getElementById('taskForm');
const commentsSection = document.getElementById('commentsSection');
const deleteBtn = document.getElementById('deleteBtn');

// Icons Mapping
const priorityConfig = {
    'high': { color: 'text-rose-600 bg-rose-50 border-rose-100', icon: 'fa-angles-up', label: 'Alta' },
    'medium': { color: 'text-amber-600 bg-amber-50 border-amber-100', icon: 'fa-angle-up', label: 'Media' },
    'low': { color: 'text-blue-600 bg-blue-50 border-blue-100', icon: 'fa-angle-down', label: 'Bassa' }
};

// Initialize
function init() {
    renderBoard();
}

// Render Logic
function renderBoard() {
    // Clear columns
    Object.values(cols).forEach(col => col.innerHTML = '');
    
    // Reset Counts
    const statusCounts = { 'todo': 0, 'in-progress': 0, 'done': 0 };

    tasks.forEach(task => {
        statusCounts[task.status]++;
        const card = createTaskElement(task);
        cols[task.status].appendChild(card);
    });

    // Update counters
    Object.keys(statusCounts).forEach(status => {
        counts[status].innerText = statusCounts[status];
    });

    saveData();
}

function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = 'bg-white p-4 rounded-lg border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:border-gray-300 cursor-grab active:cursor-grabbing transition-all group relative';
    div.draggable = true;
    div.ondragstart = (e) => drag(e, task.id);
    div.onclick = (e) => {
        // Prevent click if clicking specific interactive elements inside card (future proofing)
        openEditModal(task.id);
    };

    const pConfig = priorityConfig[task.priority];
    const date = new Date(task.dueDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    const isOverdue = new Date(task.dueDate) < new Date().setHours(0,0,0,0) && task.status !== 'done';

    div.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${pConfig.color} flex items-center gap-1.5">
                <i class="fa-solid ${pConfig.icon}"></i> ${pConfig.label}
            </span>
            ${isOverdue ? '<span class="text-rose-500 text-xs" title="Scaduta"><i class="fa-solid fa-triangle-exclamation"></i></span>' : ''}
        </div>
        
        ${task.image ? `
        <div class="mb-3 rounded-md overflow-hidden h-32 w-full relative group/img">
            <img src="${task.image}" class="w-full h-full object-cover" alt="Task attachment">
            <div class="absolute inset-0 bg-black/5 group-hover/img:bg-transparent transition-colors"></div>
        </div>
        ` : ''}

        <h3 class="text-sm font-semibold text-gray-900 leading-snug mb-1.5">${escapeHtml(task.title)}</h3>
        
        <p class="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">${escapeHtml(task.description || '')}</p>
        
        <div class="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
            <div class="flex items-center gap-2 text-xs text-gray-400">
                <i class="fa-regular fa-calendar ${isOverdue ? 'text-rose-500' : ''}"></i>
                <span class="${isOverdue ? 'text-rose-500 font-medium' : ''}">${date}</span>
            </div>
            
            <div class="flex items-center gap-2">
                ${task.image ? `<i class="fa-solid fa-paperclip text-xs text-gray-400"></i>` : ''}
                ${task.comments.length > 0 ? `
                <div class="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full group-hover:bg-gray-100 transition-colors">
                    <i class="fa-regular fa-comment"></i>
                    <span>${task.comments.length}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    return div;
}

// Drag & Drop
function drag(ev, id) {
    ev.dataTransfer.setData("text", id);
    ev.target.classList.add('opacity-50', 'scale-95');
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drop(ev, status) {
    ev.preventDefault();
    const id = parseInt(ev.dataTransfer.getData("text"));
    const task = tasks.find(t => t.id === id);
    
    // Remove drag effects
    const draggable = document.querySelector('[draggable="true"].opacity-50');
    if (draggable) draggable.classList.remove('opacity-50', 'scale-95');

    if (task && task.status !== status) {
        task.status = status;
        renderBoard();
        showToast('Stato aggiornato');
    }
}

// Modal Logic
function openTaskModal() {
    currentEditingId = null;
    currentImageBase64 = null;
    document.getElementById('modalTitle').innerText = 'Nuova Task';
    form.reset();
    document.getElementById('taskDueDate').valueAsDate = new Date();
    
    // Reset Image UI
    document.getElementById('taskImageInput').value = '';
    updateImagePreview();

    commentsSection.classList.add('hidden');
    deleteBtn.classList.add('hidden');
    
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modalContent.classList.remove('translate-x-full');
    });
}

function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    currentEditingId = id;
    document.getElementById('modalTitle').innerText = 'Modifica Task';
    
    // Populate fields
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskDueDate').value = task.dueDate;

    // Image
    currentImageBase64 = task.image || null;
    updateImagePreview();

    // Comments
    renderComments(task);
    commentsSection.classList.remove('hidden');
    deleteBtn.classList.remove('hidden');

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modalContent.classList.remove('translate-x-full');
    });
}

function closeTaskModal() {
    modalContent.classList.add('translate-x-full');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function handleTaskSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('taskTitle').value;
    const desc = document.getElementById('taskDescription').value;
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value;

    if (currentEditingId) {
        // Update
        const task = tasks.find(t => t.id === currentEditingId);
        task.title = title;
        task.description = desc;
        task.priority = priority;
        task.dueDate = dueDate;
        task.image = currentImageBase64;
        showToast('Task aggiornata');
    } else {
        // Create
        const newTask = {
            id: Date.now(),
            title: title,
            description: desc,
            priority: priority,
            dueDate: dueDate,
            image: currentImageBase64,
            status: 'todo',
            comments: []
        };
        tasks.push(newTask);
        showToast('Nuova task creata');
    }

    closeTaskModal();
    renderBoard();
}

// Image Handling
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        // Compress image before setting
        compressImage(e.target.result, 800, 0.7).then(compressedBase64 => {
            currentImageBase64 = compressedBase64;
            updateImagePreview();
        });
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    currentImageBase64 = null;
    document.getElementById('taskImageInput').value = '';
    updateImagePreview();
}

function updateImagePreview() {
    const container = document.getElementById('imagePreviewContainer');
    const img = document.getElementById('imagePreview');
    const uploadBtn = document.getElementById('uploadBtn');

    if (currentImageBase64) {
        img.src = currentImageBase64;
        container.classList.remove('hidden');
        uploadBtn.classList.add('hidden');
    } else {
        img.src = '';
        container.classList.add('hidden');
        uploadBtn.classList.remove('hidden');
    }
}

function compressImage(base64Str, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
    });
}

function deleteTask() {
    if (confirm('Sei sicuro di voler eliminare questa task?')) {
        tasks = tasks.filter(t => t.id !== currentEditingId);
        closeTaskModal();
        renderBoard();
        showToast('Task eliminata');
    }
}

// Comments
function renderComments(task) {
    const container = document.getElementById('commentsList');
    container.innerHTML = '';

    if (task.comments.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 italic text-center py-2">Nessun commento ancora</p>';
        return;
    }

    task.comments.forEach(comment => {
        const div = document.createElement('div');
        div.className = 'bg-gray-50 p-3 rounded-lg border border-gray-100';
        div.innerHTML = `
            <div class="flex justify-between items-start mb-1">
                <span class="text-xs font-semibold text-gray-700">Tu</span>
                <span class="text-[10px] text-gray-400">${new Date(comment.timestamp).toLocaleString('it-IT')}</span>
            </div>
            <p class="text-sm text-gray-600">${escapeHtml(comment.text)}</p>
        `;
        container.appendChild(div);
    });
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function addComment() {
    const input = document.getElementById('newComment');
    const text = input.value.trim();
    
    if (!text || !currentEditingId) return;

    const task = tasks.find(t => t.id === currentEditingId);
    task.comments.push({
        id: Date.now(),
        text: text,
        timestamp: new Date().toISOString()
    });

    input.value = '';
    renderComments(task);
    saveData();
    // Re-render board card to update comment count badge immediately
    renderBoard(); 
}

// Utilities
function saveData() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').innerText = message;
    
    toast.classList.remove('translate-y-20', 'opacity-0');
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// Init
init();