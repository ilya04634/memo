# Memory Cards (Solo + PVP) on Firebase

Веб-игра "Memory Cards" на чистых `HTML/CSS/JS`: одиночный режим и онлайн PVP (комнаты по 5-значному коду) + лидерборды по уровням сложности.

## Возможности

- Одиночная игра: 4 уровня сложности
  - `Легкий — бала`
  - `Средний — жигит`
  - `Сложный — баатыр`
  - `Суперсложно — Эмирхан` (спец-механика: после нескольких ошибок закрытые карты перемешиваются)
- Лидерборд по сложности (отдельный для каждого уровня).
- Мультиплеер (PVP):
  - создание комнаты (код 5 цифр)
  - лобби со списком игроков и никами
  - старт матча с общим отсчетом
  - realtime-таблица матча (ходы и время финиша)
  - перезапуск матча тем же составом, без пересоздания комнаты
- Авторизация: Email/Password и Google.
- Профиль: смена ника (используется в лидербордах и лобби).
- Настройки: выбор фона (готово под `sprites/background1.png`, `sprites/background2.png`).

## Структура проекта

- `public/` — готовая статика для хостинга (GitHub Pages / Firebase Hosting)
- `sprites/` — ассеты (фон и карточки)
- `firestore.rules` — правила Firestore (лидерборды + комнаты PVP)
- `firebase-config.js` — конфиг Firebase (Web App)

## Локальный запуск

Запускай через локальный сервер (не через `file://`), например VS Code Live Server.

## Деплой на GitHub Pages

GitHub Pages публикует статические файлы из выбранной папки репозитория.

Рекомендуемый вариант: настроить Pages на `public/`.

1. GitHub -> `Settings` -> `Pages`
2. `Build and deployment` -> `Deploy from a branch`
3. Выбери ветку (например `main`) и папку `/public`
4. Закоммить изменения и сделай push

Важно: обновления всегда должны попадать в `public/`. Мы синхронизируем изменения туда при разработке.

## Настройка Firebase (Auth + Firestore)

1. Создай проект в Firebase Console.
2. Добавь Web App (`</>`), скопируй `firebaseConfig`.
3. Включи Firestore Database.
4. Включи Authentication:
   - `Email/Password`
   - `Google` (у тебя уже включено)
5. Вставь конфиг в `firebase-config.js`:

```js
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  appId: "...",
};
```

6. Задеплой правила Firestore из `firestore.rules`.

Если Auth не работает:
- `auth/unauthorized-domain`: добавь домен в `Authentication -> Settings -> Authorized domains` (например `localhost`).

## Данные в Firestore

### Лидерборды по сложности

Документы записываются так, чтобы у пользователя была одна строка на сложность:

- `leaderboards/{difficulty}/entries/{uid}`

`difficulty`: `easy | medium | hard | superhard`.

### PVP комнаты

- `rooms/{code}` — комната (код 5 цифр, сложность, лимит игроков, хост, seed, статус, startAt, matchId)
- `rooms/{code}/players/{uid}` — игроки (ник, ходы, время, finishedAt)

## Как почистить лидерборд от старых записей

Если в Firestore остались старые документы от предыдущих версий:
1. Firebase Console -> Firestore Database -> Data
2. Удали руками ненужные документы/коллекции

Клиент не должен уметь удалять чужие записи, поэтому кнопки "очистить" в игре нет.

