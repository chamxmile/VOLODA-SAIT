// Безопасное получение элементов
function $(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`Элемент #${id} не найден`);
    return el;
}

const audio = $("audio");
const playButton = $("playButton");
const progress = $("progress");
const currentTimeElement = $("currentTime");
const durationElement = $("duration");
const commentButton = $("commentButton");
const nameInput = $("nameInput");
const commentInput = $("commentInput");
const commentsList = $("commentsList");
const commentsCount = $("commentsCount");
const lyricsToggleBtn = $("lyricsToggleBtn");
const lyricsSection = $("lyricsSection");
const lyricsContent = $("lyricsContent");
const playerContent = $("playerContent");
const coverImage = $("coverImage");
const coverBackground = $("coverBackground");
const ratingSlider = $("ratingSlider");
const ratingValue = $("ratingValue");
const modalOverlay = $("modalOverlay");
const modalClose = $("modalClose");
const modalImage = $("modalImage");
const taxiSound = $("taxiSound");

// Элементы для кружка
const loadingOverlay = $("loadingOverlay");
const storyOverlay = $("storyOverlay");
const storyVideo = $("storyVideo");
const skipBtn = $("skipBtn");
const sendRatingButton = $("sendRatingButton");


// ============ ПОДКЛЮЧЕНИЕ К SUPABASE ============
const SUPABASE_URL = 'https://sqjtrcqumszdrkyzlmsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxanRyY3F1bXN6ZHJreXpsbXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0ODU2MTIsImV4cCI6MjEwMzA2MTYxMn0.0P7GL1JXfzf3dIsSPj6HnKNzg8ssEN9MRk2dhLSmr2Q';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============ ФУНКЦИИ РАБОТЫ С БД ============

// Загрузка комментариев
async function loadComments() {
    try {
        console.log('📥 Загрузка комментариев...');
        const { data, error } = await supabaseClient
            .from('comments')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Ошибка:', error);
            return [];
        }
        console.log('✅ Загружено:', data?.length || 0);
        return data || [];
    } catch (e) {
        console.error('❌ Ошибка загрузки:', e);
        return [];
    }
}

// Сохранение комментария
async function saveComment(comment) {
    try {
        console.log('💾 Сохранение...', comment);
        const { data, error } = await supabaseClient
            .from('comments')
            .insert([comment])
            .select();
        
        if (error) {
            console.error('❌ Ошибка сохранения:', error);
            alert('Ошибка сохранения: ' + error.message);
            return null;
        }
        console.log('✅ Сохранено!', data);
        return data?.[0] || null;
    } catch (e) {
        console.error('❌ Ошибка:', e);
        alert('Ошибка: ' + e.message);
        return null;
    }
}

// Загрузка картинки в Storage
async function uploadLoveImage(name) {
    try {
        console.log('📤 Загрузка картинки...');
        
        // Загружаем love.png из папки проекта
        const response = await fetch('love.png');
        if (!response.ok) {
            throw new Error('Не удалось загрузить love.png');
        }
        const blob = await response.blob();
        
        const fileName = `love_${Date.now()}_${name.replace(/\s/g, '_')}.png`;
        
        const { data, error } = await supabaseClient.storage
            .from('love-images')
            .upload(fileName, blob, {
                contentType: 'image/png',
                cacheControl: '3600'
            });
        
        if (error) {
            console.error('❌ Ошибка загрузки картинки:', error);
            return null;
        }
        
        // Получаем публичную ссылку
        const { data: urlData } = supabaseClient.storage
            .from('love-images')
            .getPublicUrl(fileName);
        
        console.log('✅ Картинка загружена:', urlData.publicUrl);
        return urlData.publicUrl;
    } catch (e) {
        console.error('❌ Ошибка:', e);
        return null;
    }
}

// Состояния кружка
let isFirstPlay = true;
let storyWasShownThisSession = false;
let isStoryPlaying = false;
let storySequenceId = 0;
let storyTimeouts = [];
let storyStarted = false;

// Проверяем, показывали ли кружок когда-либо (хранится в localStorage)
let hasEverSeenStory = localStorage.getItem("hasEverSeenStory") === "true";

// Переменная для хранения текущей оценки при отправке комментария
let currentRating = 0;

// Функция очистки всех таймеров кружка
function clearStoryTimers() {
    storyTimeouts.forEach(timer => clearTimeout(timer));
    storyTimeouts = [];
}

function setPlayIcon(isPlaying) {
    const playIcon = $("playIcon");
    if (!playIcon) return;
    if (isPlaying) {
        playIcon.src = "pause.png";
        playIcon.alt = "Pause";
    } else {
        playIcon.src = "play.png";
        playIcon.alt = "Play";
    }
}

// Текст песни
const lyrics = [
    { time: 0, text: "Это хуйня родной" },
    { time: 1.2, text: "Да кто хуйня" },
    { time: 2.2, text: "Мои парни приедут тебя отпиздят блять" },
    { time: 4.0, text: "Да без базара пусть подкатывают" },
    { time: 6.1, text: "Разберёмся (morningmarch audio exclusive) чё да как" },
    { time: 9.1, text: "Да ты вообще ебаннутый блять" },
    { time: 10, text: "Ты чё ебанутая?" },
    { time: 13.3, text: "Пиздишь на Вову ты че ебаннутая?" },
    { time: 14.9, text: "Твой взгляд опущен шея загнутая" },
    { time: 16.5, text: "Ебу дала ты че в лыжи обутая а" },
    { time: 18.7, text: "Не DayZ не будет твоего Z, то есть не будет твоего завтра" },
    { time: 22, text: "(его не будет, сука, его не будет)" },
    { time: 26, text: "Володя обжёг ноги но если надо разбить тебе ебало" },
    { time: 30, text: "он пойдёт на своих двоих" },
    { time: 31.7, text: "Если две девченки он не думает" },
    { time: 33.7, text: "сразу берёт двоих" },
    { time: 35, text: "И если бы сука у тебя была сука" },
    { time: 37.3, text: "она бы тебе не дала" },
    { time: 38.9, text: "Сука такие дела, им не придела," },
    { time: 42, text: "Леша при делах, ему ща нужно твое тело" },
    { time: 45, text: "Тебя не должно ебать то есть не должно быть до этого дела" },
    { time: 49, text: "(не должно быть)" },
    { time: 53, text: "Про Вову нечего сказать он заебатый парень" },
    { time: 56.3, text: "Он как в игре может повернуться и ты будешь отправлен в ад" },
    { time: 60, text: "Даже с одной ногой ему будет каждый рад" },
    { time: 63, text: "только ты уёбище будешь как пират" },
    { time: 66.5, text: "Будешь пиздеть неровно, то сразу получишь по еблю" },
    { time: 69.5, text: "Только я не получу ведь Володя я тебя люблю" },
    { time: 73.5, text: "И только я имею право говорить про Вову как хочу" },
    { time: 77, text: "Я я я как хочу" },
    { time: 80, text: "Пиздишь на Вову ты че ебаннутая?" },
    { time: 81.6, text: "Твой взгляд опущен шея загнутая" },
    { time: 83.2, text: "Ебу дала ты че в лыжи обутая а" },
    { time: 85.3, text: "Не DayZ не будет твоего Z, то есть не будет твоего завтра" },
    { time: 89, text: "(его не будет, сука, его не будет)" },
];

let currentLyricIndex = -1;
let isLyricsOpen = false;

// Форматирование времени
function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${String(secs).padStart(2, "0")}`;
}

// Извлечение доминирующего цвета
function extractDominantColor(imageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = imageUrl;
        
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                const scale = Math.min(1, 100 / Math.max(img.width, img.height));
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const colorCounts = {};
                let maxCount = 0;
                let dominantColor = "#151518";
                
                for (let i = 0; i < data.length; i += 16) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];
                    if (a > 128) {
                        const colorKey = `${Math.floor(r/20)*20},${Math.floor(g/20)*20},${Math.floor(b/20)*20}`;
                        colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
                        if (colorCounts[colorKey] > maxCount) {
                            maxCount = colorCounts[colorKey];
                            dominantColor = `rgb(${r},${g},${b})`;
                        }
                    }
                }
                resolve(dominantColor);
            } catch (e) {
                console.warn("Не удалось извлечь цвет:", e);
                resolve("#151518");
            }
        };
        
        img.onerror = () => resolve("#151518");
    });
}

// Обновление фона
async function updateBackground() {
    if (!coverImage || !coverBackground) return;
    if (coverImage.src && coverImage.complete) {
        try {
            const dominantColor = await extractDominantColor(coverImage.src);
            coverBackground.style.backgroundColor = dominantColor;
        } catch (error) {
            console.error("Ошибка при извлечении цвета:", error);
        }
    }
}

// Рендер текста
function renderLyrics() {
    if (!lyricsContent) return;
    lyricsContent.innerHTML = "";
    lyrics.forEach((line, index) => {
        const el = document.createElement("div");
        el.className = "lyric-line";
        el.dataset.index = index;
        el.dataset.time = line.time;
        el.textContent = line.text;
        el.addEventListener("click", () => {
            if (!audio) return;
            audio.currentTime = line.time;
            if (audio.paused) {
                audio.play().catch(e => console.warn("Не удалось воспроизвести:", e));
                setPlayIcon(true);
            }
        });
        lyricsContent.appendChild(el);
    });

    const bottomSpacer = document.createElement("div");
    bottomSpacer.style.height = "400px";
    bottomSpacer.style.flexShrink = "0";
    lyricsContent.appendChild(bottomSpacer);
}

// Синхронизация текста
function updateLyrics() {
    if (!isLyricsOpen || !audio || !lyricsContent) return;
    const currentTime = audio.currentTime;
    let newIndex = -1;
    
    for (let i = 0; i < lyrics.length; i++) {
        if (currentTime >= lyrics[i].time - 0.2) {
            newIndex = i;
        } else {
            break;
        }
    }
    
    if (newIndex !== currentLyricIndex) {
        const lines = lyricsContent.querySelectorAll(".lyric-line");
        lines.forEach((line, idx) => {
            line.classList.remove("active", "past");
            if (idx < newIndex) {
                line.classList.add("past");
            } else if (idx === newIndex) {
                line.classList.add("active");
                setTimeout(() => {
                    line.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 50);
            }
        });
        currentLyricIndex = newIndex;
    }
}

// Переключение текста
if (lyricsToggleBtn) {
    lyricsToggleBtn.addEventListener("click", () => {
        isLyricsOpen = !isLyricsOpen;
        
        if (isLyricsOpen) {
            playerContent.classList.add("lyrics-open");
            document.querySelector(".app").classList.add("lyrics-open");
            lyricsToggleBtn.classList.add("active");
            
            if (lyricsContent.children.length === 0) {
                renderLyrics();
            }
            
            setTimeout(() => {
                lyricsSection.classList.add("visible");
                setTimeout(() => {
                    updateLyrics();
                }, 100);
            }, 400);
            
        } else {
            lyricsSection.classList.remove("visible");
            
            setTimeout(() => {
                playerContent.classList.remove("lyrics-open");
                document.querySelector(".app").classList.remove("lyrics-open");
                lyricsToggleBtn.classList.remove("active");
                currentLyricIndex = -1;
            }, 400);
        }
    });
}

// ============ ЛОГИКА КРУЖКА ============

function showLoading() {
    if (loadingOverlay) loadingOverlay.classList.add("active");
}

function hideLoading() {
    if (loadingOverlay) loadingOverlay.classList.remove("active");
}

ffunction showStory() {
    if (!storyOverlay) return;
    storyOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
    isStoryPlaying = true;
    
    if (storyVideo) {
        storyVideo.currentTime = 0;
        storyVideo.muted = true;
        storyVideo.playsInline = true;
        storyVideo.setAttribute('playsinline', '');
        storyVideo.setAttribute('webkit-playsinline', '');
        
        positionSkipButton();
        
        // Пытаемся запустить
        storyVideo.play().catch(function() {
            // Если не запустилось — ждём клик по кружку
            storyOverlay.addEventListener('click', function playOnClick() {
                storyVideo.play().catch(function() {});
                storyOverlay.removeEventListener('click', playOnClick);
            }, { once: true });
        });
    }
    
    if (hasEverSeenStory && skipBtn) {
        skipBtn.classList.add("visible");
        console.log('🔘 Кнопка СКИПНУТЬ показана (повторный просмотр)');
    }
}

function hideStory() {
    if (!storyOverlay) return;
    storyOverlay.classList.remove("active");
    document.body.style.overflow = "";
    isStoryPlaying = false;
    
    if (storyVideo) {
        storyVideo.pause();
        storyVideo.currentTime = 0;
    }
    
    if (skipBtn) skipBtn.classList.remove("visible");
    
    // Возобновляем трек если он на паузе
    if (audio && audio.paused && !audio.ended) {
        audio.play().catch(e => console.warn("Не удалось возобновить трек:", e));
        setPlayIcon(true);
    }
}

function positionSkipButton() {
    if (!skipBtn || !storyVideo) return;
    
    setTimeout(() => {
        const rect = storyVideo.getBoundingClientRect();
        const videoBottom = rect.bottom;
        const windowHeight = window.innerHeight;
        
        const topPos = Math.min(videoBottom + 20, windowHeight - 80);
        
        skipBtn.style.position = 'fixed';
        skipBtn.style.top = topPos + 'px';
        skipBtn.style.left = '50%';
        skipBtn.style.transform = 'translateX(-50%)';
        skipBtn.style.bottom = 'auto';
    }, 100);
}

function finishStory() {
    if (!isStoryPlaying) return;
    
    // Запоминаем что кружок уже показывали когда-либо (сохраняем в localStorage)
    if (!hasEverSeenStory) {
        hasEverSeenStory = true;
        localStorage.setItem("hasEverSeenStory", "true");
        console.log('📌 Кружок показан впервые, сохраняем в localStorage');
    }
    
    hideStory();
    clearStoryTimers();
    storyStarted = false;
}

function startStorySequence() {
    // Если кружок уже показывали в этой сессии — НЕ ЗАПУСКАЕМ ЕГО
    if (storyWasShownThisSession) {
        console.log('⏭️ Кружок уже показывали в этой сессии, пропускаем');
        return;
    }
    
    // Очищаем старые таймеры
    clearStoryTimers();
    storySequenceId++;
    const currentSequenceId = storySequenceId;
    storyStarted = true;
    
    console.log('🎬 Запуск последовательности кружка (ID:', currentSequenceId, ')');
    console.log('📌 hasEverSeenStory:', hasEverSeenStory);
    
    // 1. Ставим трек на паузу через 10 секунд
    const timer1 = setTimeout(() => {
        if (currentSequenceId !== storySequenceId || !storyStarted) {
            console.log('⏭️ Старая последовательность, пропускаем');
            return;
        }
        
        // Ставим трек на паузу
        if (audio && !audio.paused) {
            audio.pause();
            setPlayIcon(false);
            console.log('⏸️ Трек на паузе на секунде:', Math.floor(audio.currentTime));
        }
        
        console.log('⏳ Показываем загрузку');
        showLoading();
        
        // 2. Через 5 секунд убираем загрузку и показываем кружок
        const timer2 = setTimeout(() => {
            if (currentSequenceId !== storySequenceId || !storyStarted) {
                console.log('⏭️ Старая последовательность, пропускаем');
                return;
            }
            console.log('🎬 Показываем кружок');
            hideLoading();
            showStory();
            
            // Отмечаем, что кружок показан в этой сессии
            storyWasShownThisSession = true;
            
            // 3. Ждем окончания видео через событие ended
            if (storyVideo) {
                const handleEnded = () => {
                    console.log('✅ Видео завершилось естественно');
                    storyVideo.removeEventListener('ended', handleEnded);
                    storyVideo._endedHandler = null;
                    finishStory();
                };
                storyVideo.addEventListener('ended', handleEnded);
                storyVideo._endedHandler = handleEnded;
            }
            
        }, 5000);
        storyTimeouts.push(timer2);
        
    }, 10000);
    storyTimeouts.push(timer1);
}

// Кнопка СКИПНУТЬ
if (skipBtn) {
    skipBtn.addEventListener("click", () => {
        console.log('⏭️ СКИПНУТЬ нажата');
        if (storyVideo && storyVideo._endedHandler) {
            storyVideo.removeEventListener('ended', storyVideo._endedHandler);
            storyVideo._endedHandler = null;
        }
        storyStarted = false;
        finishStory();
    });
}

// ============ МОДАЛЬНОЕ ОКНО ============

function showLoveModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
    
    if (taxiSound) {
        taxiSound.currentTime = 0;
        taxiSound.play().catch(e => console.warn("Не удалось воспроизвести звук такси:", e));
    }
}

function hideLoveModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove("active");
    document.body.style.overflow = "";
    
    if (taxiSound) {
        taxiSound.pause();
        taxiSound.currentTime = 0;
    }
}

if (modalClose) {
    modalClose.addEventListener("click", hideLoveModal);
}

if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) {
            hideLoveModal();
        }
    });
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (modalOverlay?.classList.contains("active")) {
            hideLoveModal();
        }
        if (storyOverlay?.classList.contains("active")) {
            if (storyVideo && storyVideo._endedHandler) {
                storyVideo.removeEventListener('ended', storyVideo._endedHandler);
                storyVideo._endedHandler = null;
            }
            storyStarted = false;
            finishStory();
        }
    }
});

// ============ АУДИО СОБЫТИЯ ============

if (audio) {
    audio.addEventListener("loadedmetadata", () => {
        if (durationElement) durationElement.textContent = formatTime(audio.duration);
        updateBackground();
    });

    audio.addEventListener("timeupdate", () => {
        if (currentTimeElement) currentTimeElement.textContent = formatTime(audio.currentTime);
        if (progress && audio.duration) {
            progress.value = (audio.currentTime / audio.duration) * 100;
        }
        updateLyrics();
    });

    audio.addEventListener("ended", () => {
        console.log('🏁 Трек закончился');
        setPlayIcon(false);
        if (progress) progress.value = 0;
        currentLyricIndex = -1;
        if (isLyricsOpen && lyricsContent) {
            lyricsContent.querySelectorAll(".lyric-line").forEach(l => {
                l.classList.remove("active", "past");
            });
            lyricsContent.scrollTop = 0;
        }
        
        clearStoryTimers();
        hideLoading();
        storyStarted = false;
        
        if (storyVideo && storyVideo._endedHandler) {
            storyVideo.removeEventListener('ended', storyVideo._endedHandler);
            storyVideo._endedHandler = null;
        }
        
        if (storyOverlay && storyOverlay.classList.contains("active")) {
            hideStory();
        }
        
        const commentsSection = document.querySelector(".comments");
        if (commentsSection) {
            setTimeout(() => {
                commentsSection.scrollIntoView({ 
                    behavior: "smooth", 
                    block: "start" 
                });
            }, 300);
        }
    });

    audio.addEventListener("error", (e) => {
        console.error("Ошибка загрузки аудио:", e);
    });
}

if (playButton && audio) {
    playButton.addEventListener("click", () => {
        if (audio.paused) {
            if (!isStoryPlaying) {
                console.log('▶️ Воспроизведение');
                audio.play().catch(e => console.warn("Не удалось воспроизвести:", e));
                setPlayIcon(true);
                startStorySequence();
            } else {
                audio.play().catch(e => console.warn("Не удалось воспроизвести:", e));
                setPlayIcon(true);
            }
        } else {
            audio.pause();
            setPlayIcon(false);
        }
    });
}

if (progress && audio) {
    function updateProgressFill() {
        if (!audio.duration) return;
        const percent = (audio.currentTime / audio.duration) * 100;
        progress.style.setProperty('--progress', `${percent}%`);
    }

    progress.addEventListener("input", () => {
        if (!audio.duration) return;
        audio.currentTime = (progress.value / 100) * audio.duration;
        updateProgressFill();
    });

    audio.addEventListener("timeupdate", () => {
        updateProgressFill();
    });
}

// ============ КОММЕНТАРИИ ============

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Рендер комментариев ИЗ SUPABASE
async function renderComments() {
    if (!commentsList) return;
    commentsList.innerHTML = "";
    
    // Загружаем из Supabase
    const dbComments = await loadComments();
    
    if (commentsCount) commentsCount.textContent = dbComments.length;
    
    if (dbComments.length === 0) {
        commentsList.innerHTML = `<div class="empty-comments">Пока комментариев нет</div>`;
        return;
    }
    
    dbComments.forEach((comment) => {
        const element = document.createElement("div");
        element.className = "comment";
        
        if (comment.rating === 100) {
            element.classList.add("comment-100");
        }
        
        let dateStr = "Только что";
        if (comment.created_at) {
            const date = new Date(comment.created_at);
            dateStr = date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        let ratingHtml = '';
        if (comment.rating !== undefined && comment.rating !== null) {
            ratingHtml = `<span class="comment-rating">⭐ ${comment.rating}/100</span>`;
        }
        
        // Если есть картинка — показываем её
        let imageHtml = '';
        if (comment.image_url) {
            imageHtml = `<img src="${comment.image_url}" alt="Людское" class="comment-image">`;
        }
        
        element.innerHTML = `
            <div>
                <span class="comment-name">${escapeHTML(comment.name)}</span>
                <span class="comment-time">${dateStr}</span>
                ${ratingHtml}
            </div>
            <div class="comment-text">${escapeHTML(comment.text)}</div>
            ${imageHtml}
        `;
        commentsList.appendChild(element);
    });
}

if (commentButton) {
    commentButton.addEventListener("click", async () => {
        const name = nameInput?.value.trim();
        const text = commentInput?.value.trim();
        
        if (!name) {
            alert("Пожалуйста, введите ваше имя");
            nameInput?.focus();
            return;
        }
        if (!text) {
            alert("Пожалуйста, напишите комментарий");
            commentInput?.focus();
            return;
        }
        
        const rating = parseInt(ratingSlider?.value || 0);
        
        const comment = {
            name: name,
            text: text,
            rating: rating,
            image_url: null
        };
        
        await saveComment(comment);
        if (commentInput) commentInput.value = "";
        await renderComments();
    });
}

// Обработчик Enter для отправки комментария
if (commentInput) {
    commentInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.ctrlKey) {
            commentButton?.click();
        }
    });
}

// ============ ОЦЕНКА ТРЕКА ============

if (ratingSlider && ratingValue) {
    const savedRating = localStorage.getItem("trackRating");
    if (savedRating !== null) {
        const rating = parseInt(savedRating);
        ratingSlider.value = rating;
        ratingValue.textContent = rating;
        updateRatingFill(rating);
        currentRating = rating;
    }
    
    ratingSlider.addEventListener("input", () => {
        const value = parseInt(ratingSlider.value);
        ratingValue.textContent = value;
        currentRating = value;
        updateRatingFill(value);
        localStorage.setItem("trackRating", value);
    });
}

function updateRatingFill(value) {
    if (!ratingSlider) return;
    const percent = value;
    ratingSlider.style.setProperty('--rating', `${percent}%`);
    ratingSlider.style.background = `linear-gradient(to right, #000000 0%, #000000 ${percent}%, rgba(255, 255, 255, 0.15) ${percent}%, rgba(255, 255, 255, 0.15) 100%)`;
}

// ============ ОТПРАВКА ОЦЕНКИ В КОММЕНТАРИИ ============

if (sendRatingButton) {
    sendRatingButton.addEventListener("click", async () => {
        const name = nameInput?.value.trim();
        
        if (!name) {
            alert("Пожалуйста, сначала введите ваше имя");
            nameInput?.focus();
            return;
        }
        
        const rating = parseInt(ratingSlider?.value || 0);
        
        if (rating === 0) {
            alert("Пожалуйста, поставьте оценку от 1 до 100");
            return;
        }
        
        let commentText = `Оценил(а) трек на ${rating}/100`;
        let imageUrl = null;
        
        if (rating === 100) {
            commentText = `⭐ Оценил(а) трек на 100/100! 👑 ЛЮДСКОЕ ПОДТВЕРЖДЕНО! 🔥`;
            
            console.log('📤 Загрузка картинки в Supabase...');
            imageUrl = await uploadLoveImage(name);
            console.log('✅ Картинка загружена, URL:', imageUrl);
            
            showLoveModal();
        }
        
        const comment = {
            name: name,
            text: commentText,
            rating: rating,
            image_url: imageUrl
        };
        
        await saveComment(comment);
        await renderComments();
        
        ratingSlider.value = 0;
        ratingValue.textContent = "0";
        updateRatingFill(0);
    });
}

// ============ ИНИЦИАЛИЗАЦИЯ ============

// Загружаем комментарии при старте
(async () => {
    await renderComments();
})();

document.addEventListener("DOMContentLoaded", () => {
    updateBackground();
    setPlayIcon(false);
    
    storyWasShownThisSession = false;
    storyStarted = false;
    console.log('🔄 Страница загружена');
    console.log('📌 hasEverSeenStory (из localStorage):', hasEverSeenStory);
});