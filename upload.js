// ============================================================
// ЗАГРУЗКА ТРЕКОВ НА ГЛАВНУЮ
// ============================================================

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
            
            card.innerHTML = `
                <img src="${coverUrl}" alt="${track.title}" class="track-cover" 
                     onerror="this.src='firstpage/cover.png'">
                <div class="track-card-info">
                    <div class="track-card-title">${escapeHTML(track.title)}</div>
                    <div class="track-card-artist">${escapeHTML(track.artist_name || 'Неизвестный исполнитель')}</div>
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

function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}