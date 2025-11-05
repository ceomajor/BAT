# ⚡ Быстрый деплой на Vercel

## Вариант 1: Через GitHub (рекомендуется)

### 1. Загрузите на GitHub

```bash
cd "/Users/sulim/Downloads/Black Hole AI"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ваш-username/bat-ai.git
git push -u origin main
```

### 2. Деплой на Vercel

1. Откройте https://vercel.com
2. Войдите через GitHub
3. Нажмите "Add New..." → "Project"
4. Выберите репозиторий `bat-ai`
5. Нажмите "Deploy"

### 3. Добавьте переменную окружения

В настройках проекта на Vercel:
- Settings → Environment Variables
- Добавьте: `GIGACHAT_AUTH_KEY`
- Значение: `MDE5YTRlY2ItYWZmMS03MTk3LWFiNTctMzE5ZGYxOWQ3NGFiOjJiOTM1ODQ1LTFhYzMtNDBlNy04YTAwLTRmYjkzNDU5YjVlOQ==`
- Нажмите "Save"

### 4. Готово! 🎉

Ваше приложение доступно по адресу: `https://ваш-проект.vercel.app`

---

## Вариант 2: Через Vercel CLI

### 1. Установите Vercel CLI

```bash
npm install -g vercel
```

### 2. Деплой

```bash
cd "/Users/sulim/Downloads/Black Hole AI"
vercel
```

### 3. Добавьте переменную окружения

```bash
vercel env add GIGACHAT_AUTH_KEY production
```

Вставьте: `MDE5YTRlY2ItYWZmMS03MTk3LWFiNTctMzE5ZGYxOWQ3NGFiOjJiOTM1ODQ1LTFhYzMtNDBlNy04YTAwLTRmYjkzNDU5YjVlOQ==`

### 4. Продакшн деплой

```bash
vercel --prod
```

---

## Проверка работы

1. Откройте ваш URL
2. Введите сообщение в чат
3. Получите ответ от BAT AI

## Обновление

Просто сделайте push в GitHub - Vercel автоматически обновит:

```bash
git add .
git commit -m "Update"
git push
```

---

**Все готово для деплоя!** 🚀
