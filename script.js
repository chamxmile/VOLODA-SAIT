// ============================================================
// SUPABASE КЛИЕНТ (ГЛОБАЛЬНЫЙ)
// ============================================================
const SUPABASE_URL = 'https://sqjtrcqumszdrkyzlmsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxanRyY3F1bXN6ZHJreXpsbXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0ODU2MTIsImV4cCI6MjEwMzA2MTYxMn0.0P7GL1JXfzf3dIsSPj6HnKNzg8ssEN9MRk2dhLSmr2Q';

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
var supabaseClient = window.supabaseClient;

// ============================================================
// ПОЛНОЭКРАННЫЙ РЕЖИМ И БЛОКИРОВКА ОРИЕНТАЦИИ
// ============================================================

function enableFullscreen() {
    try {
        const tg = window.Telegram?.WebApp;
        if (!tg) {
            console.log('ℹ️ Telegram WebApp не найден');
            return;
        }
        
        // Растягиваем на всю высоту (доступно всегда)
        if (tg.expand) {
            tg.expand();
            console.log('✅ WebApp растянут на всю высоту');
        }
        
        // Пробуем включить настоящий полноэкранный режим (Bot API 8.0+)
        if (tg.requestFullscreen && typeof tg.requestFullscreen === 'function') {
            tg.requestFullscreen();
            console.log('✅ Полноэкранный режим активирован');
        } else {
            console.log('ℹ️ Полноэкранный режим не поддерживается, используем expand');
        }
        
        // Блокировка ориентации (для плеера лучше портретная или альбомная)
        // По умолчанию доступно с версии SDK 2.0+
        if (tg.lockOrientation && typeof tg.lockOrientation === 'function') {
            // 'portrait' — портретная ориентация
            // 'landscape' — альбомная ориентация
            // 'any' — любая (по умолчанию)
            tg.lockOrientation('portrait');
            console.log('🔒 Ориентация заблокирована: portrait');
        } else {
            console.log('ℹ️ Блокировка ориентации не поддерживается');
        }
        
    } catch (e) {
        console.warn('⚠️ Не удалось включить полноэкранный режим:', e);
    }
}

// ============================================================
// PRELOADER С РЕАЛЬНЫМ ПРОГРЕССОМ
// ============================================================

let preloaderProgress = 0;
let preloaderSteps = [];
let preloaderStepIndex = 0;

function showPreloader() {
    const preloader = document.getElementById('appPreloader');
    if (preloader) {
        preloader.classList.remove('hidden');
    }
}

function hidePreloader() {
    const preloader = document.getElementById('appPreloader');
    if (preloader) {
        preloader.classList.add('hidden');
    }
}

// Шаги загрузки (реальные события)
function initPreloaderSteps() {
    preloaderSteps = [
        { name: 'Инициализация', weight: 5 },
        { name: 'Telegram WebApp', weight: 5 },
        { name: 'Пользователь', weight: 10 },
        { name: 'Права доступа', weight: 5 },
        { name: 'Навигация', weight: 5 },
        { name: 'Треки', weight: 25 },
        { name: 'Профиль', weight: 10 },
        { name: 'Избранное', weight: 10 },
        { name: 'Плеер', weight: 15 },
        { name: 'Готово', weight: 10 }
    ];
    preloaderStepIndex = 0;
    preloaderProgress = 0;
    updatePreloaderUI();
}

function updatePreloaderProgress(stepName) {
    // Ищем шаг с таким именем
    let found = false;
    for (let i = 0; i < preloaderSteps.length; i++) {
        if (preloaderSteps[i].name === stepName) {
            preloaderProgress += preloaderSteps[i].weight;
            if (preloaderProgress > 100) preloaderProgress = 100;
            found = true;
            break;
        }
    }
    
    // Если шаг не найден, добавляем +2%
    if (!found && preloaderProgress < 90) {
        preloaderProgress += 2;
        if (preloaderProgress > 90) preloaderProgress = 90;
    }
    
    updatePreloaderUI();
}

function updatePreloaderUI() {
    const fill = document.getElementById('preloaderProgressFill');
    const currentTime = document.getElementById('preloaderTimeCurrent');
    const totalTime = document.getElementById('preloaderTimeTotal');
    
    if (fill) {
        fill.style.width = Math.min(preloaderProgress, 100) + '%';
    }
    
    if (currentTime) {
        const totalSeconds = 30;
        const currentSeconds = Math.floor((preloaderProgress / 100) * totalSeconds);
        const minutes = Math.floor(currentSeconds / 60);
        const secs = currentSeconds % 60;
        currentTime.textContent = `${minutes}:${String(secs).padStart(2, '0')}`;
    }
    
    if (totalTime) {
        totalTime.textContent = '0:30';
    }
}

function completePreloader() {
    preloaderProgress = 100;
    updatePreloaderUI();
    
    setTimeout(() => {
        hidePreloader();
    }, 400);
}

// ============================================================
// НАВИГАЦИЯ (ИСПРАВЛЕННАЯ)
// ============================================================
let pages = {};
let navBtns = [];

function initNavigation() {
    pages = {
        home: document.getElementById('page-home'),
        player: document.getElementById('page-player'),
        track: document.getElementById('page-track'),
        favorites: document.getElementById('page-favorites'),
        upload: document.getElementById('page-upload'),
        profile: document.getElementById('page-profile'),  // ← ВЕРНУЛИ ОБРАТНО
        admin: document.getElementById('page-admin')
    };
    navBtns = document.querySelectorAll('.nav-btn');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    Object.values(pages).forEach(p => {
        if (p) p.style.display = 'none';
    });
    
    if (pages[page]) {
        pages[page].style.display = 'block';
    }
    
    navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });
    
    // 🔥 Загружаем контент при переходе на страницу
    if (page === 'favorites') {
        if (typeof loadFavorites === 'function') {
            loadFavorites();
        }
    }
    
    if (page === 'profile') {
        if (typeof loadProfile === 'function') {
            loadProfile();
        }
    }
    
    if (page === 'admin') {
        if (typeof loadAdminUsers === 'function') loadAdminUsers();
        if (typeof loadAdminTracks === 'function') loadAdminTracks();
    }
    
    console.log('📱 Навигация:', page);
}

// ============================================================
// ОТОБРАЖЕНИЕ КНОПОК
// ============================================================

function updateAdminButton() {
    const adminBtn = document.getElementById('adminNavBtn');
    if (!adminBtn) return;
    
    const isAdmin = currentUserPermissions.is_admin === true;
    const isAuthenticated = tgUserId && tgUserId !== 0 && tgUserId !== 123456789;
    
    if (isAdmin && isAuthenticated) {
        adminBtn.style.display = 'flex';
        console.log('👑 Админ-кнопка показана');
    } else {
        adminBtn.style.display = 'none';
        console.log('👑 Админ-кнопка скрыта');
    }
}

function updateFavoritesButton() {
    const favBtn = document.getElementById('favoritesNavBtn');
    if (!favBtn) return;
    
    const isAuthenticated = tgUserId && tgUserId !== 0 && tgUserId !== 123456789;
    
    if (isAuthenticated) {
        favBtn.style.display = 'flex';
        console.log('❤️ Кнопка избранного показана');
    } else {
        favBtn.style.display = 'none';
        console.log('❤️ Кнопка избранного скрыта');
    }
}

// ============================================================
// ОТКРЫТИЕ ТРЕКА ПО ID (DEEP LINK)
// ============================================================

async function openTrackById(trackId) {
    try {
        console.log('🔗 Deep link: открываем трек', trackId);
        
        const { data, error } = await supabaseClient
            .from('tracks')
            .select('*')
            .eq('id', trackId)
            .single();
        
        if (error) {
            console.warn('⚠️ Трек не найден:', error);
            navigateTo('home');
            await loadTracksToHome();
            return;
        }
        
        if (data) {
            openTrackPage(data);
        } else {
            console.warn('⚠️ Трек не найден');
            navigateTo('home');
            await loadTracksToHome();
        }
    } catch (e) {
        console.error('❌ Ошибка загрузки трека:', e);
        navigateTo('home');
        await loadTracksToHome();
    }
}

// ============================================================
// ОБРАБОТКА ТАБОВ НА ГЛАВНОЙ (ОБНОВЛЕННАЯ)
// ============================================================

function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(btn => {
        btn.addEventListener('click', async () => {
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tab = btn.dataset.tab;
            console.log('📑 Переключение на вкладку:', tab);
            
            // 🔥 Больше нет вкладки "favorites" на главной
            await loadTracksToHome();
        });
    });
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ (ЕДИНСТВЕННАЯ ВЕРСИЯ)
// ============================================================

async function initApp() {
    console.log('🚀 Инициализация DB Sound...');
    
    showPreloader();
    initPreloaderSteps();
    updatePreloaderProgress('Инициализация');
    
    // 🔥 ВКЛЮЧАЕМ ПОЛНОЭКРАННЫЙ РЕЖИМ
    enableFullscreen();
    updatePreloaderProgress('Telegram WebApp');
    
    initNavigation();
    updatePreloaderProgress('Навигация');
    
    const user = initTelegram();
    updatePreloaderProgress('Пользователь');
    
    let dbUser = null;
    if (user && user.id && user.id !== 0 && user.id !== 123456789) {
        dbUser = await getOrCreateUser(user);
        updatePreloaderProgress('Права доступа');
    } else {
        console.log('👤 Гость (пользователь не определён)');
        currentUserPermissions = {
            can_upload: false,
            is_admin: false,
            is_blocked: false
        };
        updatePreloaderProgress('Права доступа');
    }
    
    if (user) {
        updateUserUI(user);
        if (typeof updateProfileAvatar === 'function') {
            await updateProfileAvatar(user);
        }
    }

    updateAdminButton();
    updateFavoritesButton();
    updateUploadButton(currentUserPermissions.can_upload);
    
    if (dbUser) updateUploadButton(currentUserPermissions.can_upload);
    
    initTabs();
    updatePreloaderProgress('Треки');
    
    let trackId = null;
    
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        if (tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
            trackId = tg.initDataUnsafe.start_param;
        }
    }
    
    if (!trackId) {
        const urlParams = new URLSearchParams(window.location.search);
        trackId = urlParams.get('track_id') || urlParams.get('startapp');
    }
    
    if (trackId) {
        console.log('🔗 Deep link detected:', trackId);
        await openTrackById(trackId);
    } else {
        navigateTo('home');
        await loadTracksToHome();
        initTrackPlayer();
        updatePreloaderProgress('Плеер');
        
        if (typeof loadProfile === 'function') {
            await loadProfile();
            updatePreloaderProgress('Профиль');
        }
        
        if (typeof loadFavorites === 'function') {
            await loadFavorites();
            updatePreloaderProgress('Избранное');
        }
    }
    
    updatePreloaderProgress('Готово');
    completePreloader();
    
    console.log('✅ DB Sound инициализирован');
    console.log('👤 Пользователь:', user);
    console.log('🔑 Права:', currentUserPermissions);
}

// ============================================================
// ЗАПУСК
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});