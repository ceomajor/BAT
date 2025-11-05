const https = require('https');

// Конфигурация GigaChat
const CONFIG = {
    AUTH_HOST: 'ngw.devices.sberbank.ru',
    AUTH_PORT: 9443,
    AUTH_PATH: '/api/v2/oauth',
    SCOPE: 'GIGACHAT_API_PERS',
    AUTH_KEY: process.env.GIGACHAT_AUTH_KEY || 'MDE5YTRlY2ItYWZmMS03MTk3LWFiNTctMzE5ZGYxOWQ3NGFiOjJiOTM1ODQ1LTFhYzMtNDBlNy04YTAwLTRmYjkzNDU5YjVlOQ=='
};

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

// Кэш токена (в памяти serverless функции)
let tokenCache = {
    token: null,
    expiresAt: null
};

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
        // Проверяем кэш
        if (tokenCache.token && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt - 300000) {
            return res.status(200).json({
                access_token: tokenCache.token,
                expires_at: Math.floor(tokenCache.expiresAt / 1000)
            });
        }

        // Получаем новый токен
        const data = await getAccessToken();
        
        // Кэшируем токен
        tokenCache.token = data.access_token;
        tokenCache.expiresAt = data.expires_at * 1000;
        
        res.status(200).json(data);
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        res.status(500).json({ error: error.message });
    }
};
