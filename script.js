const audio = document.getElementById("audio");
const playButton = document.getElementById("playButton");
const progress = document.getElementById("progress");
const currentTimeElement = document.getElementById("currentTime");
const durationElement = document.getElementById("duration");
const commentButton = document.getElementById("commentButton");
const nameInput = document.getElementById("nameInput");
const commentInput = document.getElementById("commentInput");
const commentsList = document.getElementById("commentsList");
const recordButton = document.getElementById("recordButton");
const recordText = document.getElementById("recordText");
const recordTimer = document.getElementById("recordTimer");
const lyricsToggleBtn = document.getElementById("lyricsToggleBtn");
const lyricsSection = document.getElementById("lyricsSection");
const lyricsContent = document.getElementById("lyricsContent");
const playerContent = document.getElementById("playerContent");


function setPlayIcon(isPlaying) {
    const playIcon = document.getElementById("playIcon");
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
    { time: 0, text: " Музыка начинается..." },
    { time: 2.5, text: "Это хуярот твой" },
    { time: 5.8, text: "На всё хуёвое настроение заебись бит" },
    { time: 9.2, text: "Да без базара пусть подкатывает" },
    { time: 12.1, text: "Разберёмся чё да как" },
    { time: 15.5, text: "Ты чё ебанутая?" },
    { time: 18.3, text: "Слышь на вот ты че ебанутая" },
    { time: 21.7, text: "Твой цвет опущен шея загнута" },
    { time: 24.9, text: "Ебут ала ты че выже обутая" },
    { time: 28.2, text: "А нет если не будет твоего си" },
    { time: 31.5, text: "То есть не будет твоего завтра" },
    { time: 34.8, text: "Его не будет сука его не будет" },
    { time: 38.1, text: "Володя обжёг ноги но если надо разбить тебе ебало" },
    { time: 42.5, text: "Он пойдёт на свои бои" },
    { time: 45.8, text: "Насрать на девчонки он не думает" },
    { time: 48.2, text: "Сразу берёт двоих" },
    { time: 51.5, text: "Если бы у тебя было сука она б тебе не дала" },
    { time: 55.3, text: "Сука такие дела и нет предела" },
    { time: 59.1, text: "Им всем мужчинам нужно твоё тело" },
    { time: 63.4, text: "Тебя не должно ебать то есть не должно быть до этого дела" },
    { time: 68.2, text: "Не должно быть" },
    { time: 72.5, text: "Про Вову нечего сказать он заебатый парень" },
    { time: 76.8, text: "Как в игре может повернуться и ты будешь отправлен в ад" },
    { time: 80.3, text: "Даже с одной ногой ему будет каждый рад" },
    { time: 84.1, text: "Только ты уёбище будешь каждый раз" },
    { time: 88.5, text: "Ну пиздец неронду сразу получишь поебу" },
    { time: 92.2, text: "Только я не получу ведь Володя я тебя люблю" },
    { time: 96.5, text: "И только я имею право говорить про Вову как хочу" },
    { time: 100.3, text: "Я я я как хочу" },
    { time: 104, text: "🎵 Трек подходит к концу..." }
];

let currentLyricIndex = -1;
let isLyricsOpen = false;

// Форматирование времени
function formatTime(seconds) {
    if (!Number.isFinite(seconds)) {
        return "0:00";
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${String(secs).padStart(2, "0")}`;
}

// Извлечение доминирующего цвета
function extractDominantColor(imageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const colorCounts = {};
            let maxCount = 0;
            let dominantColor = "#151518";

            for (let i = 0; i < data.length; i += 4) {
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
        };
        img.onerror = () => resolve("#151518");
    });
}

// Обновление фона
async function updateBackground() {
    const coverImage = document.querySelector(".cover");
    if (coverImage && coverImage.src) {
        try {
            const dominantColor = await extractDominantColor(coverImage.src);
            const bgElement = document.querySelector(".cover-background");
            if (bgElement) {
                bgElement.style.backgroundColor = dominantColor;
                bgElement.style.backgroundImage = `url("${coverImage.src}")`;
            }
        } catch (error) {
            console.error("Ошибка при извлечении цвета:", error);
        }
    }
}

// Рендер текста
function renderLyrics() {
    lyricsContent.innerHTML = "";
    lyrics.forEach((line, index) => {
        const el = document.createElement("div");
        el.className = "lyric-line";
        el.dataset.index = index;
        el.dataset.time = line.time;
        el.textContent = line.text;
        el.addEventListener("click", () => {
            audio.currentTime = line.time;
            if (audio.paused) {
                audio.play();
                setPlayIcon(true);
            }
        });
        lyricsContent.appendChild(el);
    });
}

// Синхронизация текста
function updateLyrics() {
    if (!isLyricsOpen) return;

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
lyricsToggleBtn.addEventListener("click", () => {
    isLyricsOpen = !isLyricsOpen;

    if (isLyricsOpen) {
        playerContent.classList.add("lyrics-open");
        lyricsToggleBtn.classList.add("active");
        if (lyricsContent.children.length === 0) {
            renderLyrics();
        }
        setTimeout(() => {
            updateLyrics();
        }, 300);
    } else {
        playerContent.classList.remove("lyrics-open");
        lyricsToggleBtn.classList.remove("active");
        currentLyricIndex = -1;
    }
});

// Аудио события
audio.addEventListener("loadedmetadata", () => {
    durationElement.textContent = formatTime(audio.duration);
    updateBackground();
});

audio.addEventListener("timeupdate", () => {
    currentTimeElement.textContent = formatTime(audio.currentTime);
    if (audio.duration) {
        progress.value = (audio.currentTime / audio.duration) * 100;
    }
    updateLyrics();
});

audio.addEventListener("ended", () => {
    setPlayIcon(false);
    progress.value = 0;
    currentLyricIndex = -1;
    if (isLyricsOpen) {
        lyricsContent.querySelectorAll(".lyric-line").forEach(l => {
            l.classList.remove("active", "past");
        });
        lyricsContent.scrollTop = 0;
    }
});

playButton.addEventListener("click", () => {
    if (audio.paused) {
        audio.play();
        setPlayIcon(true);
    } else {
        audio.pause();
        setPlayIcon(false);
    }
});

progress.addEventListener("input", () => {
    if (!audio.duration) return;
    audio.currentTime = (progress.value / 100) * audio.duration;
});

// Комментарии
let comments = JSON.parse(localStorage.getItem("trackComments") || "[]");

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function renderComments() {
    commentsList.innerHTML = "";
    if (comments.length === 0) {
        commentsList.innerHTML = `<div class="empty-comments">Пока комментариев нет</div>`;
        return;
    }
    comments.forEach((comment) => {
        const element = document.createElement("div");
        element.className = "comment";
        element.innerHTML = `<div> <span class="comment-name">${escapeHTML(comment.name)}</span> <span class="comment-time">${formatTime(comment.timestamp)}</span> </div> <div class="comment-text">${escapeHTML(comment.text)}</div>`;
        commentsList.appendChild(element);
    });
}

commentButton.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const text = commentInput.value.trim();
    if (!name || !text) return;
    
    const comment = {
        name: name,
        text: text,
        timestamp: audio.currentTime,
        createdAt: Date.now()
    };
    
    comments.push(comment);
    localStorage.setItem("trackComments", JSON.stringify(comments));
    commentInput.value = "";
    renderComments();
});

renderComments();

// Голосовое
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingTimerInterval = null;

recordButton.addEventListener("click", async () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.addEventListener("dataavailable", (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        });
        
        mediaRecorder.addEventListener("stop", () => {
            stream.getTracks().forEach((track) => track.stop());
            clearInterval(recordingTimerInterval);
            recordButton.classList.remove("recording");
            recordText.textContent = "Записать";
            recordTimer.textContent = "0:00";
            
            const blob = new Blob(audioChunks, { type: "audio/webm" });
            const url = URL.createObjectURL(blob);
            const audioElement = document.createElement("audio");
            audioElement.controls = true;
            audioElement.src = url;
            audioElement.style.width = "100%";
            audioElement.style.marginTop = "12px";
            recordButton.parentElement.appendChild(audioElement);
        });
        
        mediaRecorder.start();
        recordingStartTime = Date.now();
        recordButton.classList.add("recording");
        recordText.textContent = "Остановить";
        
        recordingTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            recordTimer.textContent = formatTime(elapsed);
        }, 1000);
    } catch (error) {
        console.error(error);
        alert("Не удалось получить доступ к микрофону.");
    }
});

// Инициализация при загрузке
document.addEventListener("DOMContentLoaded", () => {
    updateBackground();
    setPlayIcon(false);
});