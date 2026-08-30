// ============================================================
// SUPABASE КЛИЕНТ (ГЛОБАЛЬНЫЙ)
// ============================================================
const SUPABASE_URL = 'https://sqjtrcqumszdrkyzlmsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxanRyY3F1bXN6ZHJreXpsbXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0ODU2MTIsImV4cCI6MjEwMzA2MTYxMn0.0P7GL1JXfzf3dIsSPj6HnKNzg8ssEN9MRk2dhLSmr2Q';

// Делаем глобальным через window
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// И обычная переменная тоже
var supabaseClient = window.supabaseClient;

// ============================================================
// НАВИГАЦИЯ
// ============================================================
let pages = {};
let navBtns = [];

function initNavigation() {
    pages = {
        home: document.getElementById('page-home'),
        player: document.getElementById('page-player'),
        track: document.getElementById('page-track'),
        upload: document.getElementById('page-upload'),
        profile: document.getElementById('page-profile')
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
    
    console.log('📱 Навигация:', page);
}

// ============================================================
// ЗАГРУЗКА ТРЕКОВ (вызов из upload.js)
// ============================================================
// Функция loadTracksToHome() определена в js/upload.js

// ============================================================
// ОТКРЫТИЕ ТРЕКА ПО ID (DEEP LINK)
// ============================================================

async function openTrackById(trackId) {
    try {
        console.log('🔗 Deep link: открываем трек', trackId);
        
        // Ищем трек в БД по ID
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
            // Открываем страницу трека
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
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

async function initApp() {
    console.log('🚀 Инициализация DB Sound...');
    
    initNavigation();
    
    const user = initTelegram();
    
    let dbUser = null;
    if (user && user.id && user.id !== 0 && user.id !== 123456789) {
        dbUser = await getOrCreateUser(user);
    } else {
        console.log('👤 Гость (пользователь не определён)');
        // Сбрасываем права
        currentUserPermissions = {
            can_upload: false,
            is_admin: false,
            is_blocked: false
        };
    }
    
    if (user) {
        updateUserUI(user);
        if (typeof updateProfileAvatar === 'function') {
            await updateProfileAvatar(user);
        }
    }
    
    // 🔥 Обновляем кнопку загрузки (с проверкой на гостя)
    updateUploadButton(currentUserPermissions.can_upload);
    
    if (dbUser) updateUploadButton(currentUserPermissions.can_upload);
    
    // 🔥 ОБРАБОТКА DEEP LINK
    // Проверяем параметры в URL (для Telegram Mini App)
    let trackId = null;
    
    // Пробуем получить параметры из разных источников
    if (window.Telegram && window.Telegram.WebApp) {
        // Для Telegram Mini App
        const tg = window.Telegram.WebApp;
        if (tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
            trackId = tg.initDataUnsafe.start_param;
        }
    }
    
    // Если не нашли через Telegram, пробуем через URL
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
        
        if (typeof loadMyTracks === 'function') {
            await loadMyTracks();
        }
    }
    
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