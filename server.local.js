const express = require('express');
const cors = require('cors');
const https = require('https');
const { URLSearchParams } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Конфигурация GigaChat
const CONFIG = {
    AUTH_HOST: 'ngw.devices.sberbank.ru',
    AUTH_PORT: 9443,
    AUTH_PATH: '/api/v2/oauth',
    CHAT_HOST: 'gigachat.devices.sberbank.ru',
    CHAT_PORT: 443,
    CHAT_PATH: '/api/v1/chat/completions',
    SCOPE: 'GIGACHAT_API_PERS',
    AUTH_KEY: process.env.GIGACHAT_AUTH_KEY || 'MDE5YTRlY2ItYWZmMS03MTk3LWFiNTctMzE5ZGYxOWQ3NGFiOjJiOTM1ODQ1LTFhYzMtNDBlNy04YTAwLTRmYjkzNDU5YjVlOQ=='
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Генерация уникального ID для запроса
function generateRqUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Получение токена доступа
function getAccessToken() {
    return new Promise((resolve, reject) => {
        const postData = `scope=${CONFIG.SCOPE}`;
        
        const options = {
            hostname: CONFIG.AUTH_HOST,
            port: CONFIG.AUTH_PORT,
            path: CONFIG.AUTH_PATH,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'RqUID': generateRqUID(),
                'Authorization': `Basic ${CONFIG.AUTH_KEY}`,
                'Content-Length': Buffer.byteLength(postData)
            },
            rejectUnauthorized: false // Для самоподписанных сертификатов Сбера
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (e) {
                        reject(new Error('Ошибка парсинга ответа: ' + e.message));
                    }
                } else {
                    reject(new Error(`Ошибка авторизации: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Отправка сообщения в GigaChat
function sendToGigaChat(token, messages, temperature = 0.7, maxTokens = 2000) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: 'GigaChat',
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
            n: 1
        });

        const options = {
            hostname: CONFIG.CHAT_HOST,
            port: CONFIG.CHAT_PORT,
            path: CONFIG.CHAT_PATH,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Length': Buffer.byteLength(postData)
            },
            rejectUnauthorized: false
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (e) {
                        reject(new Error('Ошибка парсинга ответа: ' + e.message));
                    }
                } else {
                    reject(new Error(`Ошибка API: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Кэш токена
let tokenCache = {
    token: null,
    expiresAt: null
};

// API endpoint для получения токена
app.post('/api/auth', async (req, res) => {
    try {
        // Проверяем кэш
        if (tokenCache.token && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt - 300000) {
            return res.json({
                access_token: tokenCache.token,
                expires_at: Math.floor(tokenCache.expiresAt / 1000)
            });
        }

        // Получаем новый токен
        const data = await getAccessToken();
        
        // Кэшируем токен
        tokenCache.token = data.access_token;
        tokenCache.expiresAt = data.expires_at * 1000;
        
        res.json(data);
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        res.status(500).json({ error: error.message });
    }
});

// Системный промпт для BAT AI
const SYSTEM_PROMPT = {
    role: 'system',
    content: `Ты BAT AI - помощник Бэтмена и Бэтвумен. Представляйся так только на прямые вопросы о тебе (кто ты, как зовут). В остальных случаях просто помогай - профессионально, дружелюбно, информативно.`
};

// API endpoint для чата
app.post('/api/chat', async (req, res) => {
    try {
        const { token, messages, temperature, max_tokens } = req.body;
        
        if (!token || !messages) {
            return res.status(400).json({ error: 'Отсутствуют обязательные параметры' });
        }

        // Добавляем системный промпт в начало, если его еще нет
        const messagesWithSystem = messages[0]?.role === 'system' 
            ? messages 
            : [SYSTEM_PROMPT, ...messages];

        const data = await sendToGigaChat(token, messagesWithSystem, temperature, max_tokens);
        res.json(data);
    } catch (error) {
        console.error('Ошибка чата:', error);
        
        // Если ошибка содержит информацию о статусе 401, передаем ее клиенту
        if (error.message.includes('401')) {
            return res.status(401).json({ error: error.message });
        }
        
        res.status(500).json({ error: error.message });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   🚀 GigaChat Proxy Server запущен!       ║
╚════════════════════════════════════════════╝

📍 Адрес: http://localhost:${PORT}
🌐 Откройте: http://localhost:${PORT}/index.html

✅ CORS настроен
✅ Прокси готов к работе
✅ Токены кэшируются автоматически

Нажмите Ctrl+C для остановки
    `);
});
