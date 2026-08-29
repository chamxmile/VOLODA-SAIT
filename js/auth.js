// ============================================================
// TELEGRAM АВТОРИЗАЦИЯ
// ============================================================

let tgUser = null;
let tgUserId = null;
let currentUserPermissions = {
    can_upload: false,
    is_admin: false,
    is_blocked: false
};

function initTelegram() {
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                tgUser = tg.initDataUnsafe.user;
                tgUserId = tgUser.id;
                console.log('✅ Telegram User:', tgUser);
                return tgUser;
            }
        }
        const mockUser = {
            id: 123456789,
            first_name: 'Александр',
            last_name: '',
            username: 'alex_test',
            language_code: 'ru'
        };
        tgUser = mockUser;
        tgUserId = mockUser.id;
        console.log('⚠️ Используем mock-пользователя:', tgUser);
        return tgUser;
    } catch (e) {
        console.warn('⚠️ Не удалось инициализировать Telegram:', e);
        return null;
    }
}

async function getOrCreateUser(user) {
    if (!user || !user.id) {
        console.warn('⚠️ Нет пользователя');
        return null;
    }
    
    try {
        console.log('🔍 Ищем пользователя с ID:', user.id);
        
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('telegram_user_id', user.id)
            .maybeSingle();
        
        if (!data || error) {
            console.log('👤 Новый пользователь, создаём запись...');
            
            const newUser = {
                telegram_user_id: user.id,
                first_name: user.first_name || 'Гость',
                last_name: user.last_name || '',
                username: user.username || null,
                can_upload: false,
                is_admin: false,
                is_blocked: false
            };
            
            const { data: created, error: createError } = await supabaseClient
                .from('users')
                .insert([newUser])
                .select()
                .single();
            
            if (createError) {
                console.error('❌ Ошибка создания пользователя:', createError);
                return null;
            }
            
            console.log('✅ Пользователь создан:', created);
            
            currentUserPermissions = {
                can_upload: created.can_upload || false,
                is_admin: created.is_admin || false,
                is_blocked: created.is_blocked || false
            };
            
            return created;
        }
        
        console.log('✅ Пользователь найден:', data);
        
        currentUserPermissions = {
            can_upload: data.can_upload || false,
            is_admin: data.is_admin || false,
            is_blocked: data.is_blocked || false
        };
        
        return data;
        
    } catch (e) {
        console.error('❌ Ошибка:', e);
        return null;
    }
}

function updateUserUI(user) {
    if (!user) return;
    
    const greeting = document.getElementById('greeting');
    if (greeting) {
        const name = user.first_name || 'Гость';
        greeting.textContent = `Добрый день, ${name}`;
    }
    
    const profileName = document.getElementById('profileName');
    if (profileName) {
        profileName.textContent = user.first_name || 'Гость';
        if (user.last_name) {
            profileName.textContent += ' ' + user.last_name;
        }
    }
    
    const profileUsername = document.getElementById('profileUsername');
    if (profileUsername) {
        profileUsername.textContent = user.username ? `@${user.username}` : '';
    }
    
    const profileId = document.getElementById('profileId');
    if (profileId) {
        profileId.textContent = `Telegram ID: ${user.id || '—'}`;
    }
    
    const uploadUserName = document.getElementById('uploadUserName');
    if (uploadUserName) {
        uploadUserName.textContent = user.first_name || 'Гость';
    }
    
    const uploadUserDisplay = document.getElementById('uploadUserDisplay');
    if (uploadUserDisplay) {
        let display = user.first_name || 'Гость';
        if (user.last_name) display += ' ' + user.last_name;
        uploadUserDisplay.textContent = display;
    }
    
    const uploadUserTag = document.getElementById('uploadUserTag');
    if (uploadUserTag) {
        uploadUserTag.textContent = user.username ? `@${user.username}` : '';
    }
}

function updateUploadButton(hasPermission) {
    const uploadBtn = document.getElementById('uploadNavBtn');
    if (!uploadBtn) return;
    
    if (hasPermission) {
        uploadBtn.style.display = 'flex';
        console.log('🔓 Кнопка загрузки ДОСТУПНА');
    } else {
        uploadBtn.style.display = 'none';
        console.log('🔒 Кнопка загрузки СКРЫТА');
    }
}

// ============================================================
// ОБНОВЛЕНИЕ АВАТАРА В ПРОФИЛЕ
// ============================================================

async function updateProfileAvatar(user) {
    if (!user || !user.id) return;
    
    const avatarEl = document.getElementById('profileAvatar');
    if (!avatarEl) return;
    
    // Функция getUserAvatar определена в profile.js
    if (typeof getUserAvatar === 'function') {
        try {
            const avatarUrl = await getUserAvatar(user.id);
            if (avatarUrl) {
                avatarEl.innerHTML = `<img src="${avatarUrl}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--border);">`;
                return;
            }
        } catch (e) {
            console.warn('⚠️ Не удалось загрузить аватар:', e);
        }
    }
    
    // Если аватар не загрузился — показываем эмодзи
    avatarEl.textContent = '👤';
}