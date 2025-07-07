// js/supabase-client.js
// Supabase Client Configuration ve API İşlemleri

// Supabase client'ı başlat
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// API Fonksiyonları
class TaskAPI {
    // Tüm görevleri getir
    static async getAllTasks() {
        try {
            const { data, error } = await supabaseClient
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Görevler alınırken hata:', error);
            return [];
        }
    }

    // Yeni görev ekle
    static async createTask(taskData) {
        try {
            const { data, error } = await supabaseClient
                .from('tasks')
                .insert([{
                    title: taskData.title,
                    description: taskData.description,
                    category: taskData.category,
                    time_phase: taskData.timePhase,
                    status: taskData.status,
                    responsible: taskData.responsible,
                    created_by: taskData.createdBy,
                    start_date: taskData.startDate,
                    end_date: taskData.endDate,
                    duration: taskData.duration,
                    progress: taskData.progress
                }])
                .select()
                .single();

            if (error) throw error;
            
            // Aktivite kaydı ekle
            await this.addActivityLog(data.id, 'created', data);
            
            return data;
        } catch (error) {
            console.error('Görev oluşturulurken hata:', error);
            throw error;
        }
    }

    // Görev güncelle
    static async updateTask(taskId, taskData) {
        try {
            const { data, error } = await supabaseClient
                .from('tasks')
                .update({
                    title: taskData.title,
                    description: taskData.description,
                    category: taskData.category,
                    time_phase: taskData.timePhase,
                    status: taskData.status,
                    responsible: taskData.responsible,
                    created_by: taskData.createdBy,
                    start_date: taskData.startDate,
                    end_date: taskData.endDate,
                    duration: taskData.duration,
                    progress: taskData.progress
                })
                .eq('id', taskId)
                .select()
                .single();

            if (error) throw error;
            
            // Aktivite kaydı ekle
            await this.addActivityLog(taskId, 'updated', data);
            
            return data;
        } catch (error) {
            console.error('Görev güncellenirken hata:', error);
            throw error;
        }
    }

    // Görev durumu güncelle
    static async updateTaskStatus(taskId, newStatus) {
        try {
            const { data, error } = await supabaseClient
                .from('tasks')
                .update({ status: newStatus })
                .eq('id', taskId)
                .select()
                .single();

            if (error) throw error;
            
            // Aktivite kaydı ekle
            await this.addActivityLog(taskId, 'status_changed', { 
                newStatus: newStatus,
                task: data 
            });
            
            return data;
        } catch (error) {
            console.error('Görev durumu güncellenirken hata:', error);
            throw error;
        }
    }

    // Görev zaman dilimi güncelle
    static async updateTaskTimePhase(taskId, newTimePhase) {
        try {
            const { data, error } = await supabaseClient
                .from('tasks')
                .update({ time_phase: newTimePhase })
                .eq('id', taskId)
                .select()
                .single();

            if (error) throw error;
            
            // Aktivite kaydı ekle
            await this.addActivityLog(taskId, 'updated', { 
                field: 'time_phase',
                newValue: newTimePhase,
                task: data 
            });
            
            return data;
        } catch (error) {
            console.error('Görev zaman dilimi güncellenirken hata:', error);
            throw error;
        }
    }

    // Aktivite kaydı ekle
    static async addActivityLog(taskId, type, details = {}) {
        try {
            const { error } = await supabaseClient
                .from('activity_log')
                .insert([{
                    task_id: taskId,
                    type: type,
                    details: details
                }]);

            if (error) throw error;
        } catch (error) {
            console.error('Aktivite kaydı eklenirken hata:', error);
        }
    }

    // Real-time değişiklikleri dinle
    static subscribeToChanges(callback) {
        const subscription = supabaseClient
            .channel('tasks-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'tasks' }, 
                callback
            )
            .subscribe();

        return subscription;
    }

    // Subscription'ı kaldır
    static unsubscribeFromChanges(subscription) {
        supabaseClient.removeChannel(subscription);
    }

    // Bulk import işlemi
    static async bulkImportTasks(tasksArray) {
        try {
            const { data, error } = await supabaseClient
                .from('tasks')
                .insert(tasksArray.map(task => ({
                    title: task.title,
                    description: task.description,
                    category: task.category,
                    time_phase: task.timePhase,
                    status: task.status,
                    responsible: task.responsible,
                    created_by: task.createdBy,
                    start_date: task.startDate,
                    end_date: task.endDate,
                    duration: task.duration,
                    progress: task.progress
                })))
                .select();

            if (error) throw error;
            
            // Bulk aktivite kaydı
            for (const taskData of data) {
                await this.addActivityLog(taskData.id, 'created', taskData);
            }
            
            return data;
        } catch (error) {
            console.error('Bulk import hatası:', error);
            throw error;
        }
    }
}
