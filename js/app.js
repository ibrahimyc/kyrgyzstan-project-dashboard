// js/app.js
// Ana Uygulama Mantığı

// Global state
let tasks = [];
let filteredTasks = [];
let currentView = 'dashboard';
let searchTerm = '';
let filters = {
    status: 'all',
    category: 'all',
    responsible: 'all',
    timePhase: 'all'
};
let editingTask = null;
let draggedTask = null;
let realtimeSubscription = null;

// Sabitler
const categories = {
    sourcing: { name: 'KAYNAK BULMA', color: '#8b44ad', icon: '🎯' },
    hiring: { name: 'İŞE ALIM', color: '#8b44ad', icon: '👥' },
    placement_legal: { name: 'YERLEŞTİRME VE HUKUK', color: '#8b44ad', icon: '⚖️' }
};

const timePhases = {
    '30_days': { name: '30 Gün', color: '#d8b7db' },
    '60_days': { name: '60 Gün', color: '#b488b7' },
    '90_days': { name: '90 Gün', color: '#9058a0' },
    'end_of_year': { name: 'Yıl Sonu', color: '#8b44ad' }
};

const statusConfig = {
    done: { name: 'Tamamlandı', color: 'text-green-600', bgColor: 'bg-green-100 text-green-800' },
    ongoing: { name: 'Devam Ediyor', color: 'text-yellow-600', bgColor: 'bg-yellow-100 text-yellow-800' },
    pending: { name: 'Beklemede', color: 'text-gray-600', bgColor: 'bg-gray-100 text-gray-800' }
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        console.log('🚀 Uygulama başlatılıyor...');
        
        // Supabase bağlantısını kontrol et
        if (typeof supabase === 'undefined') {
            console.error('❌ Supabase yüklenemedi');
            throw new Error('Supabase yüklenemedi');
        }

        // TaskAPI'nin tanımlı olduğunu kontrol et
        if (typeof TaskAPI === 'undefined') {
            console.error('❌ TaskAPI tanımlı değil');
            throw new Error('TaskAPI tanımlı değil');
        }

        // Icons'ları yükle
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Event listener'ları başlat
        initializeEventListeners();
        
        // Verileri yükle
        await loadTasks();
        
        // Real-time subscription'ı başlat
        startRealtimeSubscription();
        
        // Loading overlay'ı gizle
        hideLoading();
        
        console.log('✅ Uygulama başarıyla başlatıldı');
        showSuccess('Dashboard yüklendi!');
    } catch (error) {
        console.error('❌ Uygulama başlatma hatası:', error);
        showError('Uygulama başlatılırken hata oluştu: ' + error.message);
        hideLoading();
    }
}

async function loadTasks() {
    try {
        showLoading();
        console.log('📊 Görevler yükleniyor...');
        
        tasks = await TaskAPI.getAllTasks();
        console.log('✅ Görevler yüklendi:', tasks.length, 'görev');
        
        // Supabase'den gelen verileri uygun formata çevir
        tasks = tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description || '',
            category: task.category,
            timePhase: task.time_phase,
            status: task.status,
            responsible: task.responsible || '',
            createdBy: task.created_by || '',
            startDate: task.start_date || '',
            endDate: task.end_date || '',
            duration: task.duration || 0,
            progress: task.progress || 0
        }));
        
        updateFilteredTasks();
        updateResponsibleFilter();
        updateNotificationBadge();
        renderContent();
        updateConnectionStatus(true);
    } catch (error) {
        console.error('❌ Görevler yüklenirken hata:', error);
        showError('Veriler yüklenirken hata oluştu');
        updateConnectionStatus(false);
    } finally {
        hideLoading();
    }
}

function startRealtimeSubscription() {
    if (realtimeSubscription) {
        TaskAPI.unsubscribeFromChanges(realtimeSubscription);
    }
    
    realtimeSubscription = TaskAPI.subscribeToChanges((payload) => {
        console.log('🔄 Real-time update:', payload);
        handleRealtimeUpdate(payload);
    });
}

function handleRealtimeUpdate(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
        case 'INSERT':
            const newTask = convertSupabaseTask(newRecord);
            tasks.push(newTask);
            showSuccess('Yeni görev eklendi: ' + newTask.title);
            break;
            
        case 'UPDATE':
            const updatedTask = convertSupabaseTask(newRecord);
            const index = tasks.findIndex(t => t.id === updatedTask.id);
            if (index !== -1) {
                tasks[index] = updatedTask;
                showSuccess('Görev güncellendi: ' + updatedTask.title);
            }
            break;
            
        case 'DELETE':
            tasks = tasks.filter(t => t.id !== oldRecord.id);
            showSuccess('Görev silindi');
            break;
    }
    
    updateFilteredTasks();
    updateResponsibleFilter();
    updateNotificationBadge();
    renderContent();
}

function convertSupabaseTask(supabaseTask) {
    return {
        id: supabaseTask.id,
        title: supabaseTask.title,
        description: supabaseTask.description || '',
        category: supabaseTask.category,
        timePhase: supabaseTask.time_phase,
        status: supabaseTask.status,
        responsible: supabaseTask.responsible || '',
        createdBy: supabaseTask.created_by || '',
        startDate: supabaseTask.start_date || '',
        endDate: supabaseTask.end_date || '',
        duration: supabaseTask.duration || 0,
        progress: supabaseTask.progress || 0
    };
}

function initializeEventListeners() {
    console.log('🎯 Event listener'lar başlatılıyor...');
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentView = e.currentTarget.dataset.view;
            updateNavigation();
            renderContent();
        });
    });

    // Search and filters
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            searchTerm = e.target.value;
            updateFilteredTasks();
            renderContent();
        }, 300));
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            filters.status = e.target.value;
            updateFilteredTasks();
            renderContent();
        });
    }

    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            filters.category = e.target.value;
            updateFilteredTasks();
            renderContent();
        });
    }

    const responsibleFilter = document.getElementById('responsibleFilter');
    if (responsibleFilter) {
        responsibleFilter.addEventListener('change', (e) => {
            filters.responsible = e.target.value;
            updateFilteredTasks();
            renderContent();
        });
    }

    const timePhaseFilter = document.getElementById('timePhaseFilter');
    if (timePhaseFilter) {
        timePhaseFilter.addEventListener('change', (e) => {
            filters.timePhase = e.target.value;
            updateFilteredTasks();
            renderContent();
        });
    }

    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            clearFilters();
        });
    }

    // Buttons
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            openTaskModal();
        });
    }

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportTasks();
        });
    }

    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            importExcel();
        });
    }

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadTasks();
        });
    }

    // Modal events
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            closeTaskModal();
        });
    }

    const cancelTaskBtn = document.getElementById('cancelTaskBtn');
    if (cancelTaskBtn) {
        cancelTaskBtn.addEventListener('click', () => {
            closeTaskModal();
        });
    }

    const saveTaskBtn = document.getElementById('saveTaskBtn');
    if (saveTaskBtn) {
        saveTaskBtn.addEventListener('click', () => {
            saveTask();
        });
    }

    const taskStatus = document.getElementById('taskStatus');
    if (taskStatus) {
        taskStatus.addEventListener('change', (e) => {
            const progressContainer = document.getElementById('progressContainer');
            if (progressContainer) {
                if (e.target.value === 'ongoing') {
                    progressContainer.classList.remove('hidden');
                } else {
                    progressContainer.classList.add('hidden');
                }
            }
        });
    }

    const taskProgress = document.getElementById('taskProgress');
    if (taskProgress) {
        taskProgress.addEventListener('input', (e) => {
            const progressValue = document.getElementById('progressValue');
            if (progressValue) {
                progressValue.textContent = e.target.value;
            }
        });
    }
}

// Utility functions
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

function showError(message) {
    console.error('🚨 Error:', message);
    const toast = document.getElementById('errorToast');
    const messageEl = document.getElementById('errorMessage');
    if (toast && messageEl) {
        messageEl.textContent = message;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 5000);
    }
}

function showSuccess(message) {
    console.log('✅ Success:', message);
    const toast = document.getElementById('successToast');
    const messageEl = document.getElementById('successMessage');
    if (toast && messageEl) {
        messageEl.textContent = message;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

function updateConnectionStatus(isConnected) {
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;
    
    const dot = statusEl.querySelector('div');
    const text = statusEl.querySelector('span');
    
    if (dot && text) {
        if (isConnected) {
            dot.className = 'w-2 h-2 bg-green-500 rounded-full mr-2';
            text.textContent = 'Bağlı';
            text.className = 'text-green-600';
        } else {
            dot.className = 'w-2 h-2 bg-red-500 rounded-full mr-2';
            text.textContent = 'Bağlantı Hatası';
            text.className = 'text-red-600';
        }
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function clearFilters() {
    searchTerm = '';
    filters = { status: 'all', category: 'all', responsible: 'all', timePhase: 'all' };
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.value = 'all';
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) categoryFilter.value = 'all';
    
    const responsibleFilter = document.getElementById('responsibleFilter');
    if (responsibleFilter) responsibleFilter.value = 'all';
    
    const timePhaseFilter = document.getElementById('timePhaseFilter');
    if (timePhaseFilter) timePhaseFilter.value = 'all';
    
    updateFilteredTasks();
    renderContent();
}

// Task management functions
async function saveTask() {
    const saveBtn = document.getElementById('saveTaskBtn');
    const saveBtnText = document.getElementById('saveTaskBtnText');
    
    try {
        // Form validation
        const titleEl = document.getElementById('taskTitle');
        if (!titleEl) return;
        
        const title = titleEl.value.trim();
        if (!title) {
            showError('Görev başlığı gereklidir!');
            return;
        }

        // Disable button
        if (saveBtn) saveBtn.disabled = true;
        if (saveBtnText) saveBtnText.textContent = 'Kaydediliyor...';

        const taskData = {
            title: title,
            description: document.getElementById('taskDescription')?.value.trim() || '',
            category: document.getElementById('taskCategory')?.value || 'sourcing',
            timePhase: document.getElementById('taskTimePhase')?.value || '30_days',
            status: document.getElementById('taskStatus')?.value || 'pending',
            responsible: document.getElementById('taskResponsible')?.value.trim() || '',
            createdBy: document.getElementById('taskCreatedBy')?.value.trim() || '',
            startDate: document.getElementById('taskStartDate')?.value || '',
            endDate: document.getElementById('taskEndDate')?.value || '',
            duration: parseInt(document.getElementById('taskDuration')?.value) || 0,
            progress: parseInt(document.getElementById('taskProgress')?.value) || 0
        };

        let result;
        if (editingTask) {
            result = await TaskAPI.updateTask(editingTask.id, taskData);
            showSuccess('Görev başarıyla güncellendi');
        } else {
            result = await TaskAPI.createTask(taskData);
            showSuccess('Yeni görev başarıyla oluşturuldu');
        }

        closeTaskModal();
        
    } catch (error) {
        console.error('Görev kaydetme hatası:', error);
        showError('Görev kaydedilirken hata oluştu');
    } finally {
        if (saveBtn) saveBtn.disabled = false;
        if (saveBtnText) saveBtnText.textContent = 'Kaydet';
    }
}

async function updateTaskStatus(taskId, newStatus) {
    try {
        await TaskAPI.updateTaskStatus(taskId, newStatus);
    } catch (error) {
        console.error('Durum güncellenirken hata:', error);
        showError('Görev durumu güncellenirken hata oluştu');
    }
}

async function updateTaskTimePhase(taskId, newTimePhase) {
    try {
        await TaskAPI.updateTaskTimePhase(taskId, newTimePhase);
    } catch (error) {
        console.error('Zaman dilimi güncellenirken hata:', error);
        showError('Görev zaman dilimi güncellenirken hata oluştu');
    }
}

// UI rendering functions
function updateFilteredTasks() {
    filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            task.responsible.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = filters.status === 'all' || task.status === filters.status;
        const matchesCategory = filters.category === 'all' || task.category === filters.category;
        const matchesResponsible = filters.responsible === 'all' || task.responsible.includes(filters.responsible);
        const matchesTimePhase = filters.timePhase === 'all' || task.timePhase === filters.timePhase;

        return matchesSearch && matchesStatus && matchesCategory && matchesResponsible && matchesTimePhase;
    });
}

function updateNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.view === currentView) {
            btn.className = 'nav-btn flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-purple-100 text-purple-700';
        } else {
            btn.className = 'nav-btn flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-100';
        }
    });
}

function updateResponsibleFilter() {
    const responsibleFilter = document.getElementById('responsibleFilter');
    if (!responsibleFilter) return;
    
    const uniqueResponsibles = [...new Set(tasks.flatMap(task => 
        task.responsible.split(', ').map(r => r.trim()).filter(r => r)
    ))].sort();

    const currentValue = responsibleFilter.value;
    responsibleFilter.innerHTML = '<option value="all">Tüm Sorumlu Kişiler</option>';
    uniqueResponsibles.forEach(person => {
        const option = document.createElement('option');
        option.value = person;
        option.textContent = person;
        responsibleFilter.appendChild(option);
    });
    responsibleFilter.value = currentValue;
}

function updateNotificationBadge() {
    const ongoingTasks = tasks.filter(task => task.status === 'ongoing');
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (ongoingTasks.length > 0) {
            badge.textContent = ongoingTasks.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

function renderContent() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    
    switch(currentView) {
        case 'dashboard':
            mainContent.innerHTML = renderDashboardView();
            break;
        case 'roadmap':
            mainContent.innerHTML = renderRoadmapView();
            initializeRoadmapEvents();
            break;
        case 'gantt':
            mainContent.innerHTML = renderGanttView();
            break;
        case 'activities':
            mainContent.innerHTML = renderActivitiesView();
            break;
    }
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// View rendering functions
function renderDashboardView() {
    const progress = calculateProgress();
    
    return `
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-purple-50 border border-purple-200 p-6 rounded-lg shadow-lg">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-purple-100">
                        <i data-lucide="bar-chart-3" class="h-6 w-6 text-purple-600"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-purple-600">Toplam Görev</p>
                        <p class="text-2xl font-semibold text-purple-900">${filteredTasks.length}</p>
                    </div>
                </div>
            </div>

            <div class="bg-purple-50 border border-purple-200 p-6 rounded-lg shadow-lg">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-green-100">
                        <i data-lucide="check-circle" class="h-6 w-6 text-green-600"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-purple-600">Tamamlanan</p>
                        <p class="text-2xl font-semibold text-purple-900">${filteredTasks.filter(task => task.status === 'done').length}</p>
                    </div>
                </div>
            </div>

            <div class="bg-purple-50 border border-purple-200 p-6 rounded-lg shadow-lg">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-yellow-100">
                        <i data-lucide="alert-circle" class="h-6 w-6 text-yellow-600"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-purple-600">Devam Eden</p>
                        <p class="text-2xl font-semibold text-purple-900">${filteredTasks.filter(task => task.status === 'ongoing').length}</p>
                    </div>
                </div>
            </div>

            <div class="bg-purple-50 border border-purple-200 p-6 rounded-lg shadow-lg">
                <div class="flex items-center">
                    <div class="p-3 rounded-full bg-gray-100">
                        <i data-lucide="clock" class="h-6 w-6 text-gray-600"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-purple-600">Bekleyen</p>
                        <p class="text-2xl font-semibold text-purple-900">${filteredTasks.filter(task => task.status === 'pending').length}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Progress Overview -->
        <div class="bg-purple-50 border border-purple-200 p-6 rounded-lg shadow-lg">
            <h3 class="text-lg font-semibold mb-4 text-purple-900">Genel İlerleme</h3>
            <div class="w-full bg-purple-200 rounded-full h-4 mb-4">
                <div class="bg-gradient-to-r from-green-500 to-purple-500 h-4 rounded-full transition-all duration-500" style="width: ${progress.donePercentage + progress.ongoingPercentage}%"></div>
            </div>
            <div class="flex justify-between text-sm text-purple-600">
                <span>%${Math.round(progress.donePercentage)} Tamamlandı</span>
                <span>%${Math.round(progress.ongoingPercentage)} Devam Ediyor</span>
                <span>%${Math.round(100 - progress.donePercentage - progress.ongoingPercentage)} Kalan</span>
            </div>
        </div>

        <!-- Recent Activities -->
        <div class="bg-purple-50 border border-purple-200 p-6 rounded-lg shadow-lg">
            <h3 class="text-lg font-semibold mb-4 text-purple-900">Son Aktiviteler</h3>
            <div class="space-y-3">
                ${filteredTasks
                    .filter(task => task.status === 'ongoing' || task.status === 'done')
                    .slice(0, 5)
                    .map(task => `
                        <div class="flex items-center space-x-3">
                            <div class="w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-green-500' : 'bg-yellow-500'}"></div>
                            <span class="text-sm text-purple-800">${task.title}</span>
                            <span class="text-xs text-purple-600">- ${task.responsible}</span>
                        </div>
                    `).join('')}
            </div>
        </div>
    `;
}

function renderRoadmapView() {
    return `
        <div class="bg-white rounded-lg overflow-hidden shadow-lg">
            <div class="p-4">
                <h3 class="text-lg font-semibold">Roadmap Görünümü</h3>
                <p class="text-gray-600">Görevleri zaman dilimlerine göre görüntüleyin</p>
            </div>
        </div>
    `;
}

function renderGanttView() {
    return `
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
            <div class="p-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold">Gantt Şeması Görünümü</h3>
                <p class="text-gray-600">Görevlerin zaman çizelgesi</p>
            </div>
        </div>
    `;
}

function renderActivitiesView() {
    return `
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
            <div class="p-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold">Aktiviteler</h3>
                <p class="text-gray-600">Son aktiviteleri görüntüleyin</p>
            </div>
        </div>
    `;
}

function initializeRoadmapEvents() {
    // Roadmap events will be added here
}

// Modal functions
function openTaskModal(task = null) {
    editingTask = task;
    const modal = document.getElementById('taskModal');
    if (!modal) return;
    
    const title = document.getElementById('modalTitle');
    if (title) {
        title.textContent = task ? 'Görev Düzenle' : 'Yeni Görev Ekle';
    }
    
    // Fill form
    const fields = {
        'taskTitle': task?.title || '',
        'taskDescription': task?.description || '',
        'taskCategory': task?.category || 'sourcing',
        'taskTimePhase': task?.timePhase || '30_days',
        'taskStatus': task?.status || 'pending',
        'taskResponsible': task?.responsible || '',
        'taskCreatedBy': task?.createdBy || '',
        'taskStartDate': task?.startDate || '',
        'taskEndDate': task?.endDate || '',
        'taskDuration': task?.duration || 0,
        'taskProgress': task?.progress || 0
    };
    
    Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    });
    
    const progressValue = document.getElementById('progressValue');
    if (progressValue) {
        progressValue.textContent = task?.progress || 0;
    }
    
    // Show/hide progress
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) {
        if (task?.status === 'ongoing') {
            progressContainer.classList.remove('hidden');
        } else {
            progressContainer.classList.add('hidden');
        }
    }
    
    modal.classList.remove('hidden');
    
    const titleInput = document.getElementById('taskTitle');
    if (titleInput) {
        titleInput.focus();
    }
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    editingTask = null;
}

// Import/Export functions
function exportTasks() {
    try {
        const headers = ['Başlık', 'Açıklama', 'Kategori', 'Zaman Dilimi', 'Durum', 'Sorumlu', 'Oluşturan', 'Başlangıç Tarihi', 'Bitiş Tarihi', 'Süre', 'İlerleme'];
        const data = tasks.map(task => [
            `"${task.title}"`,
            `"${task.description}"`,
            `"${categories[task.category]?.name || task.category}"`,
            `"${timePhases[task.timePhase]?.name || task.timePhase}"`,
            `"${statusConfig[task.status]?.name || task.status}"`,
            `"${task.responsible}"`,
            `"${task.createdBy || ''}"`,
            task.startDate,
            task.endDate,
            task.duration,
            task.progress
        ]);

        const csvContent = [headers.join(','), ...data.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kyrgyzstan_project_tasks_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showSuccess('Veriler Excel formatında dışa aktarıldı');
    } catch (error) {
        console.error('Export hatası:', error);
        showError('Dışa aktarma sırasında hata oluştu');
    }
}

function importExcel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            showLoading();
            const content = await readFileAsText(file);
            const lines = content.split('\n');
            
            if (lines.length > 1) {
                const importedTasks = [];
                
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    const row = line.split(',').map(cell => cell.replace(/"/g, '').trim());
                    if (row.length > 0 && row[0]) {
                        const taskData = {
                            title: row[0] || '',
                            description: row[1] || '',
                            category: getCategoryKey(row[2]) || 'sourcing',
                            timePhase: getTimePhaseKey(row[3]) || '30_days',
                            status: getStatusKey(row[4]) || 'pending',
                            responsible: row[5] || '',
                            createdBy: row[6] || '',
                            startDate: row[7] || '',
                            endDate: row[8] || '',
                            duration: parseInt(row[9]) || 0,
                            progress: parseInt(row[10]) || 0
                        };
                        
                        if (taskData.title.trim()) {
                            importedTasks.push(taskData);
                        }
                    }
                }

                if (importedTasks.length > 0) {
                    await TaskAPI.bulkImportTasks(importedTasks);
                    showSuccess(`${importedTasks.length} görev başarıyla içe aktarıldı!`);
                } else {
                    showError('Dosyada geçerli görev bulunamadı.');
                }
            }
        } catch (error) {
            console.error('Import error:', error);
            showError('Dosya içe aktarma hatası. Lütfen dosya formatını kontrol edin.');
        } finally {
            hideLoading();
        }
    };
    input.click();
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

// Helper functions for import
function getCategoryKey(categoryName) {
    const categoryMap = {
        'KAYNAK BULMA': 'sourcing',
        'İŞE ALIM': 'hiring',
        'YERLEŞTİRME VE HUKUK': 'placement_legal'
    };
    return categoryMap[categoryName] || 'sourcing';
}

function getTimePhaseKey(phaseName) {
    const phaseMap = {
        '30 Gün': '30_days',
        '60 Gün': '60_days',
        '90 Gün': '90_days',
        'Yıl Sonu': 'end_of_year'
    };
    return phaseMap[phaseName] || '30_days';
}

function getStatusKey(statusName) {
    const statusMap = {
        'Tamamlandı': 'done',
        'Devam Ediyor': 'ongoing',
        'Beklemede': 'pending'
    };
    return statusMap[statusName] || 'pending';
}

// Helper functions
function calculateProgress() {
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(task => task.status === 'done').length;
    const ongoingTasks = tasks.filter(task => task.status === 'ongoing').length;
    const pendingTasks = tasks.filter(task => task.status === 'pending').length;

    return {
        total: totalTasks,
        done: doneTasks,
        ongoing: ongoingTasks,
        pending: pendingTasks,
        donePercentage: totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0,
        ongoingPercentage: totalTasks > 0 ? (ongoingTasks / totalTasks) * 100 : 0
    };
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (realtimeSubscription) {
        TaskAPI.unsubscribeFromChanges(realtimeSubscription);
    }
});

console.log('📄 app.js dosyası yüklendi');
