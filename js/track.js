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

// ============================================================
// УВЕЛИЧЕНИЕ СЧЁТЧИКА ПРОСЛУШИВАНИЙ
// ============================================================

let isPlayCounted = false;
let playCheckInterval = null;

async function updateTrackPlays(trackId) {
    if (!trackId) return;

    if (isPlayCounted) {
        console.log('⏭️ Счётчик уже учтён');
        return;
    }
    
    try {
        const lastPlay = localStorage.getItem(`play_${trackId}`);
        if (lastPlay && Date.now() - parseInt(lastPlay) < 5000) {
            return;
        }
        
        const { data, error } = await supabaseClient
            .from('tracks')
            .select('plays')
            .eq('id', trackId)
            .single();
        
        if (error) throw error;
        
        const currentPlays = (data?.plays || 0) + 1;
        
        const { error: updateError } = await supabaseClient
            .from('tracks')
            .update({ plays: currentPlays })
            .eq('id', trackId);
        
        if (updateError) throw updateError;
        
        localStorage.setItem(`play_${trackId}`, Date.now().toString());
        console.log('📊 Счётчик прослушиваний увеличен:', trackId, '→', currentPlays);
        
        isPlayCounted = true;
        
        updateTrackPlaysDisplay(trackId, currentPlays);
        
    } catch (e) {
        console.warn('⚠️ Не удалось обновить счётчик:', e);
    }
}

function updateTrackPlaysDisplay(trackId, plays) {
    const playsEl = document.getElementById('trackPagePlays');
    if (playsEl) {
        playsEl.textContent = `${plays || 0} прослушиваний`;
    }
    
    const cards = document.querySelectorAll(`.track-card[data-track-id="${trackId}"] .track-card-plays`);
    cards.forEach(el => {
        el.textContent = `${plays || 0} прослушиваний`;
    });
}

// ============================================================
// ЗАГРУЗКА ИМЁН ФИТОВ
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
// ИЗБРАННОЕ / ЛАЙКИ
// ============================================================

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

async function toggleFavorite(trackId) {
    const isFav = await isTrackFavorite(trackId);
    if (isFav) {
        return await removeFromFavorites(trackId);
    } else {
        return await addToFavorites(trackId);
    }
}

async function updateFavoriteButton(trackId) {
    const favBtn = document.getElementById('trackFavoriteBtn');
    if (!favBtn) return;
    
    if (!tgUserId) {
        favBtn.textContent = '🤍';
        favBtn.style.opacity = '0.5';
        return;
    }
    
    const isFav = await isTrackFavorite(trackId);
    favBtn.textContent = isFav ? '❤️' : '🤍';
    favBtn.style.opacity = '1';
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ ПЛЕЕРА
// ============================================================

function initTrackPlayer() {
    trackAudio = document.getElementById('trackAudio');
    const playBtn = document.getElementById('trackPlayBtn');
    const progress = document.getElementById('trackProgress');
    const currentTimeEl = document.getElementById('trackCurrentTime');
    const durationEl = document.getElementById('trackDuration');
    const backBtn = document.getElementById('trackBackBtn');
    const lyricsBtn = document.getElementById('trackLyricsBtn');
    const shareBtn = document.getElementById('trackShareBtn');
    const favBtn = document.getElementById('trackFavoriteBtn');
    const lyricsContainer = document.getElementById('trackPageLyrics');
    const lyricsContent = document.getElementById('trackPageLyricsContent');

    if (!trackAudio) return;

    trackAudio.addEventListener('play', () => {
        console.log('▶️ Событие play, текущий трек:', currentTrack);
        
        if (playCheckInterval) {
            clearInterval(playCheckInterval);
            playCheckInterval = null;
        }
        
        playCheckInterval = setInterval(() => {
            if (trackAudio && trackAudio.currentTime >= 10 && !isPlayCounted && currentTrack && currentTrack.id) {
                console.log('✅ Трек играет больше 10 секунд, увеличиваем счётчик');
                updateTrackPlays(currentTrack.id);
                clearInterval(playCheckInterval);
                playCheckInterval = null;
            }
        }, 1000);
    });
    
    trackAudio.addEventListener('pause', () => {
        if (playCheckInterval) {
            clearInterval(playCheckInterval);
            playCheckInterval = null;
        }
    });

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
        isPlayCounted = false;
        if (playCheckInterval) {
            clearInterval(playCheckInterval);
            playCheckInterval = null;
        }
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

    if (favBtn) {
        favBtn.addEventListener('click', async () => {
            if (!currentTrack) return;
            if (!tgUserId) {
                alert('Войдите в аккаунт, чтобы добавлять в избранное');
                return;
            }
            const result = await toggleFavorite(currentTrack.id);
            if (result !== undefined) {
                await updateFavoriteButton(currentTrack.id);
            }
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
            
            const botUsername = 'demkawqbot';
            const shareUrl = `https://t.me/${botUsername}?start=track_${currentTrack.id}`;
            const shareText = `🎵 ${currentTrack.title} — ${currentTrack.artist_name}\nСлушай на DB Sound!\n${shareUrl}`;
            
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

// ============================================================
// ОТКРЫТИЕ СТРАНИЦЫ ТРЕКА (С ФИТАМИ - ИСПРАВЛЕНО)
// ============================================================

function openTrackPage(track) {
    currentTrack = track;
    isPlayCounted = false;
    
    if (playCheckInterval) {
        clearInterval(playCheckInterval);
        playCheckInterval = null;
    }
    
    const title = document.getElementById('trackPageTitle');
    const artistEl = document.getElementById('trackPageArtist');
    const cover = document.getElementById('trackPageCover');
    const coverBg = document.getElementById('trackPageCoverBg');
    const audio = document.getElementById('trackAudio');
    const playsEl = document.getElementById('trackPagePlays');
    
    if (title) title.textContent = track.title || 'Без названия';
    
    // 🔥 ПОКАЗЫВАЕМ СКЕЛЕТОН ДЛЯ ИСПОЛНИТЕЛЯ
    if (artistEl) {
        artistEl.innerHTML = `<span class="skeleton skeleton-md" style="width:120px;"></span>`;
    }
    
    // 🔥 ЗАГРУЖАЕМ ИМЕНА ФИТОВ И ОБНОВЛЯЕМ СТРОКУ
    async function updateArtistDisplay() {
        let artistDisplay = track.artist_name || 'Неизвестный исполнитель';
        
        if (track.feat_ids && track.feat_ids.length > 0) {
            const featNames = await loadFeatNames(track.feat_ids);
            if (featNames.length > 0) {
                artistDisplay += ` feat. ${featNames.join(', ')}`;
            }
        }
        
        if (artistEl) {
            artistEl.textContent = artistDisplay;
        }
        
        // Обновляем Media Session
        if (navigator.mediaSession && audio) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title || 'Без названия',
                artist: artistDisplay,
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
    
    // Вызываем загрузку фитов
    updateArtistDisplay();
    
    // 🔥 ПОКАЗЫВАЕМ СКЕЛЕТОН ДЛЯ СЧЁТЧИКА
    if (playsEl) {
        playsEl.innerHTML = `<span class="skeleton skeleton-md"></span>`;
    }
    
    // 🔥 ЗАГРУЖАЕМ АКТУАЛЬНОЕ ЗНАЧЕНИЕ СЧЁТЧИКА ИЗ БД
    if (track.id) {
        supabaseClient
            .from('tracks')
            .select('plays')
            .eq('id', track.id)
            .single()
            .then(({ data, error }) => {
                if (!error && data && playsEl) {
                    const plays = data.plays || 0;
                    playsEl.textContent = `${plays} ${getPlaysText(plays)}`;
                    playsEl.classList.add('fade-in');
                    updateTrackPlaysDisplay(track.id, plays);
                }
            })
            .catch(() => {
                if (playsEl) {
                    const plays = track.plays || 0;
                    playsEl.textContent = `${plays} ${getPlaysText(plays)}`;
                    playsEl.classList.add('fade-in');
                }
            });
    }
    
    if (cover) {
        cover.src = track.cover_url || 'oblozchki/obl2.png';
        cover.onload = () => {
            if (coverBg) {
                coverBg.style.backgroundImage = `url(${cover.src})`;
            }
        };
    }
    
    if (audio && track.audio_url) {
        audio.src = track.audio_url;
        audio.load();
    }
    
    updateMiniPlayer(track);
    
    navigateTo('track');
    
    setTimeout(async () => {
        await updateFavoriteButton(track.id);
    }, 100);
    
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
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function getPlaysText(count) {
    if (count === 0) return 'прослушиваний';
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'прослушиваний';
    if (lastDigit === 1) return 'прослушивание';
    if (lastDigit >= 2 && lastDigit <= 4) return 'прослушивания';
    return 'прослушиваний';
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
    if (artist) {
        let artistDisplay = track.artist_name || 'Неизвестный исполнитель';
        // 🔥 Добавляем фиты в мини-плеер
        if (track.feat_ids && track.feat_ids.length > 0) {
            loadFeatNames(track.feat_ids).then(featNames => {
                if (featNames.length > 0) {
                    artist.textContent = artistDisplay + ` feat. ${featNames.join(', ')}`;
                } else {
                    artist.textContent = artistDisplay;
                }
            });
        } else {
            artist.textContent = artistDisplay;
        }
    }
    
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