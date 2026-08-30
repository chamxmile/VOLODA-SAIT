// ============================================================
// ЗАГРУЗКА ТРЕКОВ НА ГЛАВНУЮ
// ============================================================

let selectedFeats = [];
let isLoadingTracks = false;

async function loadTracksToHome() {
    const trackList = document.getElementById('trackList');
    if (!trackList) return;
    
    // 🔥 ПОКАЗЫВАЕМ СКЕЛЕТОН ВО ВРЕМЯ ЗАГРУЗКИ
    isLoadingTracks = true;
    trackList.innerHTML = `
        ${Array(3).fill(0).map(() => `
            <div class="track-card skeleton-card">
                <div class="skeleton" style="width:56px;height:56px;border-radius:8px;"></div>
                <div class="track-card-info" style="flex:1;">
                    <div class="skeleton skeleton-text" style="width:60%;"></div>
                    <div class="skeleton skeleton-text" style="width:40%;"></div>
                    <div class="skeleton skeleton-text" style="width:30%;"></div>
                </div>
                <div class="skeleton" style="width:40px;height:40px;border-radius:50%;"></div>
            </div>
        `).join('')}
    `;
    
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
            isLoadingTracks = false;
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
            isLoadingTracks = false;
            return;
        }
        
        // 🔥 ЗАГРУЖАЕМ ИМЕНА ФИТОВ ДЛЯ КАЖДОГО ТРЕКА
        for (const track of data) {
            if (track.feat_ids && track.feat_ids.length > 0) {
                const featNames = await loadFeatNames(track.feat_ids);
                if (featNames.length > 0) {
                    track._feat_names = featNames;
                }
            }
        }
        
        isLoadingTracks = false;
        renderTrackList(data, trackList);
        
    } catch (e) {
        console.error('❌ Ошибка:', e);
        trackList.innerHTML = `<div class="empty-state">❌ Ошибка загрузки</div>`;
        isLoadingTracks = false;
    }
}

// ============================================================
// ЗАГРУЗКА ИМЁН ФИТОВ ПО UUID
// ============================================================

async function loadFeatNames(featIds) {
    if (!featIds || featIds.length === 0) return [];
    
    try {
        // featIds теперь содержит UUID из artists.id
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
// ЗАГРУЗКА ИСПОЛНИТЕЛЕЙ ДЛЯ ФИТОВ
// ============================================================

async function loadArtistsForFeats() {
    const featList = document.getElementById('featList');
    if (!featList) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('artists')
            .select('name, id, user_id')
            .order('name');
        
        if (error) throw error;
        
        featList.innerHTML = '';
        
        data.forEach(artist => {
            // 🔥 ПРОПУСКАЕМ СЕБЯ (текущего пользователя)
            if (artist.user_id === tgUserId) {
                return; // ← не добавляем себя в список фитов
            }
            const option = document.createElement('option');
            option.value = artist.name;
            option.dataset.userId = artist.user_id || '';
            option.dataset.artistId = artist.id;  // ← ЭТО UUID
            featList.appendChild(option);
        });
        
        console.log('✅ Загружено исполнителей для фитов:', featList.children.length);
        
    } catch (e) {
        console.error('❌ Ошибка загрузки исполнителей:', e);
    }
}

// ============================================================
// ДОБАВЛЕНИЕ ФИТА (СОХРАНЯЕМ artistId - UUID)
// ============================================================

function addFeat(name, userId, artistId) {
    console.log('🔍 addFeat ВЫЗВАН!', { name, userId, artistId });
    
    if (!name || name.trim() === '') {
        console.log('🔍 Имя пустое, выходим');
        return;
    }
    
    if (selectedFeats.some(f => f.name === name)) {
        console.log('🔍 Исполнитель уже добавлен');
        alert('Этот исполнитель уже добавлен');
        return;
    }
    
    if (userId && userId === tgUserId) {
        alert('Вы не можете добавить себя как фит');
        return;
    }
    
    // 🔥 СОХРАНЯЕМ artistId (UUID) В selectedFeats
    selectedFeats.push({ 
        name: name.trim(), 
        user_id: userId || null, 
        artist_id: artistId || null  // ← UUID из artists.id
    });
    
    console.log('🔍 selectedFeats ПОСЛЕ добавления:', selectedFeats);
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
        console.log('🔍 ID нового исполнителя (UUID):', data.id);
        
        // Добавляем в список
        const featList = document.getElementById('featList');
        if (featList) {
            const option = document.createElement('option');
            option.value = data.name;
            option.dataset.userId = '';
            option.dataset.artistId = data.id;  // ← UUID
            featList.appendChild(option);
        }
        
        // Добавляем как фит (передаём UUID)
        addFeat(data.name, null, data.id);
        
    } catch (e) {
        console.error('❌ Ошибка создания исполнителя:', e);
        alert('Ошибка: ' + e.message);
    }
}

// ============================================================
// ЗАГРУЗКА ИЗБРАННЫХ ТРЕКОВ
// ============================================================

async function loadFavoriteTracks() {
    const trackList = document.getElementById('trackList');
    if (!trackList) return;
    
    // Обновляем счётчик на вкладке
    const favTab = document.querySelector('.tab-btn[data-tab="favorites"]');
    
    if (!tgUserId || tgUserId === 0) {
        trackList.innerHTML = `<div class="empty-state">Войдите в аккаунт, чтобы видеть избранное</div>`;
        if (favTab) {
            favTab.textContent = '❤️ Любимое';
        }
        return;
    }
    
    try {
        console.log('❤️ Загрузка избранных треков...');
        
        const { data, error } = await supabaseClient
            .from('favorites')
            .select('track_id, tracks(*)')
            .eq('user_id', tgUserId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const tracks = data?.map(item => item.tracks).filter(t => t) || [];
        
        // 🔥 ОБНОВЛЯЕМ СЧЁТЧИК НА ВКЛАДКЕ
        if (favTab) {
            favTab.textContent = `❤️ Любимое (${tracks.length})`;
        }
        
        console.log('✅ Загружено избранных треков:', tracks.length);
        
        if (tracks.length === 0) {
            trackList.innerHTML = `
                <div class="empty-favorites">
                    <div class="empty-icon">❤️</div>
                    <div class="empty-title">Нет избранных треков</div>
                    <div class="empty-sub">Добавляйте треки в избранное, чтобы они появлялись здесь</div>
                </div>
            `;
            return;
        }
        
        // 🔥 ЗАГРУЖАЕМ ИМЕНА ФИТОВ ДЛЯ ИЗБРАННЫХ ТРЕКОВ
        for (const track of tracks) {
            if (track.feat_ids && track.feat_ids.length > 0) {
                const featNames = await loadFeatNames(track.feat_ids);
                if (featNames.length > 0) {
                    track._feat_names = featNames;
                }
            }
        }
        
        renderTrackList(tracks, trackList);
        
    } catch (e) {
        console.error('❌ Ошибка загрузки избранного:', e);
        trackList.innerHTML = `<div class="empty-state">❌ Ошибка загрузки</div>`;
    }
}

// ============================================================
// РЕНДЕР СПИСКА ТРЕКОВ (С ПРАВИЛЬНЫМ СКЕЛЕТОНОМ И ФИТАМИ)
// ============================================================

function renderTrackList(tracks, container) {
    container.innerHTML = '';
    tracks.forEach((track) => {
        const card = document.createElement('div');
        card.className = 'track-card';
        card.dataset.trackId = track.id;
        
        const coverUrl = track.cover_url || 'firstpage/cover.png';
        const playsCount = track.plays || 0;
        
        // 🔥 ФОРМИРУЕМ СТРОКУ С ИСПОЛНИТЕЛЯМИ И ФИТАМИ
        let artistDisplay = track.artist_name || 'Неизвестный исполнитель';
        if (track._feat_names && track._feat_names.length > 0) {
            artistDisplay += ` feat. ${track._feat_names.join(', ')}`;
        }
        
        // 🔥 ПОКАЗЫВАЕМ СКЕЛЕТОН, ЕСЛИ ИДЁТ ЗАГРУЗКА
        const showSkeleton = isLoadingTracks;
        
        card.innerHTML = `
            <img src="${coverUrl}" alt="${track.title}" class="track-cover" 
                 onerror="this.src='firstpage/cover.png'">
            <div class="track-card-info">
                <div class="track-card-title">${escapeHTML(track.title)}</div>
                <div class="track-card-artist">
                    ${showSkeleton 
                        ? `<span class="skeleton skeleton-text" style="width:80px;"></span>` 
                        : escapeHTML(artistDisplay)
                    }
                </div>
                <div class="track-card-plays">
                    ${showSkeleton 
                        ? `<span class="skeleton skeleton-sm"></span>` 
                        : `${playsCount} ${getPlaysText(playsCount)}`
                    }
                </div>
            </div>
            <button class="track-card-play" data-track-id="${track.id}">▶</button>
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
        
        container.appendChild(card);
    });
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
    
    // ============================================================
    // 1. АВТОПОДСТАНОВКА ИМЕНИ ИСПОЛНИТЕЛЯ
    // ============================================================
    
    function setDefaultArtist() {
        if (!artistInput) return;
        
        // 🔥 ПРОБУЕМ ПОЛУЧИТЬ ПСЕВДОНИМ ИЗ ТАБЛИЦЫ artists
        if (tgUserId && tgUserId !== 0) {
            supabaseClient
                .from('artists')
                .select('name')
                .eq('user_id', tgUserId)
                .maybeSingle()
                .then(({ data, error }) => {
                    if (data && data.name) {
                        artistInput.value = data.name;
                        console.log('✅ Псевдоним исполнителя из artists:', data.name);
                    } else {
                        // Если псевдонима нет — используем имя из Telegram
                        fallbackArtistName();
                    }
                })
                .catch(() => {
                    fallbackArtistName();
                });
        } else {
            fallbackArtistName();
        }
    }

    function fallbackArtistName() {
        if (!artistInput) return;
        let name = '';
        if (tgUser) {
            name = tgUser.first_name || '';
            if (tgUser.last_name) {
                name += ' ' + tgUser.last_name;
            }
        }
        artistInput.value = name.trim() || 'chamxmile';
    }
    
    // Вызываем автоподстановку с задержкой, чтобы tgUser успел загрузиться
    setTimeout(setDefaultArtist, 500);
    
    // ============================================================
    // 2. ЗАГРУЗКА СПИСКА ИСПОЛНИТЕЛЕЙ ДЛЯ ФИТОВ
    // ============================================================
    
    loadArtistsForFeats();
    
    // ============================================================
    // 3. ДОБАВЛЕНИЕ ФИТА
    // ============================================================
    
    if (addFeatBtn && featInput) {
        console.log('🔍 Кнопка "+" найдена, добавляем обработчик');
        
        // 🔥 ОБРАБОТКА ВЫБОРА ИЗ СПИСКА (AUTO-ADD)
        featInput.addEventListener('change', function() {
            const name = this.value.trim();
            console.log('🔍 Выбрано из списка (change):', name);
            
            if (!name) return;
            
            const options = document.querySelectorAll('#featList option');
            let found = null;
            options.forEach(opt => {
                if (opt.value === name) {
                    found = {
                        name: opt.value,
                        userId: opt.dataset.userId ? parseInt(opt.dataset.userId) : null,
                        artistId: opt.dataset.artistId || null  // ← UUID
                    };
                }
            });
            
            console.log('🔍 Найден исполнитель:', found);
            
            if (found) {
                addFeat(found.name, found.userId, found.artistId);
                this.value = ''; // Очищаем поле после добавления
            }
        });
        
        // 🔥 ОБРАБОТКА ВВОДА И НАЖАТИЯ "+"
        addFeatBtn.addEventListener('click', () => {
            console.log('🔍 Кнопка "+" НАЖАТА!');
            const name = featInput.value.trim();
            console.log('🔍 Имя фита:', name);
            
            if (!name) {
                console.log('🔍 Имя пустое, выходим');
                // Пытаемся взять значение из выпадающего списка
                const selectedOption = document.querySelector('#featList option[value]');
                if (selectedOption) {
                    console.log('🔍 Нашли значение в datalist:', selectedOption.value);
                    featInput.value = selectedOption.value;
                    // Вызываем change событие
                    const event = new Event('change', { bubbles: true });
                    featInput.dispatchEvent(event);
                    return;
                }
                alert('Введите имя исполнителя или выберите из списка');
                return;
            }
            
            const options = document.querySelectorAll('#featList option');
            console.log('🔍 Найдено опций в datalist:', options.length);
            
            let found = null;
            options.forEach(opt => {
                if (opt.value === name) {
                    found = {
                        name: opt.value,
                        userId: opt.dataset.userId ? parseInt(opt.dataset.userId) : null,
                        artistId: opt.dataset.artistId || null  // ← UUID
                    };
                }
            });
            
            console.log('🔍 Найден исполнитель:', found);
            
            if (found) {
                addFeat(found.name, found.userId, found.artistId);
            } else {
                createNewArtist(name);
            }
        });
        
        featInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('🔍 Enter нажат в поле фита');
                addFeatBtn.click();
            }
        });
    } else {
        console.log('❌ Кнопка "+" или поле ввода не найдены!');
        console.log('🔍 addFeatBtn:', addFeatBtn);
        console.log('🔍 featInput:', featInput);
    }
    
    // ============================================================
    // 4. ЗАГРУЗКА ТРЕКА
    // ============================================================
    
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            const audioFile = document.getElementById('audioFileInput')?.files[0];
            const coverFile = document.getElementById('coverFileInput')?.files[0];
            const title = document.getElementById('trackTitleInput')?.value.trim();
            const artist = artistInput?.value.trim() || 'chamxmile';
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

            if (!tgUserId || tgUserId === 0 || tgUserId === 123456789) {
                statusDiv.textContent = '❌ Ошибка авторизации. Перезагрузите приложение.';
                statusDiv.style.color = '#ff6b6b';
                console.error('❌ tgUserId не определён или невалидный:', tgUserId);
                return;
            }

            console.log('📤 Начинаем загрузку для пользователя:', tgUserId);
            console.log('📁 Файл:', audioFile.name, audioFile.size, 'bytes');

            statusDiv.textContent = '⏳ Загрузка аудио...';
            statusDiv.style.color = '#ffeb3b';

            try {
                const audioExt = audioFile.name.split('.').pop();
                const audioFileName = `track_${Date.now()}_${tgUserId}.${audioExt}`;
                
                console.log('📁 Имя аудиофайла:', audioFileName);
                
                const { data: audioData, error: audioError } = await supabaseClient.storage
                    .from('tracks')
                    .upload(`audio/${audioFileName}`, audioFile, {
                        contentType: audioFile.type,
                        cacheControl: '3600'
                    });

                if (audioError) {
                    console.error('❌ Ошибка загрузки аудио:', audioError);
                    throw new Error('Ошибка загрузки аудио: ' + audioError.message);
                }

                console.log('✅ Аудио загружено');

                const { data: audioUrlData } = supabaseClient.storage
                    .from('tracks')
                    .getPublicUrl(`audio/${audioFileName}`);

                let coverUrl = null;
                if (coverFile) {
                    statusDiv.textContent = '⏳ Загрузка обложки...';
                    statusDiv.style.color = '#ffeb3b';
                    
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
                        console.log('✅ Обложка загружена');
                    } else {
                        console.warn('⚠️ Не удалось загрузить обложку:', coverError);
                    }
                }

                statusDiv.textContent = '⏳ Сохранение данных...';
                statusDiv.style.color = '#ffeb3b';

                console.log('🔍 selectedFeats ПЕРЕД сохранением:', selectedFeats);

                // 🔥 СОХРАНЯЕМ ТОЛЬКО artistId (UUID) В feat_ids
                const track = {
                    owner_id: tgUserId,
                    title: title,
                    artist_name: artist,
                    audio_url: audioUrlData.publicUrl,
                    cover_url: coverUrl,
                    lyrics: lyrics || '',
                    duration: 0,
                    status: 'active',
                    feat_ids: selectedFeats.map(f => f.artist_id).filter(id => id)  // ← ТОЛЬКО UUID
                };

                console.log('📝 Сохраняем трек:', track);

                const { data: trackData, error: trackError } = await supabaseClient
                    .from('tracks')
                    .insert([track])
                    .select();

                if (trackError) {
                    console.error('❌ Ошибка сохранения трека:', trackError);
                    throw new Error('Ошибка сохранения: ' + trackError.message);
                }

                console.log('✅ Трек сохранён:', trackData);

                statusDiv.textContent = '✅ Проект успешно загружен!';
                statusDiv.style.color = '#4caf50';

                document.getElementById('audioFileInput').value = '';
                document.getElementById('coverFileInput').value = '';
                document.getElementById('trackTitleInput').value = '';
                document.getElementById('trackLyricsInput').value = '';
                selectedFeats = [];
                renderFeatsList();

                await loadTracksToHome();

            } catch (e) {
                console.error('❌ Ошибка загрузки:', e);
                statusDiv.textContent = '❌ ' + e.message;
                statusDiv.style.color = '#ff6b6b';
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