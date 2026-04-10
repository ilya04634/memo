# Memory Cards + Firebase

Это простая веб-игра "найди пары" на `HTML/CSS/JS` с лидербордом на Firebase (Firestore).

## Быстрый старт (локально)

Открывай через любой локальный сервер (например, VS Code Live Server), чтобы не упираться в ограничения браузера для `file://`.

Файлы игры:
- `index.html`
- `styles.css`
- `script.js`

## Настройка Firebase Leaderboard (Firestore)

1. Создай проект в Firebase Console.
2. Добавь Web App (иконка `</>`), скопируй `firebaseConfig`.
3. Включи `Firestore Database` (режим production).
4. Вставь конфиг в `firebase-config.js`:

```js
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  appId: "...",
};
```

5. (Рекомендуется) Настрой Firestore Rules для лидерборда.

Пример простых правил для коллекции `leaderboard` (разрешаем читать всем, а писать только новые записи с адекватными полями):

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{docId} {
      allow read: if true;
      allow create: if
        request.resource.data.keys().hasOnly(['name','timeMs','moves','createdAt']) &&
        request.resource.data.name is string &&
        request.resource.data.name.size() >= 2 &&
        request.resource.data.name.size() <= 16 &&
        request.resource.data.timeMs is int &&
        request.resource.data.timeMs >= 0 &&
        request.resource.data.timeMs < 3600000 &&
        request.resource.data.moves is int &&
        request.resource.data.moves >= 0 &&
        request.resource.data.moves < 9999;
      allow update, delete: if false;
    }
  }
}
```

Если хочешь другую коллекцию, поменяй `window.LEADERBOARD_COLLECTION` в `firebase-config.js`.

## Что уже сделано

- После победы появляется поле имени и кнопка `В лидерборд`.
- Справа показывается топ-10 (сортировка по `timeMs`).
- Если Firebase не настроен, игра работает, но лидерборд отключен.

## PVP (позже)

Для PVP обычно понадобится:
- Firebase Auth (регистрация/логин).
- `users` профили, `friendRequests` и `friends`.
- Матчмейкинг/комнаты (Firestore) и/или Cloud Functions для честности и защиты от читов.

