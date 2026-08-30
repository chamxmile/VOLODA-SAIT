// ============================================================
// АДМИН-ПАНЕЛЬ
// ============================================================

// Проверка, является ли пользователь админом
function isAdmin() {
    return currentUserPermissions.is_admin === true;
}

// Загрузка всех пользователей (только для админа)
async function loadAdminUsers() {
    if (!isAdmin()) return;
    
    const container = document.getElementById('adminUsersList');
    if (!container) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет пользователей</div>';
            return;
        }
        
        container.innerHTML = '';
        data.forEach((user) => {
            const item = document.createElement('div');
            item.className = 'admin-user-item';
            
            item.innerHTML = `
                <div class="admin-user-info">
                    <div class="admin-user-name">${escapeHTML(user.first_name || 'Гость')} ${escapeHTML(user.last_name || '')}</div>
                    <div class="admin-user-id">ID: ${user.telegram_user_id}</div>
                    <div class="admin-user-status">
                        <span class="badge ${user.can_upload ? 'badge-success' : 'badge-danger'}">${user.can_upload ? '✅ Может загружать' : '❌ Не может загружать'}</span>
                        ${user.is_admin ? '<span class="badge badge-admin">👑 Админ</span>' : ''}
                        ${user.is_blocked ? '<span class="badge badge-blocked">🚫 Заблокирован</span>' : ''}
                    </div>
                </div>
                <div class="admin-user-actions">
                    <button class="admin-btn admin-btn-toggle" data-user-id="${user.telegram_user_id}" data-action="upload">
                        ${user.can_upload ? '🔒 Забрать права' : '🔓 Дать права'}
                    </button>
                    ${!user.is_admin ? `
                        <button class="admin-btn admin-btn-block" data-user-id="${user.telegram_user_id}" data-action="block">
                            ${user.is_blocked ? '🔓 Разблокировать' : '🚫 Заблокировать'}
                        </button>
                    ` : ''}
                </div>
            `;
            
            container.appendChild(item);
        });
        
        // Добавляем обработчики
        container.querySelectorAll('.admin-btn-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                toggleUserUpload(btn.dataset.userId);
            });
        });
        
        container.querySelectorAll('.admin-btn-block').forEach(btn => {
            btn.addEventListener('click', () => {
                toggleUserBlock(btn.dataset.userId);
            });
        });
        
    } catch (e) {
        console.error('❌ Ошибка загрузки пользователей:', e);
        container.innerHTML = '<div class="empty-state">❌ Ошибка загрузки</div>';
    }
}

// Загрузка всех треков (только для админа)
async function loadAdminTracks() {
    if (!isAdmin()) return;
    
    const container = document.getElementById('adminTracksList');
    if (!container) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('tracks')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет треков</div>';
            return;
        }
        
        container.innerHTML = '';
        data.forEach((track) => {
            const item = document.createElement('div');
            item.className = 'admin-track-item';
            
            item.innerHTML = `
                <div class="admin-track-info">
                    <div class="admin-track-title">${escapeHTML(track.title)}</div>
                    <div class="admin-track-artist">${escapeHTML(track.artist_name || 'Неизвестный')}</div>
                    <div class="admin-track-id">ID: ${track.id}</div>
                </div>
                <button class="admin-btn admin-btn-delete" data-track-id="${track.id}">🗑️ Удалить</button>
            `;
            
            container.appendChild(item);
        });
        
        container.querySelectorAll('.admin-btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                adminDeleteTrack(btn.dataset.trackId);
            });
        });
        
    } catch (e) {
        console.error('❌ Ошибка загрузки треков:', e);
        container.innerHTML = '<div class="empty-state">❌ Ошибка загрузки</div>';
    }
}

// Управление правами загрузки
async function toggleUserUpload(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('can_upload')
            .eq('telegram_user_id', userId)
            .single();
        
        if (error) throw error;
        
        const newStatus = !data.can_upload;
        const { error: updateError } = await supabaseClient
            .from('users')
            .update({ can_upload: newStatus })
            .eq('telegram_user_id', userId);
        
        if (updateError) throw updateError;
        
        console.log(`✅ Права загрузки для ${userId}: ${newStatus ? 'даны' : 'забраны'}`);
        await loadAdminUsers();
    } catch (e) {
        console.error('❌ Ошибка:', e);
        alert('Ошибка: ' + e.message);
    }
}

// Блокировка/разблокировка пользователя
async function toggleUserBlock(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('is_blocked')
            .eq('telegram_user_id', userId)
            .single();
        
        if (error) throw error;
        
        const newStatus = !data.is_blocked;
        const { error: updateError } = await supabaseClient
            .from('users')
            .update({ is_blocked: newStatus })
            .eq('telegram_user_id', userId);
        
        if (updateError) throw updateError;
        
        console.log(`✅ Блокировка для ${userId}: ${newStatus ? 'заблокирован' : 'разблокирован'}`);
        await loadAdminUsers();
    } catch (e) {
        console.error('❌ Ошибка:', e);
        alert('Ошибка: ' + e.message);
    }
}

// Админ удаление трека
async function adminDeleteTrack(trackId) {
    if (!confirm('Удалить этот трек?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('tracks')
            .delete()
            .eq('id', trackId);
        
        if (error) throw error;
        
        console.log('✅ Трек удалён админом');
        await loadAdminTracks();
        await loadTracksToHome();
    } catch (e) {
        console.error('❌ Ошибка:', e);
        alert('Ошибка: ' + e.message);
    }
}