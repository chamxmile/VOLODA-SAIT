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
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
async function initApp() {
    console.log('🚀 Инициализация DB Sound...');
    
    // Инициализируем навигацию
    initNavigation();
    
    const user = initTelegram();
    
    let dbUser = null;
    if (user && user.id) {
        dbUser = await getOrCreateUser(user);
    }
    
    if (user) updateUserUI(user);
    if (dbUser) updateUploadButton(currentUserPermissions.can_upload);
    
    navigateTo('home');
    await loadTracksToHome();
    initTrackPlayer();
    
    // 🔥 ЗАГРУЖАЕМ ПРОФИЛЬ ПОСЛЕ ИНИЦИАЛИЗАЦИИ
    if (typeof loadMyTracks === 'function') {
        await loadMyTracks();
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