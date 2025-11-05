// Конфигурация
const CONFIG = {
    STORAGE_KEYS: {
        API_KEY: 'gigachat_api_key',
        ACCESS_TOKEN: 'gigachat_access_token',
        TOKEN_EXPIRY: 'gigachat_token_expiry',
        CHAT_HISTORY: 'chat_history',
        TOKEN_USAGE: 'token_usage_data'
    },
    API: {
        AUTH_URL: '/api/auth',
        CHAT_URL: '/api/chat',
        SCOPE: 'GIGACHAT_API_PERS'
    },
    MAX_HISTORY: 50,
    TOKEN_LIMIT: {
        MAX_TOKENS: 1500,
        PERIOD_MS: 24 * 60 * 60 * 1000 // 24 часа
    }
};

// Состояние приложения
const state = {
    apiKey: null,
    accessToken: null,
    tokenExpiry: null,
    chatHistory: [],
    isTyping: false,
    tokenUsage: {
        used: 0,
        resetTime: null,
        history: []
    },
    // Состояние распознавания речи
    speech: {
        recognition: null,
        isRecording: false,
        currentInput: null // 'home' или 'chat'
    }
};

// DOM элементы
const elements = {
    // Home page
    homePage: document.getElementById('homePage'),
    homeMessageInput: document.getElementById('homeMessageInput'),
    homeSendBtn: document.getElementById('homeSendBtn'),
    homeVoiceBtn: document.getElementById('homeVoiceBtn'),
    suggestionsScroll: document.getElementById('suggestionsScroll'),
    homeTokenProgress: document.getElementById('homeTokenProgress'),
    homeCharCount: document.getElementById('homeCharCount'),
    
    // Chat
    chatContainer: document.getElementById('chatContainer'),
    inputContainer: document.getElementById('inputContainer'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    chatVoiceBtn: document.getElementById('chatVoiceBtn'),
    clearBtn: document.getElementById('clearBtn'),
    charCount: document.getElementById('charCount'),
    chatTokenProgress: document.getElementById('chatTokenProgress'),
    
    // Modal
    apiModal: document.getElementById('apiModal'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    apiSaveBtn: document.getElementById('apiSaveBtn'),
    apiHelpBtn: document.getElementById('apiHelpBtn')
};

// Инициализация
function init() {
    loadFromStorage();
    setupEventListeners();
    checkTokenValidity();
    initTokenUsage();
    updateTokenProgressDisplay();
    
    // Показываем главную или чат в зависимости от наличия истории
    if (state.chatHistory.length > 0) {
        showChatPage();
        renderChatHistory();
    } else {
        showHomePage();
    }
}

// Показать главную страницу
function showHomePage() {
    elements.homePage.classList.remove('hidden');
    elements.chatContainer.classList.add('hidden');
    elements.inputContainer.classList.add('hidden');
    document.querySelector('.header').classList.add('hidden');
}

// Показать страницу чата
function showChatPage() {
    elements.homePage.classList.add('hidden');
    elements.chatContainer.classList.remove('hidden');
    elements.inputContainer.classList.remove('hidden');
    document.querySelector('.header').classList.remove('hidden');
}

// Проверка валидности токена при загрузке
function checkTokenValidity() {
    if (state.tokenExpiry) {
        const now = Date.now();
        const expiry = parseInt(state.tokenExpiry);
        
        // Если токен уже истек, очищаем его
        if (now >= expiry) {
            console.log('⚠ Токен истек при загрузке, очищаем');
            state.accessToken = null;
            state.tokenExpiry = null;
            localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN_EXPIRY);
        }
    }
}

// Загрузка данных из localStorage
function loadFromStorage() {
    state.apiKey = localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);
    state.accessToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    state.tokenExpiry = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN_EXPIRY);
    
    // Загружаем историю чата
    const savedHistory = localStorage.getItem(CONFIG.STORAGE_KEYS.CHAT_HISTORY);
    if (savedHistory) {
        try {
            state.chatHistory = JSON.parse(savedHistory);
        } catch (e) {
            console.error('Ошибка загрузки истории:', e);
            state.chatHistory = [];
        }
    }
    
    // Загружаем данные об использовании токенов
    const savedTokenUsage = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN_USAGE);
    if (savedTokenUsage) {
        try {
            state.tokenUsage = JSON.parse(savedTokenUsage);
        } catch (e) {
            console.error('Ошибка загрузки данных о токенах:', e);
            state.tokenUsage = { used: 0, resetTime: null, history: [] };
        }
    }
}

// Сохранение в localStorage
function saveToStorage() {
    if (state.apiKey) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.API_KEY, state.apiKey);
    }
    if (state.accessToken) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, state.accessToken);
    }
    if (state.tokenExpiry) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN_EXPIRY, state.tokenExpiry);
    }
    
    // Сохраняем историю чата
    localStorage.setItem(CONFIG.STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(state.chatHistory));
    
    // Сохраняем данные об использовании токенов
    localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN_USAGE, JSON.stringify(state.tokenUsage));
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Home page
    elements.homeSendBtn.addEventListener('click', () => handleSendMessage(true));
    elements.homeVoiceBtn.addEventListener('click', () => toggleVoiceRecording('home'));
    elements.homeMessageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(true);
        }
    });
    
    elements.homeMessageInput.addEventListener('input', () => {
        autoResizeTextarea(elements.homeMessageInput);
        updateHomeCharCount();
        updateHomeButtons();
    });
    
    // Suggestions
    const suggestionCards = document.querySelectorAll('.suggestion-card');
    suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            elements.homeMessageInput.value = prompt;
            autoResizeTextarea(elements.homeMessageInput);
            updateHomeCharCount();
            updateHomeButtons();
            elements.homeMessageInput.focus();
        });
    });
    
    // Chat
    elements.sendBtn.addEventListener('click', () => handleSendMessage(false));
    elements.chatVoiceBtn.addEventListener('click', () => toggleVoiceRecording('chat'));
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(false);
        }
    });
    
    elements.messageInput.addEventListener('input', () => {
        autoResizeTextarea(elements.messageInput);
        updateCharCount();
        updateChatButtons();
    });
    
    elements.clearBtn.addEventListener('click', handleClearHistory);
    
    // API modal
    elements.apiSaveBtn.addEventListener('click', handleSaveApiKey);
    elements.apiHelpBtn.addEventListener('click', showApiHelp);
    elements.apiKeyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSaveApiKey();
        }
    });
    
    // Инициализация распознавания речи
    initSpeechRecognition();
}


// Обновление кнопок на главной странице
function updateHomeButtons() {
    const hasText = elements.homeMessageInput.value.trim().length > 0;
    const isLimitExceeded = checkTokenLimit();
    
    if (hasText) {
        // Если есть текст - показываем кнопку отправки, скрываем кнопку записи
        elements.homeVoiceBtn.classList.add('hidden');
        elements.homeSendBtn.classList.remove('hidden');
        elements.homeSendBtn.disabled = state.isTyping || isLimitExceeded;
        
        // Обновляем tooltip если лимит превышен
        if (isLimitExceeded) {
            elements.homeSendBtn.title = 'Лимит токенов исчерпан. Ожидайте сброса.';
        } else {
            elements.homeSendBtn.title = 'Отправить сообщение';
        }
    } else if (!state.speech.isRecording) {
        // Если нет текста и не идет запись - показываем кнопку записи
        elements.homeSendBtn.classList.add('hidden');
        elements.homeVoiceBtn.classList.remove('hidden');
        
        // Блокируем кнопку записи если лимит превышен
        elements.homeVoiceBtn.disabled = isLimitExceeded;
        if (isLimitExceeded) {
            elements.homeVoiceBtn.title = 'Лимит токенов исчерпан. Ожидайте сброса.';
        } else {
            elements.homeVoiceBtn.title = 'Записать голосом';
        }
    }
}

// Автоматическое изменение высоты textarea
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// Обновление счетчика символов для главной страницы
function updateHomeCharCount() {
    const count = elements.homeMessageInput.value.length;
    elements.homeCharCount.textContent = `${count} / 4000`;
}

// Обновление счетчика символов для чата
function updateCharCount() {
    const count = elements.messageInput.value.length;
    elements.charCount.textContent = `${count} / 4000`;
}

// Обновление кнопок в чате
function updateChatButtons() {
    const hasText = elements.messageInput.value.trim().length > 0;
    const isLimitExceeded = checkTokenLimit();
    
    if (hasText) {
        // Если есть текст - показываем кнопку отправки, скрываем кнопку записи
        elements.chatVoiceBtn.classList.add('hidden');
        elements.sendBtn.classList.remove('hidden');
        elements.sendBtn.disabled = state.isTyping || isLimitExceeded;
        
        // Обновляем tooltip если лимит превышен
        if (isLimitExceeded) {
            elements.sendBtn.title = 'Лимит токенов исчерпан. Ожидайте сброса.';
        } else {
            elements.sendBtn.title = 'Отправить сообщение';
        }
    } else if (!state.speech.isRecording) {
        // Если нет текста и не идет запись - показываем кнопку записи
        elements.sendBtn.classList.add('hidden');
        elements.chatVoiceBtn.classList.remove('hidden');
        
        // Блокируем кнопку записи если лимит превышен
        elements.chatVoiceBtn.disabled = isLimitExceeded;
        if (isLimitExceeded) {
            elements.chatVoiceBtn.title = 'Лимит токенов исчерпан. Ожидайте сброса.';
        } else {
            elements.chatVoiceBtn.title = 'Записать голосом';
        }
    }
}

// Показать модальное окно API
function showApiModal() {
    elements.apiModal.classList.add('active');
    elements.apiKeyInput.focus();
}

// Скрыть модальное окно API
function hideApiModal() {
    elements.apiModal.classList.remove('active');
}

// Сохранение API ключа
function handleSaveApiKey() {
    const apiKey = elements.apiKeyInput.value.trim();
    
    if (!apiKey) {
        alert('Пожалуйста, введите API ключ');
        return;
    }
    
    state.apiKey = apiKey;
    saveToStorage();
    hideApiModal();
    elements.messageInput.focus();
}

// Показать помощь по API
function showApiHelp() {
    window.open('https://developers.sber.ru/docs/ru/gigachat/individuals-quickstart', '_blank');
}

// Отправка сообщения
async function handleSendMessage(fromHome = false) {
    const input = fromHome ? elements.homeMessageInput : elements.messageInput;
    const message = input.value.trim();
    
    if (!message || state.isTyping) return;
    
    // Проверяем лимит токенов
    if (checkTokenLimit()) {
        alert('Лимит токенов исчерпан. Пожалуйста, дождитесь сброса лимита.');
        return;
    }
    
    // Переключаемся на страницу чата если отправляем с главной
    if (fromHome) {
        showChatPage();
    }
    
    // Добавляем сообщение пользователя
    addMessage('user', message);
    input.value = '';
    autoResizeTextarea(input);
    
    if (!fromHome) {
        updateCharCount();
        updateChatButtons();
    } else {
        updateHomeButtons();
    }
    
    // Показываем индикатор печати
    state.isTyping = true;
    const typingId = showTypingIndicator();
    
    try {
        // Получаем ответ от AI
        const result = await sendToGigaChat(message);
        removeTypingIndicator(typingId);
        addMessage('ai', result.content, result.tokens);
        
        // Обновляем использование токенов
        if (result.tokens) {
            addTokenUsage(result.tokens);
        }
    } catch (error) {
        removeTypingIndicator(typingId);
        addMessage('ai', `Ошибка: ${error.message}`);
        console.error('Ошибка при отправке сообщения:', error);
    } finally {
        state.isTyping = false;
        if (!fromHome) {
            updateChatButtons();
        } else {
            updateHomeButtons();
        }
    }
}

// Добавление сообщения в чат
function addMessage(role, content, tokens = null) {
    // Удаляем приветственное сообщение при первом сообщении
    const welcomeMsg = elements.chatContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    // Добавляем в историю
    state.chatHistory.push({ role, content, timestamp: Date.now(), tokens });
    
    // Ограничиваем размер истории
    if (state.chatHistory.length > CONFIG.MAX_HISTORY) {
        state.chatHistory = state.chatHistory.slice(-CONFIG.MAX_HISTORY);
    }
    
    saveToStorage();
    
    // Рендерим сообщение
    renderMessage(role, content, tokens);
    scrollToBottom();
}

// Рендеринг сообщения
function renderMessage(role, content, tokens = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'Вы' : 'AI';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Для AI показываем роль, для пользователя - нет
    if (role === 'ai') {
        const roleDiv = document.createElement('div');
        roleDiv.className = 'message-role';
        roleDiv.textContent = 'BAT AI';
        contentDiv.appendChild(roleDiv);
    }
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    
    // Обрабатываем Markdown
    if (role === 'ai') {
        const html = marked.parse(content);
        textDiv.innerHTML = DOMPurify.sanitize(html);
    } else {
        textDiv.textContent = content;
    }
    
    contentDiv.appendChild(textDiv);
    
    // Добавляем кнопки действий
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    
    // Кнопка копирования (для всех сообщений)
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.title = 'Скопировать';
    copyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
        </svg>
    `;
    copyBtn.addEventListener('click', () => copyMessageText(content, copyBtn));
    actionsDiv.appendChild(copyBtn);
    
    // Кнопка переспроса (только для пользовательских сообщений)
    if (role === 'user') {
        const retryBtn = document.createElement('button');
        retryBtn.className = 'action-btn';
        retryBtn.title = 'Переспросить';
        retryBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10"></path>
            </svg>
        `;
        retryBtn.addEventListener('click', () => retryMessage(content));
        actionsDiv.appendChild(retryBtn);
    }
    
    // Для пользователя - кнопки вне обводки, для AI - внутри
    if (role === 'user') {
        // Для пользователя: создаем wrapper для контента и кнопок
        const userWrapper = document.createElement('div');
        userWrapper.className = 'message-user-wrapper';
        
        userWrapper.appendChild(contentDiv);
        
        // Кнопки под обводкой
        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'message-actions-outside';
        actionsWrapper.appendChild(actionsDiv);
        userWrapper.appendChild(actionsWrapper);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(userWrapper);
    } else {
        // Для AI: все внутри contentDiv
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'message-footer';
        actionsContainer.appendChild(actionsDiv);
        
        // Добавляем информацию о токенах и воде для AI сообщений
        if (tokens) {
            const statsContainer = document.createElement('div');
            statsContainer.className = 'message-stats';
            
            // Расчет воды: примерно 0.07 мл на токен
            const waterUsed = (tokens * 0.07).toFixed(2);
            
            // Иконка воды
            const waterDiv = document.createElement('div');
            waterDiv.className = 'message-water';
            waterDiv.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                </svg>
                <span>${waterUsed} мл</span>
            `;
            waterDiv.title = `Потрачено воды на охлаждение серверов`;
            
            // Токены
            const tokensDiv = document.createElement('div');
            tokensDiv.className = 'message-tokens';
            tokensDiv.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                </svg>
                <span>${tokens} токенов</span>
            `;
            tokensDiv.title = `Использовано токенов`;
            
            statsContainer.appendChild(waterDiv);
            statsContainer.appendChild(tokensDiv);
            actionsContainer.appendChild(statsContainer);
        }
        
        contentDiv.appendChild(actionsContainer);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
    }
    
    elements.chatContainer.appendChild(messageDiv);
}

// Копирование текста сообщения
function copyMessageText(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = button.innerHTML;
        const originalTitle = button.title;
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        button.title = 'Скопировано!';
        button.classList.add('success');
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.title = originalTitle;
            button.classList.remove('success');
        }, 2000);
    }).catch(err => {
        console.error('Ошибка копирования:', err);
        alert('Не удалось скопировать текст');
    });
}

// Переспросить (удалить все после этого сообщения и вернуть текст в поле ввода)
function retryMessage(messageText) {
    // Находим индекс этого сообщения в истории
    const messageIndex = state.chatHistory.findIndex(msg => 
        msg.role === 'user' && msg.content === messageText
    );
    
    if (messageIndex === -1) return;
    
    // Удаляем все сообщения после этого (включая его)
    state.chatHistory = state.chatHistory.slice(0, messageIndex);
    saveToStorage();
    
    // Очищаем контейнер и перерисовываем историю
    elements.chatContainer.innerHTML = '';
    if (state.chatHistory.length === 0) {
        elements.chatContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                </div>
                <h2>Добро пожаловать в BAT AI</h2>
                <p>Начните диалог, задав вопрос ниже</p>
            </div>
        `;
    } else {
        state.chatHistory.forEach(msg => {
            renderMessage(msg.role, msg.content);
        });
    }
    
    // Вставляем текст в поле ввода
    elements.messageInput.value = messageText;
    elements.messageInput.focus();
    autoResizeTextarea(elements.messageInput);
    updateCharCount();
    updateChatButtons();
    scrollToBottom();
}

// Показать индикатор печати
function showTypingIndicator() {
    const typingId = 'typing-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai';
    messageDiv.id = typingId;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'AI';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    
    contentDiv.appendChild(typingDiv);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    elements.chatContainer.appendChild(messageDiv);
    scrollToBottom();
    
    return typingId;
}

// Удалить индикатор печати
function removeTypingIndicator(typingId) {
    const typingElement = document.getElementById(typingId);
    if (typingElement) {
        typingElement.remove();
    }
}

// Прокрутка вниз
function scrollToBottom() {
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

// Рендеринг истории чата
function renderChatHistory() {
    if (state.chatHistory.length === 0) return;
    
    // Удаляем приветственное сообщение
    const welcomeMsg = elements.chatContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    // Рендерим все сообщения
    state.chatHistory.forEach(msg => {
        renderMessage(msg.role, msg.content, msg.tokens);
    });
    
    scrollToBottom();
}

// Очистка истории
function handleClearHistory() {
    if (!confirm('Вы уверены, что хотите удалить всю переписку?')) {
        return;
    }
    
    // Очищаем историю
    state.chatHistory = [];
    elements.chatContainer.innerHTML = '';
    
    // Удаляем из localStorage
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CHAT_HISTORY);
    
    // Возвращаемся на главную
    showHomePage();
}

// ============= GigaChat API =============

// Проверка и обновление токена
async function ensureValidToken() {
    // Проверяем, есть ли токен и не истек ли он
    if (state.accessToken && state.tokenExpiry) {
        const now = Date.now();
        const expiry = parseInt(state.tokenExpiry);
        const timeLeft = expiry - now;
        
        console.log(`Проверка токена: осталось ${Math.floor(timeLeft / 1000)} секунд`);
        
        // Если токен еще действителен (с запасом 5 минут)
        if (now < expiry - 300000) {
            console.log('✓ Токен действителен');
            return state.accessToken;
        }
        
        console.log('⚠ Токен скоро истечет, получаем новый');
    } else {
        console.log('⚠ Токен отсутствует, получаем новый');
    }
    
    // Получаем новый токен
    return await getAccessToken();
}

// Получение access token через прокси-сервер
async function getAccessToken() {
    try {
        console.log('Получение токена через прокси...');
        
        const response = await fetch(CONFIG.API.AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✓ Токен получен успешно');
        
        state.accessToken = data.access_token;
        
        // Сохраняем время истечения (expires_at уже в секундах Unix timestamp)
        if (data.expires_at) {
            state.tokenExpiry = data.expires_at * 1000; // Конвертируем в миллисекунды
        } else {
            // Если нет expires_at, устанавливаем 30 минут от текущего времени
            state.tokenExpiry = Date.now() + 1800000;
        }
        
        saveToStorage();
        return state.accessToken;
    } catch (error) {
        console.error('Ошибка получения токена:', error);
        
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Не удалось подключиться к серверу. Убедитесь, что сервер запущен (npm start).');
        }
        
        throw new Error('Ошибка авторизации: ' + error.message);
    }
}

// Отправка сообщения в GigaChat через прокси-сервер
async function sendToGigaChat(message, retryCount = 0) {
    try {
        const token = await ensureValidToken();
        
        // Формируем историю сообщений для контекста
        const messages = state.chatHistory
            .slice(-10) // Берем последние 10 сообщений для контекста
            .map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));
        
        // Добавляем текущее сообщение
        messages.push({
            role: 'user',
            content: message
        });
        
        const response = await fetch(CONFIG.API.CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // Если токен истек и это первая попытка - получаем новый токен и повторяем
            if (response.status === 401 && retryCount === 0) {
                console.log('Токен истек, получаем новый...');
                // Сбрасываем токен
                state.accessToken = null;
                state.tokenExpiry = null;
                saveToStorage();
                // Повторяем запрос с новым токеном
                return await sendToGigaChat(message, retryCount + 1);
            }
            
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Некорректный ответ от API');
        }
        
        // Возвращаем контент и информацию о токенах
        return {
            content: data.choices[0].message.content,
            tokens: data.usage ? data.usage.total_tokens : null
        };
    } catch (error) {
        console.error('Ошибка GigaChat API:', error);
        
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Не удалось подключиться к серверу. Убедитесь, что сервер запущен (npm start).');
        }
        
        throw error;
    }
}

// Генерация уникального ID для запроса
function generateRqUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ============= Управление токенами =============

// Проверка превышения лимита токенов
function checkTokenLimit() {
    const now = Date.now();
    
    // Если время сброса прошло, сбрасываем счетчик
    if (state.tokenUsage.resetTime && now >= state.tokenUsage.resetTime) {
        initTokenUsage();
        return false;
    }
    
    // Проверяем, превышен ли лимит
    return state.tokenUsage.used >= CONFIG.TOKEN_LIMIT.MAX_TOKENS;
}

// Инициализация системы учета токенов
function initTokenUsage() {
    const now = Date.now();
    
    // Если нет времени сброса или оно прошло
    if (!state.tokenUsage.resetTime || now >= state.tokenUsage.resetTime) {
        state.tokenUsage.resetTime = now + CONFIG.TOKEN_LIMIT.PERIOD_MS;
        state.tokenUsage.used = 0;
        state.tokenUsage.history = [];
        saveToStorage();
    } else {
        // Очищаем устаревшие записи
        cleanupOldTokenUsage();
    }
}

// Очистка устаревших записей
function cleanupOldTokenUsage() {
    const now = Date.now();
    const cutoffTime = now - CONFIG.TOKEN_LIMIT.PERIOD_MS;
    
    state.tokenUsage.history = state.tokenUsage.history.filter(entry => entry.timestamp > cutoffTime);
    
    // Пересчитываем общее количество
    state.tokenUsage.used = state.tokenUsage.history.reduce((sum, entry) => sum + entry.tokens, 0);
    saveToStorage();
}

// Добавление использованных токенов
function addTokenUsage(tokens) {
    const now = Date.now();
    
    // Проверяем, не прошел ли период
    if (now >= state.tokenUsage.resetTime) {
        initTokenUsage();
    }
    
    // Добавляем запись
    state.tokenUsage.history.push({
        tokens: tokens,
        timestamp: now
    });
    
    state.tokenUsage.used += tokens;
    
    // Очищаем старые записи
    cleanupOldTokenUsage();
    
    // Обновляем отображение
    updateTokenProgressDisplay();
}

// Обновление отображения прогресс-бара
function updateTokenProgressDisplay() {
    const percentage = Math.min((state.tokenUsage.used / CONFIG.TOKEN_LIMIT.MAX_TOKENS) * 100, 100);
    const circumference = 100.53; // 2 * PI * r (r=16)
    const offset = circumference - (percentage / 100) * circumference;
    
    // Определяем уровень заполненности
    let level = 'low';
    if (percentage >= 100) {
        level = 'exceeded';
    } else if (percentage >= 80) {
        level = 'high';
    } else if (percentage >= 50) {
        level = 'medium';
    }
    
    // Обновляем оба прогресс-бара
    updateProgressBar(elements.homeTokenProgress, offset, level, state.tokenUsage.used);
    updateProgressBar(elements.chatTokenProgress, offset, level, state.tokenUsage.used);
    
    // Обновляем кнопки после изменения лимита
    updateHomeButtons();
    updateChatButtons();
}

// Обновление конкретного прогресс-бара
function updateProgressBar(element, offset, level, used) {
    if (!element) return;
    
    const progressBar = element.querySelector('.progress-bar');
    const progressText = element.querySelector('.token-progress-text');
    
    if (progressBar) {
        progressBar.style.strokeDashoffset = offset;
    }
    
    if (progressText) {
        // Отображаем сокращенное значение
        if (used >= 1000) {
            progressText.textContent = (used / 1000).toFixed(1) + 'k';
        } else {
            progressText.textContent = used;
        }
    }
    
    // Устанавливаем уровень для цвета
    element.setAttribute('data-level', level);
    
    // Обновляем tooltip
    const timeLeft = state.tokenUsage.resetTime - Date.now();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    element.title = `Использовано ${used} из ${CONFIG.TOKEN_LIMIT.MAX_TOKENS} токенов\nСброс через ${hoursLeft}ч ${minutesLeft}м`;
}

// ============= Распознавание речи =============

// Инициализация распознавания речи
function initSpeechRecognition() {
    // Проверяем поддержку Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn('Распознавание речи не поддерживается в этом браузере');
        // Скрываем кнопки записи, если API не поддерживается
        elements.homeVoiceBtn.style.display = 'none';
        elements.chatVoiceBtn.style.display = 'none';
        elements.homeSendBtn.classList.remove('hidden');
        elements.sendBtn.classList.remove('hidden');
        return;
    }
    
    // Создаем экземпляр распознавания
    state.speech.recognition = new SpeechRecognition();
    state.speech.recognition.continuous = true; // Непрерывное распознавание
    state.speech.recognition.interimResults = true; // Промежуточные результаты
    state.speech.recognition.lang = 'ru-RU'; // Язык распознавания
    
    // Обработчик результатов распознавания
    state.speech.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        // Собираем все результаты
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Определяем текущее поле ввода
        const input = state.speech.currentInput === 'home' 
            ? elements.homeMessageInput 
            : elements.messageInput;
        
        // Обновляем текст в поле ввода
        if (finalTranscript) {
            // Добавляем финальный текст к существующему
            const currentValue = input.value;
            input.value = currentValue + finalTranscript;
            autoResizeTextarea(input);
        }
        
        // Показываем промежуточный результат (опционально)
        if (interimTranscript && !finalTranscript) {
            const currentValue = input.value;
            // Временно показываем промежуточный текст
            input.setAttribute('data-interim', interimTranscript);
        }
    };
    
    // Обработчик ошибок
    state.speech.recognition.onerror = (event) => {
        console.error('Ошибка распознавания речи:', event.error);
        
        if (event.error === 'no-speech') {
            console.log('Речь не обнаружена');
        } else if (event.error === 'not-allowed') {
            alert('Доступ к микрофону запрещен. Разрешите доступ в настройках браузера.');
        }
        
        // Останавливаем запись при ошибке
        stopVoiceRecording();
    };
    
    // Обработчик окончания распознавания
    state.speech.recognition.onend = () => {
        if (state.speech.isRecording) {
            // Если запись все еще активна, перезапускаем (для непрерывной записи)
            try {
                state.speech.recognition.start();
            } catch (e) {
                console.log('Не удалось перезапустить распознавание');
                stopVoiceRecording();
            }
        }
    };
}

// Переключение записи голоса
function toggleVoiceRecording(inputType) {
    if (state.speech.isRecording) {
        stopVoiceRecording();
    } else {
        startVoiceRecording(inputType);
    }
}

// Начать запись голоса
function startVoiceRecording(inputType) {
    if (!state.speech.recognition) {
        alert('Распознавание речи не поддерживается в вашем браузере');
        return;
    }
    
    // Проверяем лимит токенов
    if (checkTokenLimit()) {
        alert('Лимит токенов исчерпан. Пожалуйста, дождитесь сброса лимита.');
        return;
    }
    
    try {
        state.speech.isRecording = true;
        state.speech.currentInput = inputType;
        
        // Обновляем UI
        const voiceBtn = inputType === 'home' ? elements.homeVoiceBtn : elements.chatVoiceBtn;
        voiceBtn.classList.add('recording');
        voiceBtn.title = 'Остановить запись';
        
        // Запускаем распознавание
        state.speech.recognition.start();
        
        console.log('Запись голоса началась');
    } catch (error) {
        console.error('Ошибка при запуске записи:', error);
        stopVoiceRecording();
    }
}

// Остановить запись голоса
function stopVoiceRecording() {
    if (!state.speech.recognition || !state.speech.isRecording) {
        return;
    }
    
    try {
        state.speech.isRecording = false;
        state.speech.recognition.stop();
        
        // Обновляем UI
        const voiceBtn = state.speech.currentInput === 'home' 
            ? elements.homeVoiceBtn 
            : elements.chatVoiceBtn;
        voiceBtn.classList.remove('recording');
        voiceBtn.title = 'Записать голосом';
        
        // Обновляем кнопки в зависимости от наличия текста
        if (state.speech.currentInput === 'home') {
            updateHomeButtons();
        } else {
            updateChatButtons();
            updateCharCount();
        }
        
        console.log('Запись голоса остановлена');
    } catch (error) {
        console.error('Ошибка при остановке записи:', error);
    }
    
    state.speech.currentInput = null;
}

// Сворачивание клавиатуры при клике вне области ввода (для мобильных устройств)
function setupKeyboardDismiss() {
    // Проверяем, является ли устройство мобильным
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (!isMobile) return;
    
    // Добавляем обработчик клика на весь документ
    document.addEventListener('click', (e) => {
        // Проверяем, что клик был не по полю ввода и не по кнопкам
        const isInputClick = e.target.closest('textarea, input, button, .input-wrapper, .home-input-wrapper');
        
        if (!isInputClick) {
            // Убираем фокус с активного элемента (сворачивает клавиатуру)
            if (document.activeElement && 
                (document.activeElement.tagName === 'TEXTAREA' || 
                 document.activeElement.tagName === 'INPUT')) {
                document.activeElement.blur();
            }
        }
    });
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    init();
    setupKeyboardDismiss();
});
