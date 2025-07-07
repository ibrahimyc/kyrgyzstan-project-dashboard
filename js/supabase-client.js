// js/supabase-client.js
// Supabase Client Configuration ve API İşlemleri

// Supabase client'ı başlat (değişkenler index.html'de tanımlanmış)
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
            return data;
        } catch (error) {
            console.error('Görev oluşturulurken hata:', error);
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
            return data;
        } catch (error) {
            console.error('Görev durumu güncellenirken hata:', error);
            throw error;
        }
    }

    // Görev zaman dilimi güncelle
    static as
