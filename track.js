// ============================================================
// НОВЫЙ ПЛЕЕР (СТРАНИЦА ТРЕКА)
// ============================================================

let currentTrack = null;
let isTrackPlaying = false;
let trackAudio = null;

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function initTrackPlayer() {
    trackAudio = document.getElementById('trackAudio');
    const playBtn = document.getElementById('trackPlayBtn');
    const progress = document.getElementById('trackProgress');
    const currentTimeEl = document.getElementById('trackCurrentTime');
    const durationEl = document.getElementById('trackDuration');
    const backBtn = document.getElementById('trackBackBtn');
    const lyricsBtn = document.getElementById('trackLyricsBtn');
    const shareBtn = document.getElementById('trackShareBtn');
    const lyricsContainer = document.getElementById('trackPageLyrics');
    const lyricsContent = document.getElementById('trackPageLyricsContent');

    if (!trackAudio) return;

    trackAudio.addEventListener('timeupdate', () => {
        if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(trackAudio.currentTime);
        }
        if (progress && trackAudio.duration) {
            const percent = (trackAudio.currentTime / trackAudio.duration) * 100;
            progress.value = percent;
            progress.style.setProperty('--track-progress', `${percent}%`);
        }
        updateMiniPlayerProgress();
    });

    trackAudio.addEventListener('loadedmetadata', () => {
        if (durationEl) {
            durationEl.textContent = formatTime(trackAudio.duration);
        }
    });

    trackAudio.addEventListener('ended', () => {
        isTrackPlaying = false;
        updateTrackPlayIcon(false);
        updateMiniPlayerPlayIcon(false);
    });

    if (playBtn) {
        playBtn.addEventListener('click', toggleTrackPlay);
    }

    if (progress) {
        progress.addEventListener('input', () => {
            if (!trackAudio.duration) return;
            trackAudio.currentTime = (progress.value / 100) * trackAudio.duration;
            progress.style.setProperty('--track-progress', `${progress.value}%`);
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            navigateTo('home');
        });
    }

    if (lyricsBtn && lyricsContainer) {
        lyricsBtn.addEventListener('click', () => {
            if (lyricsContainer.style.display === 'none') {
                lyricsContainer.style.display = 'block';
                lyricsBtn.textContent = '📝 Скрыть текст';
                if (currentTrack && currentTrack.lyrics) {
                    lyricsContent.textContent = currentTrack.lyrics;
                }
            } else {
                lyricsContainer.style.display = 'none';
                lyricsBtn.textContent = '📝 Текст';
            }
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            if (!currentTrack) return;
            const shareText = `🎵 ${currentTrack.title} — ${currentTrack.artist_name}\nСлушай на DB Sound!`;
            if (navigator.share) {
                navigator.share({
                    title: currentTrack.title,
                    text: shareText,
                }).catch(() => {});
            } else {
                navigator.clipboard.writeText(shareText).then(() => {
                    alert('Ссылка скопирована!');
                }).catch(() => {});
            }
        });
    }

    initTrackComments();
}

function toggleTrackPlay() {
    if (!trackAudio) return;
    if (trackAudio.paused) {
        trackAudio.play().catch(e => console.warn('Не удалось воспроизвести:', e));
        isTrackPlaying = true;
    } else {
        trackAudio.pause();
        isTrackPlaying = false;
    }
    updateTrackPlayIcon(isTrackPlaying);
    updateMiniPlayerPlayIcon(isTrackPlaying);
}

function updateTrackPlayIcon(isPlaying) {
    const icon = document.getElementById('trackPlayIcon');
    if (!icon) return;
    if (isPlaying) {
        icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    } else {
        icon.innerHTML = '<polygon points="5,3 19,12 5,21"/>';
    }
}

function openTrackPage(track) {
    currentTrack = track;
    
    const title = document.getElementById('trackPageTitle');
    const artist = document.getElementById('trackPageArtist');
    const cover = document.getElementById('trackPageCover');
    const coverBg = document.getElementById('trackPageCoverBg');
    const audio = document.getElementById('trackAudio');
    
    if (title) title.textContent = track.title || 'Без названия';
    if (artist) artist.textContent = track.artist_name || 'Неизвестный исполнитель';
    
    if (cover) {
        cover.src = track.cover_url || 'firstpage/cover.png';
        cover.onload = () => {
            if (coverBg) {
                coverBg.style.backgroundImage = `url(${cover.src})`;
            }
        };
    }
    
    if (audio && track.audio_url) {
        audio.src = track.audio_url;
        audio.load();
        
        if (navigator.mediaSession) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title || 'Без названия',
                artist: track.artist_name || 'Неизвестный исполнитель',
                album: "DB Sound",
                artwork: [
                    {
                        src: track.cover_url || 'firstpage/cover.png',
                        sizes: "512x512",
                        type: "image/jpeg"
                    }
                ]
            });
        }
    }
    
    updateMiniPlayer(track);
    
    navigateTo('track');
    
    setTimeout(() => {
        renderTrackComments();
    }, 300);
    
    setTimeout(() => {
        if (audio) {
            audio.play().catch(e => console.warn('Не удалось автозапустить:', e));
            isTrackPlaying = true;
            updateTrackPlayIcon(true);
            updateMiniPlayerPlayIcon(true);
        }
    }, 400);
}

// ============================================================
// МИНИ-ПЛЕЕР
// ============================================================

function updateMiniPlayer(track) {
    const miniPlayer = document.getElementById('miniPlayer');
    const cover = document.getElementById('miniPlayerCover');
    const title = document.getElementById('miniPlayerTitle');
    const artist = document.getElementById('miniPlayerArtist');
    
    if (miniPlayer) miniPlayer.style.display = 'flex';
    if (cover) cover.src = track.cover_url || 'firstpage/cover.png';
    if (title) title.textContent = track.title || 'Без названия';
    if (artist) artist.textContent = track.artist_name || 'Неизвестный исполнитель';
    
    const info = miniPlayer?.querySelector('.mini-player-info');
    if (info) {
        info.onclick = () => {
            if (currentTrack) openTrackPage(currentTrack);
        };
    }
    
    const playBtn = document.getElementById('miniPlayerPlay');
    if (playBtn) {
        playBtn.onclick = (e) => {
            e.stopPropagation();
            toggleTrackPlay();
        };
    }
}

function updateMiniPlayerPlayIcon(isPlaying) {
    const btn = document.getElementById('miniPlayerPlay');
    if (!btn) return;
    btn.textContent = isPlaying ? '⏸' : '▶';
}

function updateMiniPlayerProgress() {
    const audio = document.getElementById('trackAudio');
    const bar = document.getElementById('miniPlayerProgressBar');
    if (!audio || !bar || !audio.duration) return;
    const percent = (audio.currentTime / audio.duration) * 100;
    bar.style.width = `${percent}%`;
}

// ============================================================
// КОММЕНТАРИИ НА СТРАНИЦЕ ТРЕКА
// ============================================================

async function renderTrackComments() {
    const commentsList = document.getElementById('trackCommentsList');
    const commentsCount = document.getElementById('trackCommentsCount');
    
    if (!commentsList || !currentTrack) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('comments')
            .select('*')
            .eq('track_id', currentTrack.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (commentsCount) commentsCount.textContent = data?.length || 0;
        
        if (!data || data.length === 0) {
            commentsList.innerHTML = '<div class="empty-comments">Пока комментариев нет</div>';
            return;
        }
        
        commentsList.innerHTML = '';
        data.forEach((comment) => {
            const el = document.createElement('div');
            el.className = 'comment';
            if (comment.rating === 100) el.classList.add('comment-100');
            
            const date = comment.created_at ? new Date(comment.created_at).toLocaleString('ru-RU') : 'Только что';
            
            el.innerHTML = `
                <div>
                    <span class="comment-name">${escapeHTML(comment.name)}</span>
                    <span class="comment-time">${date}</span>
                    ${comment.rating ? `<span class="comment-rating">⭐ ${comment.rating}/100</span>` : ''}
                </div>
                <div class="comment-text">${escapeHTML(comment.text)}</div>
                ${comment.image_url ? `<img src="${comment.image_url}" class="comment-image">` : ''}
            `;
            commentsList.appendChild(el);
        });
    } catch (e) {
        console.error('Ошибка загрузки комментариев:', e);
    }
}

function initTrackComments() {
    const commentBtn = document.getElementById('trackCommentBtn');
    const nameInput = document.getElementById('trackCommentName');
    const textInput = document.getElementById('trackCommentInput');
    
    if (!commentBtn) return;
    
    commentBtn.addEventListener('click', async () => {
        const name = nameInput?.value.trim();
        const text = textInput?.value.trim();
        
        if (!name) { alert('Введите ваше имя'); return; }
        if (!text) { alert('Напишите комментарий'); return; }
        if (!currentTrack) { alert('Трек не выбран'); return; }
        
        const comment = {
            track_id: currentTrack.id,
            name: name,
            text: text,
            user_id: tgUserId || null,
            rating: 0
        };
        
        try {
            const { error } = await supabaseClient
                .from('comments')
                .insert([comment]);
            
            if (error) throw error;
            
            textInput.value = '';
            await renderTrackComments();
        } catch (e) {
            console.error('Ошибка:', e);
            alert('Ошибка отправки комментария');
        }
    });
}