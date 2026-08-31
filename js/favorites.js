// ============================================================
// СТРАНИЦА ИЗБРАННОГО
// ============================================================

let favoriteTracks = [];

// ============================================================
// ЗАГРУЗКА ИЗБРАННЫХ ТРЕКОВ
// ============================================================

async function loadFavorites() {
    const container = document.getElementById('favoritesContent');
    if (!container) return;
    
    if (!tgUserId) {
        container.innerHTML = `
            <div class="favorites-empty">
                <p>❤️</p>
                <h3>Войдите в аккаунт</h3>
                <p style="color: var(--muted);">Чтобы сохранять треки в избранное</p>
            </div>
        `;
        return;
    }
    
    try {
        console.log('❤️ Загрузка избранных треков...');
        
        // Получаем ID избранных треков
        const { data: favData, error: favError } = await supabaseClient
            .from('favorites')
            .select('track_id, created_at')
            .eq('user_id', tgUserId)
            .order('created_at', { ascending: false });
        
        if (favError) throw favError;
        
        const trackIds = favData.map(f => f.track_id);
        console.log('❤️ Найдено избранных треков:', trackIds.length);
        
        if (trackIds.length === 0) {
            favoriteTracks = [];
            renderFavoritesPage();
            return;
        }
        
        // Получаем полные данные треков
        const { data: tracks, error: tracksError } = await supabaseClient
            .from('tracks')
            .select('*')
            .in('id', trackIds)
            .order('created_at', { ascending: false });
        
        if (tracksError) throw tracksError;
        
        favoriteTracks = tracks || [];
        
        // 🔥 Загружаем имена фитов для каждого трека
        for (const track of favoriteTracks) {
            if (track.feat_ids && track.feat_ids.length > 0) {
                const featNames = await loadFeatNames(track.feat_ids);
                if (featNames.length > 0) {
                    track._feat_names = featNames;
                }
            }
        }
        
        // Рендерим страницу
        renderFavoritesPage();
        
    } catch (e) {
        console.error('❌ Ошибка загрузки избранного:', e);
        container.innerHTML = `
            <div class="favorites-empty">
                <p>❌</p>
                <h3>Ошибка загрузки</h3>
                <p style="color: var(--muted);">Попробуйте позже</p>
            </div>
        `;
    }
}

// ============================================================
// РЕНДЕР СТРАНИЦЫ ИЗБРАННОГО (С КНОПКОЙ ПРОФИЛЯ)
// ============================================================

function renderFavoritesPage() {
    const container = document.getElementById('favoritesContent');
    if (!container) return;
    
    const totalTracks = favoriteTracks.length;
    
    container.innerHTML = `
        <!-- Шапка с заголовком и кнопкой профиля -->
        <div class="favorites-header-wrapper">
            <div class="favorites-header-left">
                <h1 class="favorites-title">❤️ Мне нравится</h1>
                <p class="favorites-subtitle">${totalTracks} ${getFavoritesText(totalTracks)}</p>
            </div>
            <div class="favorites-header-right">
                <button class="favorites-profile-btn" onclick="navigateTo('profile')" title="Профиль">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                </button>
            </div>
        </div>
        
        <!-- Кнопка "Воспроизвести всё" -->
        ${totalTracks > 0 ? `
            <div class="favorites-play-all-wrapper">
                <button class="favorites-play-all" onclick="playAllFavorites()">
                    ▶ Воспроизвести всё
                </button>
            </div>
        ` : ''}
        
        <!-- Список треков -->
        <div class="favorites-tracks">
            ${favoriteTracks.length === 0 ? `
                <div class="favorites-empty-state">
                    <p style="color: var(--muted); font-size: 16px;">Нет избранных треков</p>
                    <p style="color: var(--muted); font-size: 14px; margin-top: 8px;">Добавляй треки через ❤️ на странице трека</p>
                </div>
            ` : `
                ${favoriteTracks.map((track, index) => {
                    let artistDisplay = track.artist_name || 'Неизвестный исполнитель';
                    if (track._feat_names && track._feat_names.length > 0) {
                        artistDisplay += ` feat. ${track._feat_names.join(', ')}`;
                    }
                    
                    return `
                        <div class="favorite-track-item" data-track-id="${track.id}" onclick="openTrackById('${track.id}')">
                            <div class="favorite-track-number">${index + 1}</div>
                            <img src="${track.cover_url || 'oblozchki/obl1.png'}" 
                                 class="favorite-track-cover" 
                                 onerror="this.src='oblozchki/obl1.png'">
                            <div class="favorite-track-info">
                                <div class="favorite-track-title">${escapeHTML(track.title)}</div>
                                <div class="favorite-track-artist">${escapeHTML(artistDisplay)}</div>
                            </div>
                            <button class="favorite-track-remove" onclick="event.stopPropagation(); removeFavoriteTrack('${track.id}')">✕</button>
                        </div>
                    `;
                }).join('')}
            `}
        </div>
        
        <!-- Раздел альбомов (заглушка) -->
        <div class="favorites-albums-section">
            <h2 class="favorites-section-title">💿 Альбомы</h2>
            <div class="favorites-albums-grid">
                <div class="favorites-albums-empty">
                    <p style="color: var(--muted);">Скоро здесь появятся избранные альбомы</p>
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function getFavoritesText(count) {
    if (count === 0) return 'треков';
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'треков';
    if (lastDigit === 1) return 'трек';
    if (lastDigit >= 2 && lastDigit <= 4) return 'трека';
    return 'треков';
}

function openTrackById(trackId) {
    const track = favoriteTracks.find(t => t.id === trackId);
    if (track) {
        openTrackPage(track);
    } else {
        // Если трека нет в списке, загружаем из БД
        supabaseClient
            .from('tracks')
            .select('*')
            .eq('id', trackId)
            .single()
            .then(({ data, error }) => {
                if (!error && data) {
                    openTrackPage(data);
                }
            });
    }
}

async function playAllFavorites() {
    if (favoriteTracks.length === 0) return;
    openTrackPage(favoriteTracks[0]);
}

// ============================================================
// УДАЛЕНИЕ ИЗ ИЗБРАННОГО (С ОБНОВЛЕНИЕМ СТРАНИЦЫ)
// ============================================================

async function removeFavoriteTrack(trackId) {
    if (!tgUserId) return false;
    
    if (!confirm('Удалить из избранного?')) return false;
    
    try {
        const { error } = await supabaseClient
            .from('favorites')
            .delete()
            .eq('user_id', tgUserId)
            .eq('track_id', trackId);
        
        if (error) throw error;
        
        console.log('💔 Трек удалён из избранного');
        
        // Удаляем из локального списка
        favoriteTracks = favoriteTracks.filter(t => t.id !== trackId);
        
        // Обновляем страницу
        renderFavoritesPage();
        
        // Обновляем кнопку на странице трека, если она открыта
        if (currentTrack && currentTrack.id === trackId) {
            await updateFavoriteButton(trackId);
        }
        
        return true;
    } catch (e) {
        console.error('❌ Ошибка удаления из избранного:', e);
        alert('Ошибка: ' + e.message);
        return false;
    }
}

// ============================================================
// ДОБАВЛЕНИЕ В ИЗБРАННОЕ (ОБНОВЛЕННОЕ)
// ============================================================

async function addFavoriteTrack(trackId) {
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

// ============================================================
// ТОГГЛ ИЗБРАННОГО (ДЛЯ СТРАНИЦЫ ТРЕКА)
// ============================================================

async function toggleFavorite(trackId) {
    // Проверяем, есть ли трек в избранном
    const isFav = favoriteTracks.some(t => t.id === trackId);
    
    if (isFav) {
        return await removeFavoriteTrack(trackId);
    } else {
        return await addFavoriteTrack(trackId);
    }
}

// ============================================================
// ПРОВЕРКА, В ИЗБРАННОМ ЛИ ТРЕК
// ============================================================

function isTrackInFavorites(trackId) {
    return favoriteTracks.some(t => t.id === trackId);
}