const https = require('https');

// Конфигурация GigaChat
const CONFIG = {
    CHAT_HOST: 'gigachat.devices.sberbank.ru',
    CHAT_PORT: 443,
    CHAT_PATH: '/api/v1/chat/completions'
};

// Системный промпт для BAT AI
const SYSTEM_PROMPT = {
    role: 'system',
    content: `Ты BAT AI - помощник Бэтмена и Бэтвумен. Представляйся так только на прямые вопросы о тебе (кто ты, как зовут). В остальных случаях просто помогай - профессионально, дружелюбно, информативно.`
};

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

module.exports = async (req, res) => {
    // Настройка CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
        res.status(200).json(data);
    } catch (error) {
        console.error('Ошибка чата:', error);
        
        // Если ошибка содержит информацию о статусе 401, передаем ее клиенту
        if (error.message.includes('401')) {
            return res.status(401).json({ error: error.message });
        }
        
        res.status(500).json({ error: error.message });
    }
};
