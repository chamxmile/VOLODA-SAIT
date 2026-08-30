// ============================================================
// ЗАГРУЗКА ТРЕКОВ НА ГЛАВНУЮ
// ============================================================

let selectedFeats = [];

async function loadTracksToHome() {
    const trackList = document.getElementById('trackList');
    if (!trackList) return;
    
    try {
        console.log('📥 Загрузка треков для главной...');
        
        const { data, error } = await supabaseClient
            .from('tracks')
            .select(`
                id,
                title,
                artist_name,
                audio_url,
                cover_url,
                lyrics,
                duration,
                plays,
                feat_ids,
                created_at,
                status
            `)
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Ошибка загрузки треков:', error);
            trackList.innerHTML = `<div class="empty-state">❌ Ошибка загрузки: ${error.message}</div>`;
            return;
        }
        
        console.log('✅ Загружено треков:', data?.length || 0);
        
        if (!data || data.length === 0) {
            trackList.innerHTML = `
                <div class="empty-state">
                    <p>🎵 Пока нет треков</p>
                    <p style="font-size: 13px; color: var(--muted); margin-top: 8px;">
                        Будь первым, кто загрузит свой проект!
                    </p>
                </div>
            `;
            return;
        }
        
        trackList.innerHTML = '';
        data.forEach((track) => {
            const card = document.createElement('div');
            card.className = 'track-card';
            card.dataset.trackId = track.id;
            
            const coverUrl = track.cover_url || 'firstpage/cover.png';
            const playsCount = track.plays || 0;
            
            // Формируем строку с исполнителями
            let artistDisplay = track.artist_name || 'Неизвестный исполнитель';
            
            card.innerHTML = `
                <img src="${coverUrl}" alt="${track.title}" class="track-cover" 
                     onerror="this.src='firstpage/cover.png'">
                <div class="track-card-info">
                    <div class="track-card-title">${escapeHTML(track.title)}</div>
                    <div class="track-card-artist">${escapeHTML(artistDisplay)}</div>
                    <div class="track-card-plays">${playsCount} ${getPlaysText(playsCount)}</div>
                </div>
                <button class="track-card-play" data-track-id="${track.id}">
                    ▶
                </button>
            `;
            
            card.addEventListener('click', (e) => {
                if (e.target.closest('.track-card-play')) return;
                openTrackPage(track);
            });
            
            const playBtn = card.querySelector('.track-card-play');
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openTrackPage(track);
                });
            }
            
            trackList.appendChild(card);
        });
        
    } catch (e) {
        console.error('❌ Ошибка:', e);
        trackList.innerHTML = `<div class="empty-state">❌ Ошибка загрузки</div>`;
    }
}

// ============================================================
// ЗАГРУЗКА ИСПОЛНИТЕЛЕЙ ДЛЯ ФИТОВ
// ============================================================

async function loadArtistsForFeats() {
    const featList = document.getElementById('featList');
    if (!featList) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('artists')
            .select('name, id')
            .order('name');
        
        if (error) throw error;
        
        featList.innerHTML = '';
        data.forEach(artist => {
            const option = document.createElement('option');
            option.value = artist.name;
            option.dataset.userId = artist.user_id || '';
            option.dataset.artistId = artist.id;
            featList.appendChild(option);
        });
    } catch (e) {
        console.error('❌ Ошибка загрузки исполнителей:', e);
    }
}

// ============================================================
// ДОБАВЛЕНИЕ ФИТА
// ============================================================

function addFeat(name, userId, artistId) {
    if (!name || name.trim() === '') return;
    if (selectedFeats.some(f => f.name === name)) {
        alert('Этот исполнитель уже добавлен');
        return;
    }
    
    // Не добавляем самого себя (если есть userId и он совпадает)
    if (userId && userId === tgUserId) {
        alert('Вы не можете добавить себя как фит');
        return;
    }
    
    selectedFeats.push({ name: name.trim(), user_id: userId, artist_id: artistId });
    renderFeatsList();
    document.getElementById('featInput').value = '';
}

// ============================================================
// РЕНДЕР СПИСКА ФИТОВ
// ============================================================

function renderFeatsList() {
    const container = document.getElementById('featsList');
    if (!container) return;
    
    container.innerHTML = '';
    selectedFeats.forEach((feat, index) => {
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
            selectedFeats.splice(index, 1);
            renderFeatsList();
        });
    });
}

// ============================================================
// СОЗДАНИЕ НОВОГО ИСПОЛНИТЕЛЯ
// ============================================================

async function createNewArtist(name) {
    if (!confirm(`Создать нового исполнителя "${name}"?`)) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('artists')
            .insert([{
                name: name.trim(),
                user_id: null
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('✅ Создан новый исполнитель:', data);
        
        // Добавляем в список
        const featList = document.getElementById('featList');
        if (featList) {
            const option = document.createElement('option');
            option.value = data.name;
            option.dataset.userId = '';
            option.dataset.artistId = data.id;
            featList.appendChild(option);
        }
        
        // Добавляем как фит
        addFeat(data.name, null, data.id);
        
    } catch (e) {
        console.error('❌ Ошибка создания исполнителя:', e);
        alert('Ошибка: ' + e.message);
    }
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ ФОРМЫ ЗАГРУЗКИ
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById('uploadTrackBtn');
    const statusDiv = document.getElementById('uploadStatus');
    const artistInput = document.getElementById('trackArtistInput');
    const addFeatBtn = document.getElementById('addFeatBtn');
    const featInput = document.getElementById('featInput');
    
    // Автоподстановка имени исполнителя
    if (artistInput && tgUser) {
        let name = tgUser.first_name || '';
        if (tgUser.last_name) {
            name += ' ' + tgUser.last_name;
        }
        artistInput.value = name.trim() || 'chamxmile';
    }
    
    // Загрузка списка исполнителей для фитов
    loadArtistsForFeats();
    
    // Добавление фита
    if (addFeatBtn && featInput) {
        addFeatBtn.addEventListener('click', () => {
            const name = featInput.value.trim();
            if (!name) return;
            
            // Ищем пользователя по имени в datalist
            const options = document.querySelectorAll('#featList option');
            let found = null;
            options.forEach(opt => {
                if (opt.value === name) {
                    found = {
                        name: opt.value,
                        userId: opt.dataset.userId ? parseInt(opt.dataset.userId) : null,
                        artistId: opt.dataset.artistId ? parseInt(opt.dataset.artistId) : null
                    };
                }
            });
            
            if (found) {
                addFeat(found.name, found.userId, found.artistId);
            } else {
                // Если исполнитель не найден — создаём нового
                createNewArtist(name);
            }
        });
        
        featInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addFeatBtn.click();
            }
        });
    }
    
    // Загрузка трека
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            const audioFile = document.getElementById('audioFileInput')?.files[0];
            const coverFile = document.getElementById('coverFileInput')?.files[0];
            const title = document.getElementById('trackTitleInput')?.value.trim();
            const artist = artistInput?.value.trim() || tgUser?.first_name || 'Неизвестный';
            const lyrics = document.getElementById('trackLyricsInput')?.value.trim();

            if (!audioFile) {
                statusDiv.textContent = '❌ Выберите аудиофайл';
                statusDiv.style.color = '#ff6b6b';
                return;
            }
            if (!title) {
                statusDiv.textContent = '❌ Введите название проекта';
                statusDiv.style.color = '#ff6b6b';
                return;
            }

            if (!tgUserId) {
                statusDiv.textContent = '❌ Ошибка авторизации';
                statusDiv.style.color = '#ff6b6b';
                return;
            }

            statusDiv.textContent = '⏳ Загрузка...';
            statusDiv.style.color = '#ffeb3b';

            try {
                const audioExt = audioFile.name.split('.').pop();
                const audioFileName = `track_${Date.now()}_${tgUserId}.${audioExt}`;
                const { data: audioData, error: audioError } = await supabaseClient.storage
                    .from('tracks')
                    .upload(`audio/${audioFileName}`, audioFile, {
                        contentType: audioFile.type,
                        cacheControl: '3600'
                    });

                if (audioError) throw new Error('Ошибка загрузки аудио: ' + audioError.message);

                const { data: audioUrlData } = supabaseClient.storage
                    .from('tracks')
                    .getPublicUrl(`audio/${audioFileName}`);

                let coverUrl = null;
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
                        coverUrl = coverUrlData.publicUrl;
                    }
                }

                // 🔥 СОХРАНЯЕМ ТРЕК С ФИТАМИ
                const track = {
                    owner_id: tgUserId,
                    title: title,
                    artist_name: artist,
                    audio_url: audioUrlData.publicUrl,
                    cover_url: coverUrl,
                    lyrics: lyrics || '',
                    duration: 0,
                    status: 'active',
                    feat_ids: selectedFeats.map(f => f.artist_id || f.user_id).filter(id => id)
                };

                const { data: trackData, error: trackError } = await supabaseClient
                    .from('tracks')
                    .insert([track])
                    .select();

                if (trackError) throw new Error('Ошибка сохранения: ' + trackError.message);

                statusDiv.textContent = '✅ Проект успешно загружен!';
                statusDiv.style.color = '#4caf50';

                // Очищаем форму
                document.getElementById('audioFileInput').value = '';
                document.getElementById('coverFileInput').value = '';
                document.getElementById('trackTitleInput').value = '';
                document.getElementById('trackLyricsInput').value = '';
                selectedFeats = [];
                renderFeatsList();

                await loadTracksToHome();

            } catch (e) {
                statusDiv.textContent = '❌ ' + e.message;
                statusDiv.style.color = '#ff6b6b';
                console.error(e);
            }
        });
    }
});

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getPlaysText(count) {
    if (count === 0) return 'прослушиваний';
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'прослушиваний';
    if (lastDigit === 1) return 'прослушивание';
    if (lastDigit >= 2 && lastDigit <= 4) return 'прослушивания';
    return 'прослушиваний';
}