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

Лидерборд использует 1 документ на пользователя: `docId = uid` (чтобы новый рекорд обновлял старую строку).

## Включение Auth (обязательно для лидерборда)

1. В Firebase Console открой `Authentication` -> `Sign-in method`.
2. Включи `Email/Password`.

В игре рекорд сохраняется только для авторизованных пользователей и под их ником (nickname задается при регистрации).
Ник меняется на отдельной странице `profile.html`.

Если регистрация/вход не работают:
- Проверь, что `Email/Password` реально включен (иначе будет `auth/operation-not-allowed`).
- Пароль минимум 6 символов (иначе `auth/weak-password`).
- Не запускай через `file://`, используй локальный сервер.
- Если ошибка `auth/unauthorized-domain`, добавь домен в `Authentication` -> `Settings` -> `Authorized domains` (например `localhost`).
- Если ошибка `auth/configuration-not-found`, почти всегда это: конфиг в `firebase-config.js` от другого проекта или в проекте еще не включали/не открывали Firebase Authentication.

## Пример Firestore Rules (Auth + leaderboard)

Пример правил для коллекции `leaderboard` (читать всем, а создавать/обновлять только свой документ `uid`):

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{uid} {
      allow read: if true;
      allow create, update: if
        request.auth != null &&
        request.auth.uid == uid &&
        request.resource.data.keys().hasOnly(['name','timeMs','moves','createdAt','updatedAt']) &&
        request.resource.data.name is string &&
        request.resource.data.name.size() >= 2 &&
        request.resource.data.name.size() <= 16 &&
        request.resource.data.timeMs is int &&
        request.resource.data.timeMs >= 0 &&
        request.resource.data.timeMs < 3600000 &&
        request.resource.data.moves is int &&
        request.resource.data.moves >= 0 &&
        request.resource.data.moves < 9999;
      allow delete: if false;
    }
  }
}
```

Если хочешь другую коллекцию, поменяй `window.LEADERBOARD_COLLECTION` в `firebase-config.js`.

## PVP комнаты (Firestore)

PVP использует документы:
- `rooms/{code}`: комната (код 5 цифр, сложность, лимит игроков, хост, seed, статус, startAt)
- `rooms/{code}/players/{uid}`: игроки (ник, ходы, время, finishedAt)

Правила для `rooms` и `players` уже добавлены в `firestore.rules` (не забудь задеплоить rules).

## Что уже сделано

- После победы рекорд отправляется автоматически (если ты вошел в аккаунт).
- Справа показывается топ-10 (сортировка по `timeMs`).
- Если Firebase не настроен, игра работает, но лидерборд отключен.

Ник для лидерборда задается при регистрации (и его можно поменять после входа).

## PVP (позже)

Для PVP обычно понадобится:
- Firebase Auth (регистрация/логин).
- `users` профили, `friendRequests` и `friends`.
- Матчмейкинг/комнаты (Firestore) и/или Cloud Functions для честности и защиты от читов.

## Как почистить лидерборд от старых записей

Если раньше лидерборд писал записи через `.add()` (со случайным `docId`), в коллекции `leaderboard` могли остаться старые документы.

Самый простой способ:
- Firebase Console -> Firestore Database -> Data.
- Открой коллекцию `leaderboard`.
- Удали старые документы вручную (обычно у них `Document ID` выглядит как случайная строка, а новые документы имеют `Document ID = uid` пользователя).

Важно: клиентская игра не должна уметь удалять чужие записи, поэтому “кнопку очистки” в игре мы не делаем.
