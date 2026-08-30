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

// ============================================================
// БЕЛЫЙ СПИСОК ПОЛЬЗОВАТЕЛЕЙ (замени на реальные ID)
// ============================================================

const WHITE_LIST = [
    { id: 1418934373, name: 'chamxmile', can_upload: true, is_admin: true },
    { id: 1767821012, name: 'nedoljem100', can_upload: true, is_admin: false },
    { id: 1072744327, name: 'Vzon', can_upload: true, is_admin: false },
    { id: 1230942625, name: 'Senjo', can_upload: true, is_admin: false },
    { id: 1680897170, name: 'YBLYDOK', can_upload: true, is_admin: false },
];

// ============================================================
// ИНИЦИАЛИЗАЦИЯ TELEGRAM
// ============================================================

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
            
            if (tg.initData) {
                console.log('ℹ️ Пользователь не определён, но initData есть:', tg.initData);
                const params = new URLSearchParams(tg.initData);
                const userData = params.get('user');
                if (userData) {
                    try {
                        const user = JSON.parse(decodeURIComponent(userData));
                        tgUser = user;
                        tgUserId = user.id;
                        console.log('✅ Пользователь получен из initData:', tgUser);
                        return tgUser;
                    } catch (e) {
                        console.warn('⚠️ Не удалось распарсить user из initData');
                    }
                }
            }
        }
        
        // 🔥 ВРЕМЕННО: ИСПОЛЬЗУЕМ MOCK-ПОЛЬЗОВАТЕЛЯ ДЛЯ РАЗРАБОТКИ
        console.log('🔧 Режим разработки: используем mock-пользователя');
        const mockUser = {
            id: 1418934373,  // ← Твой реальный Telegram ID из WHITE_LIST
            first_name: 'chamxmile',
            last_name: '',
            username: 'chamxmile',
            language_code: 'ru'
        };
        tgUser = mockUser;
        tgUserId = mockUser.id;
        console.log('✅ Mock-пользователь:', tgUser);
        return tgUser;
        
    } catch (e) {
        console.warn('⚠️ Не удалось инициализировать Telegram:', e);
        return null;
    }
}

// ============================================================
// СОЗДАНИЕ ИСПОЛНИТЕЛЯ ДЛЯ ПОЛЬЗОВАТЕЛЯ
// ============================================================

async function createArtist(user) {
    if (!user || !user.id) return null;
    if (user.id === 0 || user.id === 123456789) return null;
    
    try {
        const { data, error } = await supabaseClient
            .from('artists')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (data) {
            console.log('✅ Исполнитель уже существует:', data);
            return data;
        }
        
        // 🔥 Ищем псевдоним в белом списке
        const whitelistEntry = WHITE_LIST.find(u => u.id === user.id);
        const artistName = whitelistEntry?.name || user.first_name || 'Гость';
        
        const newArtist = {
            user_id: user.id,
            name: artistName,  // ← псевдоним из белого списка
            username: user.username || null
        };
        
        const { data: created, error: createError } = await supabaseClient
            .from('artists')
            .insert([newArtist])
            .select()
            .single();
        
        if (createError) throw createError;
        
        console.log('✅ Исполнитель создан:', created);
        return created;
        
    } catch (e) {
        console.error('❌ Ошибка создания исполнителя:', e);
        return null;
    }
}

// ============================================================
// ПОЛУЧЕНИЕ ИЛИ СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ
// ============================================================

async function getOrCreateUser(user) {
    if (!user || !user.id) {
        console.warn('⚠️ Нет пользователя');
        return null;
    }
    
    try {
        console.log('🔍 Ищем пользователя с ID:', user.id);
        
        const whitelistEntry = WHITE_LIST.find(u => u.id === user.id);
        
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
                can_upload: whitelistEntry?.can_upload || false,
                is_admin: whitelistEntry?.is_admin || false,
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
            
            // 🔥 СОЗДАЁМ ИСПОЛНИТЕЛЯ ДЛЯ НОВОГО ПОЛЬЗОВАТЕЛЯ
            await createArtist(user);
            
            return created;
        }
        
        console.log('✅ Пользователь найден:', data);
        
        if (whitelistEntry) {
            const needsUpdate = 
                data.can_upload !== whitelistEntry.can_upload ||
                data.is_admin !== whitelistEntry.is_admin;
            
            if (needsUpdate) {
                console.log('🔄 Обновляем права пользователя из белого списка...');
                const { error: updateError } = await supabaseClient
                    .from('users')
                    .update({
                        can_upload: whitelistEntry.can_upload,
                        is_admin: whitelistEntry.is_admin
                    })
                    .eq('telegram_user_id', user.id);
                
                if (!updateError) {
                    data.can_upload = whitelistEntry.can_upload;
                    data.is_admin = whitelistEntry.is_admin;
                }
            }
        }
        
        currentUserPermissions = {
            can_upload: data.can_upload || false,
            is_admin: data.is_admin || false,
            is_blocked: data.is_blocked || false
        };
        
        // 🔥 ПРОВЕРЯЕМ И СОЗДАЁМ ИСПОЛНИТЕЛЯ ДЛЯ СУЩЕСТВУЮЩЕГО ПОЛЬЗОВАТЕЛЯ
        await createArtist(user);
        
        return data;
        
    } catch (e) {
        console.error('❌ Ошибка:', e);
        return null;
    }
}

// ============================================================
// ОБНОВЛЕНИЕ UI
// ============================================================

function updateUserUI(user) {
    if (!user) return;
    
    const greeting = document.getElementById('greeting');
    if (greeting) {
        const name = user.first_name || 'Гость';
        greeting.textContent = name;
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
    
    const isAuthenticated = tgUserId && tgUserId !== 0 && tgUserId !== 123456789;
    
    if (hasPermission && isAuthenticated) {
        uploadBtn.style.display = 'flex';
        console.log('🔓 Кнопка загрузки ДОСТУПНА');
    } else {
        uploadBtn.style.display = 'none';
        console.log('🔒 Кнопка загрузки СКРЫТА');
    }
}

// ============================================================
// ОБНОВЛЕНИЕ АВАТАРА
// ============================================================

async function updateProfileAvatar(user) {
    if (!user || !user.id) return;
    
    const avatarEl = document.getElementById('profileAvatar');
    if (!avatarEl) return;
    
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
    
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || '👤';
    avatarEl.textContent = initials;
    avatarEl.style.fontSize = '32px';
    avatarEl.style.display = 'flex';
    avatarEl.style.alignItems = 'center';
    avatarEl.style.justifyContent = 'center';
}