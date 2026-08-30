// ============================================================
// ИЗБРАННОЕ / ЛАЙКИ
// ============================================================

// Проверка, добавлен ли трек в избранное
async function isTrackFavorite(trackId) {
    if (!tgUserId) return false;
    
    try {
        const { data, error } = await supabaseClient
            .from('favorites')
            .select('id')
            .eq('user_id', tgUserId)
            .eq('track_id', trackId)
            .maybeSingle();
        
        if (error) throw error;
        return !!data;
    } catch (e) {
        console.warn('⚠️ Ошибка проверки избранного:', e);
        return false;
    }
}

// Добавить в избранное
async function addToFavorites(trackId) {
    if (!tgUserId) {
        alert('Войдите в аккаунт');
        return false;
    }
    
    try {
        const { error } = await supabaseClient
            .from('favorites')
            .insert({ user_id: tgUserId, track_id: trackId });
        
        if (error) throw error;
        
        console.log('❤️ Трек добавлен в избранное');
        return true;
    } catch (e) {
        console.error('❌ Ошибка добавления в избранное:', e);
        alert('Ошибка: ' + e.message);
        return false;
    }
}

// Удалить из избранного
async function removeFromFavorites(trackId) {
    if (!tgUserId) return false;
    
    try {
        const { error } = await supabaseClient
            .from('favorites')
            .delete()
            .eq('user_id', tgUserId)
            .eq('track_id', trackId);
        
        if (error) throw error;
        
        console.log('💔 Трек удалён из избранного');
        return true;
    } catch (e) {
        console.error('❌ Ошибка удаления из избранного:', e);
        return false;
    }
}

// Переключить избранное
async function toggleFavorite(trackId) {
    const isFav = await isTrackFavorite(trackId);
    if (isFav) {
        return await removeFromFavorites(trackId);
    } else {
        return await addToFavorites(trackId);
    }
}

// Получить список избранных треков
async function getFavoriteTracks() {
    if (!tgUserId) return [];
    
    try {
        const { data, error } = await supabaseClient
            .from('favorites')
            .select('track_id, tracks(*)')
            .eq('user_id', tgUserId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data?.map(item => item.tracks) || [];
    } catch (e) {
        console.error('❌ Ошибка загрузки избранного:', e);
        return [];
    }
}