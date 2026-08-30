// ============================================================
// ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
// ============================================================

// ============================================================
// ПОЛУЧЕНИЕ АВАТАРА ПОЛЬЗОВАТЕЛЯ ЧЕРЕЗ TELEGRAM BOT API
// ============================================================

// ⚠️ ЗАМЕНИ НА СВОЙ ТОКЕН БОТА!
const TELEGRAM_BOT_TOKEN = '8738300634:AAEpt28j3rvGyqibMI8yPWFZLJCVhxEi0lM';

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// ЗАГРУЗКА ИМЁН ФИТОВ ПО ID
// ============================================================

async function loadFeatNames(featIds) {
    if (!featIds || featIds.length === 0) return [];
    
    try {
        const { data, error } = await supabaseClient
            .from('artists')
            .select('name')
            .in('id', featIds);
        
        if (error) throw error;
        return data.map(a => a.name);
    } catch (e) {
        console.warn('⚠️ Не удалось загрузить имена фитов:', e);
        return [];
    }
}

// ============================================================
// ПОЛУЧЕНИЕ АВАТАРА
// ============================================================

async function getUserAvatar(userId) {
    if (!userId) return null;
    
    if (userId === 123456789 || userId === 987654321) {
        console.log('ℹ️ Mock-пользователь, пропускаем загрузку аватара');
        return null;
    }
    
    try {
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
// ЗАГРУЗКА ПРОЕКТОВ ПОЛЬЗОВАТЕЛЯ (С ФИТАМИ)
// ============================================================

async function loadMyTracks() {
    const container = document.getElementById('myTracksList');
    const countEl = document.getElementById('myTracksCount');
    const statTracks = document.getElementById('statTracks');
    const statPlays = document.getElementById('statPlays');
    
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
        
        let totalPlays = 0;
        if (data && data.length > 0) {
            totalPlays = data.reduce((sum, track) => sum + (track.plays || 0), 0);
        }
        
        if (countEl) countEl.textContent = data?.length || 0;
        if (statTracks) statTracks.textContent = data?.length || 0;
        if (statPlays) statPlays.textContent = totalPlays;
        
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
        
        for (const track of data) {
            const item = document.createElement('div');
            item.className = 'my-track-item';
            
            const coverUrl = track.cover_url || 'oblozchki/obl2.png';
            const isOwner = track.owner_id === tgUserId;
            const isAdmin = currentUserPermissions.is_admin === true;
            
            let artistDisplay = track.artist_name || 'Неизвестный исполнитель';
            if (track.feat_ids && track.feat_ids.length > 0) {
                const featNames = await loadFeatNames(track.feat_ids);
                if (featNames.length > 0) {
                    artistDisplay += ` feat. ${featNames.join(', ')}`;
                }
            }
            
            item.innerHTML = `
                <img src="${coverUrl}" alt="${track.title}" class="my-track-cover" 
                     onerror="this.src='firstpage/cover.png'">
                <div class="my-track-info">
                    <div class="my-track-title">${escapeHTML(track.title)}</div>
                    <div class="my-track-artist">${escapeHTML(artistDisplay)}</div>
                    <div class="my-track-plays">${track.plays || 0} прослушиваний</div>
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
        }
        
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
// ЗАГРУЗКА ИСПОЛНИТЕЛЕЙ ДЛЯ РЕДАКТИРОВАНИЯ ФИТОВ
// ============================================================

async function loadArtistsForEditFeats() {
    const list = document.getElementById('editFeatList');
    if (!list) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('artists')
            .select('name, id, user_id')
            .order('name');
        
        if (error) throw error;
        
        list.innerHTML = '';
        
        data.forEach(artist => {
            if (artist.user_id === tgUserId) return;
            const option = document.createElement('option');
            option.value = artist.name;
            option.dataset.artistId = artist.id;
            list.appendChild(option);
        });
    } catch (e) {
        console.error('❌ Ошибка загрузки исполнителей:', e);
    }
}

// ============================================================
// РЕДАКТИРОВАНИЕ ТРЕКА (МОДАЛЬНОЕ ОКНО С ФИТАМИ)
// ============================================================

function openEditModal(track) {
    console.log('🔍 openEditModal вызван для трека:', track.title);
    console.log('🔍 track.feat_ids:', track.feat_ids);
    
    let selectedEditFeats = [];
    
    async function loadEditFeatNames() {
        const featIds = track.feat_ids || [];
        console.log('🔍 Загружаем имена фитов для ID:', featIds);
        
        if (featIds.length === 0) {
            console.log('🔍 Нет фитов для загрузки');
            return [];
        }
        
        try {
            const { data, error } = await supabaseClient
                .from('artists')
                .select('name, id')
                .in('id', featIds);
            
            if (error) {
                console.error('❌ Ошибка загрузки фитов:', error);
                return [];
            }
            
            console.log('✅ Загружены имена фитов:', data);
            return data || [];
        } catch (e) {
            console.warn('⚠️ Не удалось загрузить фиты:', e);
            return [];
        }
    }
    
    function renderEditFeatsList() {
        const container = document.getElementById('editFeatsList');
        if (!container) return;
        
        container.innerHTML = '';
        selectedEditFeats.forEach((feat, index) => {
            const el = document.createElement('span');
            el.className = 'feat-tag';
            el.innerHTML = `
                ${feat.name}
                <button class="feat-remove" data-index="${index}">✕</button>
            `;
            container.appendChild(el);
        });
        
        container.querySelectorAll('.feat-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                selectedEditFeats.splice(index, 1);
                renderEditFeatsList();
            });
        });
    }
    
    loadEditFeatNames().then(feats => {
        console.log('🔍 Получены фиты для модалки:', feats);
        selectedEditFeats = feats.map(f => ({ name: f.name, id: f.id }));
        console.log('🔍 selectedEditFeats после маппинга:', selectedEditFeats);
        
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
                        <input type="text" id="editArtist" value="${escapeHTML(track.artist_name || '')}" readonly style="cursor: default; opacity: 0.8; background: var(--card-light);">
                        <p style="font-size: 12px; color: var(--muted); margin-top: 4px;">
                            ⚡ Исполнитель нельзя изменить
                        </p>
                    </div>
                    <div class="form-group">
                        <label>Фиты (соисполнители)</label>
                        <div id="editFeatsContainer">
                            <div class="feat-item">
                                <input type="text" id="editFeatInput" placeholder="Введите имя соисполнителя" list="editFeatList">
                                <button type="button" id="editAddFeatBtn" class="add-feat-btn">+</button>
                            </div>
                            <div id="editFeatsList" class="feats-list"></div>
                            <datalist id="editFeatList"></datalist>
                        </div>
                        <p style="font-size: 12px; color: var(--muted); margin-top: 4px;">
                            Добавьте или удалите соисполнителей
                        </p>
                    </div>
                    <div class="form-group">
                        <label>Текст</label>
                        <textarea id="editLyrics" rows="6">${escapeHTML(track.lyrics || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Обложка</label>
                        <div class="file-input-wrapper">
                            <input type="file" accept=".jpg,.jpeg,.png,.webp" id="editCover">
                            <span class="file-name" id="editCoverName">${track.cover_url ? '✅ Обложка есть' : 'Файл не выбран'}</span>
                        </div>
                        <p style="font-size: 12px; color: var(--muted); margin-top: 4px;">Выберите новый файл, чтобы заменить текущую обложку</p>
                    </div>
                    <div class="form-group">
                        <label>Аудиофайл</label>
                        <div class="file-input-wrapper">
                            <input type="file" accept=".mp3,.wav,.m4a,.flac" id="editAudio">
                            <span class="file-name" id="editAudioName">${track.audio_url ? '✅ Аудио есть' : 'Файл не выбран'}</span>
                        </div>
                        <p style="font-size: 12px; color: var(--muted); margin-top: 4px;">Выберите новый файл, чтобы заменить текущее аудио</p>
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
        
        renderEditFeatsList();
        loadArtistsForEditFeats();
        
        // ============================================================
        // ОБРАБОТЧИКИ ВЫБОРА ФАЙЛОВ (ПОСЛЕ СОЗДАНИЯ МОДАЛКИ)
        // ============================================================
        
        // Обложка — показываем имя выбранного файла
        const editCoverInput = document.getElementById('editCover');
        const editCoverName = document.getElementById('editCoverName');
        
        if (editCoverInput && editCoverName) {
            editCoverInput.addEventListener('change', function() {
                const file = this.files[0];
                if (file) {
                    editCoverName.textContent = `📎 ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
                } else {
                    editCoverName.textContent = track.cover_url ? '✅ Обложка есть' : 'Файл не выбран';
                }
            });
        }
        
        // Аудио — показываем имя выбранного файла
        const editAudioInput = document.getElementById('editAudio');
        const editAudioName = document.getElementById('editAudioName');
        
        if (editAudioInput && editAudioName) {
            editAudioInput.addEventListener('change', function() {
                const file = this.files[0];
                if (file) {
                    editAudioName.textContent = `📎 ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
                } else {
                    editAudioName.textContent = track.audio_url ? '✅ Аудио есть' : 'Файл не выбран';
                }
            });
        }
        
        const closeModal = () => {
            modal.remove();
            document.body.style.overflow = '';
        };
        
        document.getElementById('editModalClose').addEventListener('click', closeModal);
        document.getElementById('editCancel').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        const editFeatInput = document.getElementById('editFeatInput');
        const editAddFeatBtn = document.getElementById('editAddFeatBtn');
        
        if (editAddFeatBtn && editFeatInput) {
            // ОБРАБОТКА ВЫБОРА ИЗ СПИСКА (AUTO-ADD) ДЛЯ РЕДАКТИРОВАНИЯ
            editFeatInput.addEventListener('change', function() {
                const name = this.value.trim();
                console.log('🔍 Редактирование: выбрано из списка (change):', name);
                
                if (!name) return;
                
                const options = document.querySelectorAll('#editFeatList option');
                let found = null;
                options.forEach(opt => {
                    if (opt.value === name) {
                        found = {
                            name: opt.value,
                            id: opt.dataset.artistId
                        };
                    }
                });
                
                console.log('🔍 Редактирование: найден исполнитель:', found);
                
                if (found) {
                    if (selectedEditFeats.some(f => f.name === found.name)) {
                        alert('Этот исполнитель уже добавлен');
                        this.value = '';
                        return;
                    }
                    selectedEditFeats.push(found);
                    renderEditFeatsList();
                    this.value = '';
                }
            });
            
            // Обработка кнопки "+"
            editAddFeatBtn.addEventListener('click', () => {
                const name = editFeatInput.value.trim();
                if (!name) {
                    // Пытаемся взять значение из выпадающего списка
                    const selectedOption = document.querySelector('#editFeatList option[value]');
                    if (selectedOption) {
                        console.log('🔍 Нашли значение в datalist:', selectedOption.value);
                        editFeatInput.value = selectedOption.value;
                        const event = new Event('change', { bubbles: true });
                        editFeatInput.dispatchEvent(event);
                        return;
                    }
                    alert('Введите имя исполнителя или выберите из списка');
                    return;
                }
                
                if (selectedEditFeats.some(f => f.name === name)) {
                    alert('Этот исполнитель уже добавлен');
                    return;
                }
                
                const options = document.querySelectorAll('#editFeatList option');
                let found = null;
                options.forEach(opt => {
                    if (opt.value === name) {
                        found = { 
                            name: opt.value, 
                            id: opt.dataset.artistId
                        };
                    }
                });
                
                if (found) {
                    selectedEditFeats.push(found);
                    renderEditFeatsList();
                    editFeatInput.value = '';
                } else {
                    createNewArtist(name).then(artist => {
                        if (artist) {
                            selectedEditFeats.push({ name: artist.name, id: artist.id });
                            renderEditFeatsList();
                            const list = document.getElementById('editFeatList');
                            if (list) {
                                const opt = document.createElement('option');
                                opt.value = artist.name;
                                opt.dataset.artistId = artist.id;
                                list.appendChild(opt);
                            }
                            editFeatInput.value = '';
                        }
                    });
                }
            });
            
            editFeatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    editAddFeatBtn.click();
                }
            });
        }
        
        document.getElementById('editSave').addEventListener('click', async () => {
            const title = document.getElementById('editTitle').value.trim();
            const lyrics = document.getElementById('editLyrics').value.trim();
            const coverFile = document.getElementById('editCover').files[0];
            const audioFile = document.getElementById('editAudio').files[0];
            
            if (!title) {
                alert('Введите название');
                return;
            }
            
            try {
                console.log('🔍 Сохранение: selectedEditFeats перед сохранением:', selectedEditFeats);
                
                const updates = {
                    title: title,
                    lyrics: lyrics,
                    feat_ids: selectedEditFeats.map(f => f.id).filter(id => id)
                };
                
                console.log('🔍 Отправляем обновление:', updates);
                
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