// ============================================================
// ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
// ============================================================

// ============================================================
// ПОЛУЧЕНИЕ АВАТАРА ПОЛЬЗОВАТЕЛЯ ЧЕРЕЗ TELEGRAM BOT API
// ============================================================

// ⚠️ ЗАМЕНИ НА СВОЙ ТОКЕН БОТА!
const TELEGRAM_BOT_TOKEN = '8738300634:AAEpt28j3rvGyqibMI8yPWFZLJCVhxEi0lM';

async function getUserAvatar(userId) {
    if (!userId) return null;
    
    // Если это mock-пользователь — не пытаемся загрузить аватар
    if (userId === 123456789 || userId === 987654321) {
        console.log('ℹ️ Mock-пользователь, пропускаем загрузку аватара');
        return null;
    }
    
    try {
        // Проверяем кеш
        const cached = localStorage.getItem(`avatar_${userId}`);
        if (cached) {
            const { url, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < 3600000) {
                return url;
            }
        }
        
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUserProfilePhotos?user_id=${userId}&limit=1`
        );
        const data = await response.json();
        
        if (data.ok && data.result && data.result.total_count > 0) {
            const photo = data.result.photos[0][0];
            const fileId = photo.file_id;
            
            const fileResponse = await fetch(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
            );
            const fileData = await fileResponse.json();
            
            if (fileData.ok) {
                const avatarUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
                
                localStorage.setItem(`avatar_${userId}`, JSON.stringify({
                    url: avatarUrl,
                    timestamp: Date.now()
                }));
                
                return avatarUrl;
            }
        }
        return null;
    } catch (e) {
        console.warn('⚠️ Не удалось загрузить аватар:', e);
        return null;
    }
}

// ============================================================
// ЗАГРУЗКА ПРОЕКТОВ ПОЛЬЗОВАТЕЛЯ
// ============================================================

async function loadMyTracks() {
    const container = document.getElementById('myTracksList');
    const countEl = document.getElementById('myTracksCount');
    const statTracks = document.getElementById('statTracks');
    
    if (!container || !tgUserId) return;
    
    try {
        console.log('📥 Загрузка моих проектов...');
        
        const { data, error } = await supabaseClient
            .from('tracks')
            .select('*')
            .eq('owner_id', tgUserId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log('✅ Загружено проектов:', data?.length || 0);
        
        if (countEl) countEl.textContent = data?.length || 0;
        if (statTracks) statTracks.textContent = data?.length || 0;
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>🎵 У вас пока нет проектов</p>
                    <p style="font-size: 13px; color: var(--muted); margin-top: 8px;">
                        Перейдите на вкладку «Загрузить» и создайте свой первый трек!
                    </p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        data.forEach((track) => {
            const item = document.createElement('div');
            item.className = 'my-track-item';
            
            const coverUrl = track.cover_url || 'firstpage/cover.png';
            const isOwner = track.owner_id === tgUserId;
            const isAdmin = currentUserPermissions.is_admin === true;
            
            item.innerHTML = `
                <img src="${coverUrl}" alt="${track.title}" class="my-track-cover" 
                     onerror="this.src='firstpage/cover.png'">
                <div class="my-track-info">
                    <div class="my-track-title">${escapeHTML(track.title)}</div>
                    <div class="my-track-artist">${escapeHTML(track.artist_name || 'Неизвестный исполнитель')}</div>
                </div>
                <div class="my-track-actions">
                    <button class="my-track-btn my-track-btn-play" data-track-id="${track.id}">▶</button>
                    ${(isOwner || isAdmin) ? `
                        <button class="my-track-btn my-track-btn-edit" data-track-id="${track.id}">✎</button>
                        <button class="my-track-btn my-track-btn-delete" data-track-id="${track.id}">✕</button>
                    ` : ''}
                </div>
            `;
            
            const playBtn = item.querySelector('.my-track-btn-play');
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openTrackPage(track);
                });
            }
            
            const editBtn = item.querySelector('.my-track-btn-edit');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditModal(track);
                });
            }
            
            const deleteBtn = item.querySelector('.my-track-btn-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteTrack(track);
                });
            }
            
            item.addEventListener('click', () => {
                openTrackPage(track);
            });
            
            container.appendChild(item);
        });
        
    } catch (e) {
        console.error('❌ Ошибка загрузки проектов:', e);
        container.innerHTML = `<div class="empty-state">❌ Ошибка загрузки</div>`;
    }
}

// ============================================================
// ОБНОВЛЕНИЕ UI С АВАТАРОМ
// ============================================================

async function updateProfileAvatar(user) {
    if (!user || !user.id) return;
    
    const avatarEl = document.getElementById('profileAvatar');
    if (!avatarEl) return;
    
    const avatarUrl = await getUserAvatar(user.id);
    if (avatarUrl) {
        avatarEl.innerHTML = `<img src="${avatarUrl}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--border);">`;
    } else {
        // Показываем инициалы
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || '👤';
        avatarEl.textContent = initials;
        avatarEl.style.fontSize = '32px';
        avatarEl.style.display = 'flex';
        avatarEl.style.alignItems = 'center';
        avatarEl.style.justifyContent = 'center';
    }
}

// ============================================================
// УДАЛЕНИЕ ТРЕКА
// ============================================================

async function deleteTrack(track) {
    if (!confirm(`Удалить трек "${track.title}"?`)) return;
    
    try {
        console.log('🗑️ Удаление трека:', track.id);
        console.log('👤 Текущий пользователь:', tgUserId);
        console.log('👤 Владелец трека:', track.owner_id);
        console.log('👑 Админ:', currentUserPermissions.is_admin);
        
        const isOwner = track.owner_id === tgUserId;
        const isAdmin = currentUserPermissions.is_admin === true;
        
        if (!isOwner && !isAdmin) {
            alert('❌ У вас нет прав на удаление этого трека!');
            return;
        }
        
        const { error } = await supabaseClient
            .from('tracks')
            .delete()
            .eq('id', track.id);
        
        if (error) {
            console.error('❌ Ошибка удаления:', error);
            alert('Ошибка удаления: ' + error.message);
            return;
        }
        
        console.log('✅ Трек удалён из БД');
        
        try {
            if (track.audio_url) {
                const audioPath = track.audio_url.split('/').pop();
                await supabaseClient.storage
                    .from('tracks')
                    .remove([`audio/${audioPath}`]);
                console.log('✅ Аудио удалено');
            }
            
            if (track.cover_url) {
                const coverPath = track.cover_url.split('/').pop();
                await supabaseClient.storage
                    .from('tracks')
                    .remove([`covers/${coverPath}`]);
                console.log('✅ Обложка удалена');
            }
        } catch (e) {
            console.warn('⚠️ Не удалось удалить файлы:', e);
        }
        
        await loadMyTracks();
        await loadTracksToHome();
        
        if (currentTrack && currentTrack.id === track.id) {
            navigateTo('home');
        }
        
    } catch (e) {
        console.error('❌ Ошибка:', e);
        alert('Ошибка удаления: ' + e.message);
    }
}

// ============================================================
// РЕДАКТИРОВАНИЕ ТРЕКА (МОДАЛЬНОЕ ОКНО)
// ============================================================

function openEditModal(track) {
    const modal = document.createElement('div');
    modal.className = 'edit-modal-overlay';
    modal.id = 'editModal';
    
    modal.innerHTML = `
        <div class="edit-modal">
            <div class="edit-modal-header">
                <h2>Редактировать трек</h2>
                <button class="edit-modal-close" id="editModalClose">✕</button>
            </div>
            <div class="edit-modal-body">
                <div class="form-group">
                    <label>Название</label>
                    <input type="text" id="editTitle" value="${escapeHTML(track.title)}">
                </div>
                <div class="form-group">
                    <label>Исполнитель</label>
                    <input type="text" id="editArtist" value="${escapeHTML(track.artist_name || '')}">
                </div>
                <div class="form-group">
                    <label>Текст</label>
                    <textarea id="editLyrics" rows="6">${escapeHTML(track.lyrics || '')}</textarea>
                </div>
                <div class="form-group">
                    <label>Обложка</label>
                    <input type="file" accept=".jpg,.jpeg,.png,.webp" id="editCover">
                    <p style="font-size: 12px; color: var(--muted); margin-top: 4px;">Оставьте пустым, чтобы не менять</p>
                </div>
                <div class="form-group">
                    <label>Аудиофайл</label>
                    <input type="file" accept=".mp3,.wav,.m4a,.flac" id="editAudio">
                    <p style="font-size: 12px; color: var(--muted); margin-top: 4px;">Оставьте пустым, чтобы не менять</p>
                </div>
            </div>
            <div class="edit-modal-footer">
                <button class="edit-modal-btn cancel" id="editCancel">Отмена</button>
                <button class="edit-modal-btn save" id="editSave">Сохранить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    const closeModal = () => {
        modal.remove();
        document.body.style.overflow = '';
    };
    
    document.getElementById('editModalClose').addEventListener('click', closeModal);
    document.getElementById('editCancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    document.getElementById('editSave').addEventListener('click', async () => {
        const title = document.getElementById('editTitle').value.trim();
        const artist = document.getElementById('editArtist').value.trim();
        const lyrics = document.getElementById('editLyrics').value.trim();
        const coverFile = document.getElementById('editCover').files[0];
        const audioFile = document.getElementById('editAudio').files[0];
        
        if (!title) {
            alert('Введите название');
            return;
        }
        
        try {
            const updates = {
                title: title,
                artist_name: artist,
                lyrics: lyrics
            };
            
            if (coverFile) {
                const coverExt = coverFile.name.split('.').pop();
                const coverFileName = `cover_${Date.now()}_${tgUserId}.${coverExt}`;
                const { data: coverData, error: coverError } = await supabaseClient.storage
                    .from('tracks')
                    .upload(`covers/${coverFileName}`, coverFile, {
                        contentType: coverFile.type,
                        cacheControl: '3600'
                    });
                
                if (!coverError) {
                    const { data: coverUrlData } = supabaseClient.storage
                        .from('tracks')
                        .getPublicUrl(`covers/${coverFileName}`);
                    updates.cover_url = coverUrlData.publicUrl;
                }
            }
            
            if (audioFile) {
                const audioExt = audioFile.name.split('.').pop();
                const audioFileName = `track_${Date.now()}_${tgUserId}.${audioExt}`;
                const { data: audioData, error: audioError } = await supabaseClient.storage
                    .from('tracks')
                    .upload(`audio/${audioFileName}`, audioFile, {
                        contentType: audioFile.type,
                        cacheControl: '3600'
                    });
                
                if (!audioError) {
                    const { data: audioUrlData } = supabaseClient.storage
                        .from('tracks')
                        .getPublicUrl(`audio/${audioFileName}`);
                    updates.audio_url = audioUrlData.publicUrl;
                }
            }
            
            const { error } = await supabaseClient
                .from('tracks')
                .update(updates)
                .eq('id', track.id)
                .eq('owner_id', tgUserId);
            
            if (error) throw error;
            
            console.log('✅ Трек обновлён');
            closeModal();
            
            await loadMyTracks();
            await loadTracksToHome();
            
            if (currentTrack && currentTrack.id === track.id) {
                openTrackPage(track);
            }
            
        } catch (e) {
            console.error('❌ Ошибка сохранения:', e);
            alert('Ошибка сохранения: ' + e.message);
        }
    });
}

// Добавляем стили для модального окна
const editModalStyles = document.createElement('style');
editModalStyles.textContent = `
    .edit-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
        animation: modalFadeIn 0.3s ease;
    }
    .edit-modal {
        max-width: 500px;
        width: 100%;
        background: var(--card);
        border-radius: 16px;
        padding: 24px;
        animation: modalScaleIn 0.3s ease;
        max-height: 90vh;
        overflow-y: auto;
    }
    .edit-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    .edit-modal-header h2 {
        font-size: 20px;
        color: #fff;
    }
    .edit-modal-close {
        background: none;
        border: none;
        color: var(--muted);
        font-size: 24px;
        cursor: pointer;
        padding: 4px 8px;
    }
    .edit-modal-close:hover {
        color: #fff;
    }
    .edit-modal-body {
        margin-bottom: 20px;
    }
    .edit-modal-footer {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
    }
    .edit-modal-btn {
        padding: 10px 24px;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
    }
    .edit-modal-btn:hover {
        opacity: 0.85;
    }
    .edit-modal-btn.cancel {
        background: var(--card-light);
        color: var(--muted);
    }
    .edit-modal-btn.save {
        background: #ffeb3b;
        color: #000;
    }
`;
document.head.appendChild(editModalStyles);