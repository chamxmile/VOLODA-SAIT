// ============================================================
// SUPABASE КЛИЕНТ (ГЛОБАЛЬНЫЙ)
// ============================================================
const SUPABASE_URL = 'https://sqjtrcqumszdrkyzlmsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxanRyY3F1bXN6ZHJreXpsbXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0ODU2MTIsImV4cCI6MjEwMzA2MTYxMn0.0P7GL1JXfzf3dIsSPj6HnKNzg8ssEN9MRk2dhLSmr2Q';

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
var supabaseClient = window.supabaseClient;

// ============================================================
// PRELOADER
// ============================================================

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
        profile: document.getElementById('page-profile'),
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
    
    if (page === 'admin') {
        if (typeof loadAdminUsers === 'function') loadAdminUsers();
        if (typeof loadAdminTracks === 'function') loadAdminTracks();
    }
    
    console.log('📱 Навигация:', page);
}

// ============================================================
// ОТОБРАЖЕНИЕ АДМИН-КНОПКИ
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
// ОБРАБОТКА ТАБОВ НА ГЛАВНОЙ
// ============================================================

function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(btn => {
        btn.addEventListener('click', async () => {
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tab = btn.dataset.tab;
            console.log('📑 Переключение на вкладку:', tab);
            
            if (tab === 'favorites') {
                if (typeof loadFavoriteTracks === 'function') {
                    await loadFavoriteTracks();
                } else {
                    console.warn('⚠️ loadFavoriteTracks не определена');
                    const trackList = document.getElementById('trackList');
                    if (trackList) {
                        trackList.innerHTML = `<div class="empty-state">❌ Функция загрузки избранного не найдена</div>`;
                    }
                }
            } else {
                await loadTracksToHome();
            }
        });
    });
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ (ЕДИНСТВЕННАЯ ВЕРСИЯ)
// ============================================================

async function initApp() {
    console.log('🚀 Инициализация DB Sound...');
    
    showPreloader();
    
    initNavigation();
    
    const user = initTelegram();
    
    let dbUser = null;
    if (user && user.id && user.id !== 0 && user.id !== 123456789) {
        dbUser = await getOrCreateUser(user);
    } else {
        console.log('👤 Гость (пользователь не определён)');
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

    updateAdminButton();
    updateUploadButton(currentUserPermissions.can_upload);
    
    if (dbUser) updateUploadButton(currentUserPermissions.can_upload);
    
    initTabs();
    
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
        
        if (typeof loadMyTracks === 'function') {
            await loadMyTracks();
        }
    }
    
    hidePreloader();
    
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