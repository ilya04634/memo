(() => {
  const DIFFICULTIES = {
    easy: { label: "Легкий — бала", pairs: 4, previewSec: 4, cols: 4 },
    medium: { label: "Средний — жигит", pairs: 6, previewSec: 3, cols: 4 },
    hard: { label: "Сложный — баатыр", pairs: 8, previewSec: 2, cols: 5 },
    superhard: { label: "Суперсложно — Эмирхан", pairs: 10, previewSec: 2, cols: 5 },
  };

  const FRONT_SPRITES_TOTAL = 7;

  const statsBarEl = document.getElementById("statsBar");
  const timeEl = document.getElementById("time");
  const movesEl = document.getElementById("moves");
  const pairsEl = document.getElementById("pairs");

  const toHomeBtn = document.getElementById("toHome");
  const restartBtn = document.getElementById("restart");

  const homeScreenEl = document.getElementById("homeScreen");
  const gameScreenEl = document.getElementById("gameScreen");
  const boardEl = document.getElementById("board");

  const homeMainEl = document.getElementById("homeMain");
  const singleMenuEl = document.getElementById("singleMenu");
  const multiMenuEl = document.getElementById("multiMenu");
  const createMenuEl = document.getElementById("createMenu");
  const joinMenuEl = document.getElementById("joinMenu");
  const lobbyMenuEl = document.getElementById("lobbyMenu");
  const settingsMenuEl = document.getElementById("settingsMenu");
  const leaderMenuEl = document.getElementById("leaderMenu");
  const leaderViewEl = document.getElementById("leaderView");
  const homeHintEl = document.getElementById("homeHint");

  const goSingleBtn = document.getElementById("goSingle");
  const goMultiBtn = document.getElementById("goMulti");
  const goLeaderboardBtn = document.getElementById("goLeaderboard");
  const goSettingsBtn = document.getElementById("goSettings");
  const backFromSingleBtn = document.getElementById("backFromSingle");
  const backFromMultiBtn = document.getElementById("backFromMulti");
  const goCreateRoomBtn = document.getElementById("goCreateRoom");
  const goJoinRoomBtn = document.getElementById("goJoinRoom");
  const backFromCreateBtn = document.getElementById("backFromCreate");
  const backFromJoinBtn = document.getElementById("backFromJoin");
  const backFromSettingsBtn = document.getElementById("backFromSettings");
  const backFromLeaderBtn = document.getElementById("backFromLeader");
  const backFromLeaderViewBtn = document.getElementById("backFromLeaderView");

  const leaderTitleEl = document.getElementById("leaderTitle");
  const leaderMetaEl = document.getElementById("leaderMeta");
  const leaderListEl = document.getElementById("leaderList");

  const roomDifficultyEl = document.getElementById("roomDifficulty");
  const roomMaxPlayersEl = document.getElementById("roomMaxPlayers");
  const createRoomBtn = document.getElementById("createRoomBtn");
  const roomCodeWrapEl = document.getElementById("roomCodeWrap");
  const roomCodeEl = document.getElementById("roomCode");

  const joinCodeEl = document.getElementById("joinCode");
  const joinRoomBtn = document.getElementById("joinRoomBtn");

  const lobbyCodeEl = document.getElementById("lobbyCode");
  const lobbyMetaEl = document.getElementById("lobbyMeta");
  const lobbyCountEl = document.getElementById("lobbyCount");
  const lobbyMaxEl = document.getElementById("lobbyMax");
  const lobbyListEl = document.getElementById("lobbyList");
  const lobbyDifficultyEl = document.getElementById("lobbyDifficulty");
  const saveLobbyDifficultyBtn = document.getElementById("saveLobbyDifficulty");
  const startPvpBtn = document.getElementById("startPvpBtn");
  const leaveLobbyBtn = document.getElementById("leaveLobbyBtn");
  const lobbyHintEl = document.getElementById("lobbyHint");

  const lbListEl = document.getElementById("lbList");
  const lbMetaEl = document.getElementById("lbMeta");
  const lbRefreshBtn = document.getElementById("lbRefresh");

  const globalLbPanelEl = document.getElementById("globalLbPanel");
  const pvpPanelEl = document.getElementById("pvpPanel");
  const pvpCodePillEl = document.getElementById("pvpCodePill");
  const pvpMetaEl = document.getElementById("pvpMeta");
  const pvpListEl = document.getElementById("pvpList");

  const overlayEl = document.getElementById("overlay");
  const overlayTitleEl = document.getElementById("overlayTitle");
  const overlayTextEl = document.getElementById("overlayText");
  const overlayPillEl = document.getElementById("overlayPill");
  const overlayBtnEl = document.getElementById("overlayBtn");
  const overlayHomeBtnEl = document.getElementById("overlayHomeBtn");
  const submitHintEl = document.getElementById("submitHint");

  const authBarLoggedOutEl = document.getElementById("authBarLoggedOut");
  const authBarLoggedInEl = document.getElementById("authBarLoggedIn");
  const openLoginBtn = document.getElementById("openLogin");
  const openRegisterBtn = document.getElementById("openRegister");

  const authModalEl = document.getElementById("authModal");
  const authModalTitleEl = document.getElementById("authModalTitle");
  const mEmailEl = document.getElementById("mEmail");
  const mPassEl = document.getElementById("mPass");
  const mNickEl = document.getElementById("mNick");
  const mTogglePassBtn = document.getElementById("mTogglePass");
  const mSubmitBtn = document.getElementById("mSubmit");
  const mGoogleBtn = document.getElementById("mGoogle");
  const mCloseBtn = document.getElementById("mClose");
  const mHintEl = document.getElementById("mHint");

  let authMode = "login"; // login | register

  let auth = null;
  let db = null;
  let currentUser = null;
  let firebaseReady = false;

  // Game state
  let difficultyKey = "medium";
  let totalPairs = DIFFICULTIES[difficultyKey].pairs;
  let previewSec = DIFFICULTIES[difficultyKey].previewSec;
  let hardMistakes = 0;

  let cards = [];
  let opened = [];
  let matched = new Set();
  let locked = true;
  let moves = 0;
  let startMs = 0;
  let timerId = null;
  let previewTimeoutId = null;
  let phase = "idle"; // idle | preview | play | win
  let lastWin = null;
  let submitting = false;

  // Multiplayer room state
  let currentRoomCode = null;
  let currentRoom = null;
  let currentRoomPlayers = [];
  let roomUnsub = null;
  let playersUnsub = null;
  let startCountdownId = null;
  let pvpStartAtMs = 0;
  const PVP_PREVIEW_MS = 500;
  const SUPERHARD_SHUFFLE_ERRORS = 4;
  let lastMatchId = null;

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function sanitizeNick(raw) {
    const trimmed = String(raw || "").trim();
    const noAngles = trimmed.replace(/[<>]/g, "");
    const noControls = noAngles.replace(/[\u0000-\u001f\u007f]/g, "");
    return noControls.slice(0, 16);
  }

  function setHomeHint(text) {
    homeHintEl.textContent = text || "";
  }

  function setLobbyHint(text) {
    lobbyHintEl.textContent = text || "";
  }

  function setModalHint(text) {
    mHintEl.textContent = text || "";
  }

  function setSubmitHintVisible(visible) {
    submitHintEl.classList.toggle("is-hidden", !visible);
    if (!visible) submitHintEl.textContent = "";
  }

  function showOverlay({ title, text, pill, submitHint }) {
    overlayTitleEl.textContent = title;
    overlayTextEl.textContent = text;
    overlayPillEl.textContent = pill;
    setSubmitHintVisible(!!submitHint);
    if (submitHint) submitHintEl.textContent = submitHint;
    overlayEl.classList.remove("is-hidden");
  }

  function hideOverlay() {
    overlayEl.classList.add("is-hidden");
  }

  function showAuthBars() {
    const loggedIn = !!currentUser;
    authBarLoggedOutEl.classList.toggle("is-hidden", loggedIn);
    authBarLoggedInEl.classList.toggle("is-hidden", !loggedIn);
  }

  function openAuthModal(mode) {
    authMode = mode;
    authModalTitleEl.textContent = mode === "register" ? "Регистрация" : "Логин";
    mNickEl.classList.toggle("is-hidden", mode !== "register");
    mTogglePassBtn.classList.toggle("is-hidden", mode !== "register");
    mSubmitBtn.textContent = mode === "register" ? "Создать аккаунт" : "Войти";
    setModalHint("");
    authModalEl.classList.remove("is-hidden");
    mPassEl.type = "password";
    mTogglePassBtn.textContent = "Показать пароль";
    if (mode === "register") mNickEl.focus();
    else mEmailEl.focus();
  }

  function closeAuthModal() {
    authModalEl.classList.add("is-hidden");
    setModalHint("");
  }

  function explainAuthError(e) {
    const code = String(e?.code || "");
    switch (code) {
      case "auth/configuration-not-found":
        return "Firebase Auth не настроен для проекта. Открой Authentication в консоли и включи Email/Password.";
      case "auth/operation-not-allowed":
        return 'Включи Authentication -> Sign-in method -> "Email/Password".';
      case "auth/invalid-email":
        return "Неверный формат email.";
      case "auth/email-already-in-use":
        return "Этот email уже зарегистрирован. Попробуй Логин.";
      case "auth/weak-password":
        return "Слабый пароль. Минимум 6 символов.";
      case "auth/unauthorized-domain":
        return "Домен не разрешен. Добавь домен в Authentication -> Settings -> Authorized domains.";
      case "auth/network-request-failed":
        return "Сетевая ошибка. Проверь интернет/блокировки.";
      default:
        return code ? `Firebase Auth: ${code}` : "Firebase Auth: неизвестная ошибка";
    }
  }

  function togglePasswordVisibility() {
    if (mPassEl.type === "password") {
      mPassEl.type = "text";
      mTogglePassBtn.textContent = "Скрыть пароль";
    } else {
      mPassEl.type = "password";
      mTogglePassBtn.textContent = "Показать пароль";
    }
  }

  async function signInWithGoogle() {
    if (!auth) return;
    if (!window.firebase) return;

    setModalHint("Google вход...");
    try {
      const provider = new window.firebase.auth.GoogleAuthProvider();
      const cred = await auth.signInWithPopup(provider);
      const user = cred.user;

      // If user is using "Регистрация" flow and typed a nick, apply it.
      if (authMode === "register") {
        const nick = sanitizeNick(mNickEl.value || "");
        if (nick.length >= 2 && user && user.displayName !== nick) {
          try {
            await user.updateProfile({ displayName: nick });
          } catch (_) {
            // ignore
          }
        }
      }

      closeAuthModal();

      // If Google displayName is missing/too short, guide user to profile.
      const finalNick = sanitizeNick((auth.currentUser && auth.currentUser.displayName) || "");
      if (finalNick.length < 2) {
        setHomeHint("Вход через Google выполнен. Задай ник в профиле, чтобы попадать в лидерборд/PVP.");
      } else {
        setHomeHint("");
      }
    } catch (e) {
      setModalHint(explainAuthError(e));
    }
  }

  async function submitAuthModal() {
    if (!auth) return;
    const email = String(mEmailEl.value || "").trim();
    const password = String(mPassEl.value || "");
    const nick = sanitizeNick(mNickEl.value || "");

    if (!email) return setModalHint("Введи email.");
    if (!password) return setModalHint("Введи пароль.");
    if (password.length < 6) return setModalHint("Пароль должен быть минимум 6 символов.");

    if (authMode === "register") {
      if (nick.length < 2) return setModalHint("Введи ник (2–16).");
      setModalHint("Регистрация...");
      try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        try {
          await cred.user.updateProfile({ displayName: nick });
        } catch (_) {
          // ignore
        }
        closeAuthModal();
      } catch (e) {
        setModalHint(explainAuthError(e));
      }
      return;
    }

    setModalHint("Вход...");
    try {
      await auth.signInWithEmailAndPassword(email, password);
      closeAuthModal();
    } catch (e) {
      setModalHint(explainAuthError(e));
    }
  }

  function firebaseIsConfigured() {
    const cfg = window.FIREBASE_CONFIG;
    return !!(cfg && typeof cfg === "object" && cfg.projectId);
  }

  function setLbMeta(text) {
    lbMetaEl.textContent = text;
  }

  function setPvpMeta(text) {
    pvpMetaEl.textContent = text || "";
  }

  function initFirebase() {
    if (!window.firebase) {
      firebaseReady = false;
      setLbMeta("Firebase SDK: не загрузился");
      return;
    }
    if (!firebaseIsConfigured()) {
      firebaseReady = false;
      setLbMeta("Firebase: не настроен");
      return;
    }

    try {
      if (!window.firebase.apps || window.firebase.apps.length === 0) {
        window.firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      auth = window.firebase.auth();
      db = window.firebase.firestore();
      firebaseReady = true;
      setLbMeta("Firestore: подключен");

      auth.onAuthStateChanged((u) => {
        currentUser = u || null;
        showAuthBars();
        // Refresh leaderboard for consistent rendering.
        loadLeaderboardFor(difficultyKey, { target: "side" });
      });
    } catch (e) {
      firebaseReady = false;
      setLbMeta("Firestore: ошибка инициализации");
    }
  }

  function renderLeaderboardList(listEl, entries) {
    listEl.innerHTML = "";
    if (!entries.length) {
      const li = document.createElement("li");
      li.className = "leaderboard__item";
      li.innerHTML = `<span class="leaderboard__name">Пока пусто</span><span class="leaderboard__score">--:--</span>`;
      listEl.appendChild(li);
      return;
    }

    for (const entry of entries) {
      const li = document.createElement("li");
      li.className = "leaderboard__item";
      const name = escapeHtml(entry.name || "Player");
      const score = `${formatTime(entry.timeMs)} · ${entry.moves} ход`;
      li.innerHTML = `<span class="leaderboard__name">${name}</span><span class="leaderboard__score">${score}</span>`;
      listEl.appendChild(li);
    }
  }

  function difficultyExists(key) {
    return !!DIFFICULTIES[key];
  }

  function leaderboardCollectionForDifficulty(diffKey) {
    const key = difficultyExists(diffKey) ? diffKey : "medium";
    return db.collection("leaderboards").doc(key).collection("entries");
  }

  async function loadLeaderboardFor(diffKey, { target }) {
    const safeKey = difficultyExists(diffKey) ? diffKey : "medium";
    const listEl = target === "home" ? leaderListEl : lbListEl;

    const setMeta = (text) => {
      if (target === "home") leaderMetaEl.textContent = text;
      else setLbMeta(text);
    };

    if (target === "home") {
      leaderTitleEl.textContent = `Лидерборд · ${DIFFICULTIES[safeKey].label}`;
    }

    if (!firebaseReady || !db) {
      listEl.innerHTML = "";
      const li = document.createElement("li");
      li.className = "leaderboard__item";
      const msg = firebaseIsConfigured() ? "Лидерборд недоступен" : "Заполни firebase-config.js";
      li.innerHTML = `<span class="leaderboard__name">${msg}</span><span class="leaderboard__score">--:--</span>`;
      listEl.appendChild(li);
      setMeta(msg);
      return;
    }

    setMeta("Firestore: загрузка...");
    try {
      const snap = await leaderboardCollectionForDifficulty(safeKey).orderBy("timeMs", "asc").limit(10).get();
      const entries = [];
      snap.forEach((doc) => {
        const d = doc.data() || {};
        if (typeof d.timeMs !== "number" || typeof d.moves !== "number") return;
        entries.push({ name: String(d.name || "Player"), timeMs: d.timeMs, moves: d.moves });
      });
      setMeta(`Топ ${entries.length}`);
      renderLeaderboardList(listEl, entries);
    } catch (e) {
      const code = String(e?.code || "");
      setMeta(code ? `Firestore: ${code}` : "Firestore: не удалось загрузить");
      renderLeaderboardList(listEl, []);
    }
  }

  function showStack(targetEl) {
    const stacks = [
      homeMainEl,
      singleMenuEl,
      multiMenuEl,
      createMenuEl,
      joinMenuEl,
      lobbyMenuEl,
      settingsMenuEl,
      leaderMenuEl,
      leaderViewEl,
    ];
    for (const el of stacks) el.classList.add("is-hidden");
    targetEl.classList.remove("is-hidden");
    setHomeHint("");
  }

  function showHome() {
    hideOverlay();
    closeAuthModal();
    leaveRoomLocal({ keepHint: false });
    homeScreenEl.classList.remove("is-hidden");
    gameScreenEl.classList.add("is-hidden");
    statsBarEl.classList.add("is-hidden");
    toHomeBtn.classList.add("is-hidden");
    restartBtn.classList.add("is-hidden");
    showStack(homeMainEl);
    roomCodeWrapEl.classList.add("is-hidden");
  }

  function showGameUI() {
    homeScreenEl.classList.add("is-hidden");
    gameScreenEl.classList.remove("is-hidden");
    statsBarEl.classList.remove("is-hidden");
    toHomeBtn.classList.remove("is-hidden");
    restartBtn.classList.remove("is-hidden");
  }

  function showGlobalLeaderboardUI() {
    globalLbPanelEl.classList.remove("is-hidden");
    pvpPanelEl.classList.add("is-hidden");
    restartBtn.classList.remove("is-hidden");
  }

  function showPvpLeaderboardUI(roomCode) {
    globalLbPanelEl.classList.add("is-hidden");
    pvpPanelEl.classList.remove("is-hidden");
    pvpCodePillEl.textContent = `Код: ${roomCode}`;
    // Prevent local restarts in PVP.
    restartBtn.classList.add("is-hidden");
  }

  function showLobbyOnly() {
    hideOverlay();
    closeAuthModal();
    homeScreenEl.classList.remove("is-hidden");
    gameScreenEl.classList.add("is-hidden");
    statsBarEl.classList.add("is-hidden");
    toHomeBtn.classList.add("is-hidden");
    restartBtn.classList.add("is-hidden");
    showStack(lobbyMenuEl);
  }

  function setBoardCols(cols) {
    boardEl.style.setProperty("--board-cols", String(cols));
  }

  function isHardMode() {
    return difficultyKey === "superhard";
  }

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function seededRng(seed) {
    // Mulberry32
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleWithRng(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function setStats() {
    movesEl.textContent = String(moves);
    pairsEl.textContent = `${matched.size}/${totalPairs}`;
  }

  function setTime(ms) {
    timeEl.textContent = formatTime(ms);
  }

  function stopTimer() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  }

  function startTimer() {
    startMs = performance.now();
    stopTimer();
    timerId = window.setInterval(() => {
      setTime(performance.now() - startMs);
    }, 200);
  }

  function clearPreviewTimeout() {
    if (previewTimeoutId) window.clearTimeout(previewTimeoutId);
    previewTimeoutId = null;
  }

  function buildDeck(pairsCount, seed = null) {
    const spriteCount = Math.min(FRONT_SPRITES_TOTAL, pairsCount);
    const deck = [];
    let keyCounter = 1;

    for (let pairId = 1; pairId <= pairsCount; pairId++) {
      const spriteIndex = ((pairId - 1) % spriteCount) + 1;
      const img = `sprites/frontSideCard${spriteIndex}.png`;
      deck.push({ key: String(keyCounter++), pairId, img, flipped: false, matched: false });
      deck.push({ key: String(keyCounter++), pairId, img, flipped: false, matched: false });
    }

    if (seed === null) shuffleInPlace(deck);
    else shuffleWithRng(deck, seededRng(seed));
    return deck;
  }

  function cardHtml(card) {
    return `
      <div class="card ${card.flipped ? "is-flipped" : ""} ${card.matched ? "is-matched" : ""}" data-key="${card.key}">
        <button type="button" aria-label="Карточка">
          <div class="card-inner">
            <div class="card-face card-back"></div>
            <div class="card-face card-front" style="background-image:url('${card.img}')"></div>
          </div>
        </button>
      </div>
    `;
  }

  function renderBoard() {
    boardEl.innerHTML = cards.map(cardHtml).join("");
  }

  function getCardElByKey(key) {
    return boardEl.querySelector(`.card[data-key="${key}"]`);
  }

  function setCardFrontImage(key, img) {
    const el = getCardElByKey(key);
    if (!el) return;
    const front = el.querySelector(".card-front");
    if (!front) return;
    front.style.backgroundImage = `url('${img}')`;
  }

  function setCardFlipped(key, flipped) {
    const card = cards.find((c) => c.key === key);
    if (!card) return;
    card.flipped = flipped;
    const el = getCardElByKey(key);
    if (!el) return;
    el.classList.toggle("is-flipped", flipped);
  }

  function setCardMatched(key, isMatched) {
    const card = cards.find((c) => c.key === key);
    if (!card) return;
    card.matched = isMatched;
    const el = getCardElByKey(key);
    if (!el) return;
    el.classList.toggle("is-matched", isMatched);
  }

  function revealAll() {
    cards.forEach((c) => setCardFlipped(c.key, true));
  }

  function hideUnmatched() {
    cards.forEach((c) => {
      if (!c.matched) setCardFlipped(c.key, false);
    });
  }

  function shuffleClosedCardsHard() {
    const closed = cards.filter((c) => !c.matched && !c.flipped);
    if (closed.length < 2) return;

    locked = true;
    boardEl.classList.add("is-shuffling");
    for (const c of closed) {
      const el = getCardElByKey(c.key);
      if (el) el.classList.add("is-shuffling");
    }

    window.setTimeout(() => {
      const payloads = closed.map((c) => ({ pairId: c.pairId, img: c.img }));
      shuffleInPlace(payloads);

      for (let i = 0; i < closed.length; i++) {
        closed[i].pairId = payloads[i].pairId;
        closed[i].img = payloads[i].img;
        setCardFrontImage(closed[i].key, closed[i].img);
      }

      window.setTimeout(() => {
        boardEl.classList.remove("is-shuffling");
        for (const c of closed) {
          const el = getCardElByKey(c.key);
          if (el) el.classList.remove("is-shuffling");
        }
        locked = false;
      }, 260);
    }, 260);
  }

  function onWrongAttempt() {
    if (!isHardMode()) return;
    hardMistakes += 1;
    if (hardMistakes >= SUPERHARD_SHUFFLE_ERRORS) {
      hardMistakes = 0;
      shuffleClosedCardsHard();
    }
  }

  function isBetterScore(next, prev) {
    if (!prev) return true;
    if (typeof prev.timeMs !== "number") return true;
    if (next.timeMs < prev.timeMs) return true;
    if (next.timeMs > prev.timeMs) return false;
    if (typeof prev.moves !== "number") return true;
    return next.moves < prev.moves;
  }

  function explainFirestoreError(e) {
    const code = String(e?.code || "");
    if (!code) return "Firestore: неизвестная ошибка";
    if (code === "permission-denied") return "Firestore: доступ запрещен (проверь Rules).";
    return `Firestore: ${code}`;
  }

  async function autoSubmitWinScore() {
    if (!firebaseReady || !db) return;
    if (!currentUser) return;
    if (!lastWin) return;
    if (submitting) return;

    const nickname = sanitizeNick(currentUser.displayName || "");
    if (nickname.length < 2) {
      submitHintEl.textContent = "Нужно задать ник в профиле, чтобы попасть в лидерборд.";
      return;
    }

    submitting = true;
    try {
      const docRef = leaderboardCollectionForDifficulty(difficultyKey).doc(currentUser.uid);
      const snap = await docRef.get();
      const next = { timeMs: lastWin.timeMs, moves: lastWin.moves };
      const updatedAt = window.firebase.firestore.FieldValue.serverTimestamp();
      const createdAt = window.firebase.firestore.FieldValue.serverTimestamp();

      if (!snap.exists) {
        await docRef.set({ name: nickname, timeMs: next.timeMs, moves: next.moves, createdAt, updatedAt });
        submitHintEl.textContent = "Рекорд сохранен в лидерборд.";
      } else {
        const prev = snap.data() || null;
        if (isBetterScore(next, prev)) {
          await docRef.update({ name: nickname, timeMs: next.timeMs, moves: next.moves, updatedAt });
          submitHintEl.textContent = "Новый рекорд: лидерборд обновлен.";
        } else {
          if (typeof prev?.name !== "string" || prev.name !== nickname) {
            await docRef.update({ name: nickname, updatedAt });
          }
          submitHintEl.textContent = "Рекорд не улучшен. Лидерборд без изменений.";
        }
      }

      await loadLeaderboardFor(difficultyKey, { target: "side" });
    } catch (e) {
      submitHintEl.textContent = explainFirestoreError(e);
    } finally {
      submitting = false;
    }
  }

  async function submitPvpResult() {
    if (!firebaseReady || !db) return;
    if (!currentUser || !currentRoomCode || !lastWin) return;
    if (!pvpStartAtMs) return;

    try {
      const ref = db
        .collection("rooms")
        .doc(currentRoomCode)
        .collection("players")
        .doc(currentUser.uid);
      await ref.set(
        {
          moves: lastWin.moves,
          timeMs: lastWin.timeMs,
          finishedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (_) {
      // ignore
    }
  }

  function startPreview() {
    phase = "preview";
    locked = true;
    opened = [];
    revealAll();

    clearPreviewTimeout();
    previewTimeoutId = window.setTimeout(() => {
      hideUnmatched();
      phase = "play";
      locked = false;
      startTimer();
      previewTimeoutId = null;
    }, previewSec * 1000);
  }

  function resetGame(reshuffle = true) {
    stopTimer();
    clearPreviewTimeout();
    opened = [];
    matched = new Set();
    moves = 0;
    hardMistakes = 0;
    locked = true;
    phase = "idle";
    lastWin = null;
    setSubmitHintVisible(false);
    setTime(0);
    setStats();

    if (reshuffle) cards = buildDeck(totalPairs);
    cards.forEach((c) => {
      c.flipped = false;
      c.matched = false;
    });

    renderBoard();
    startPreview();
  }

  function finishWin() {
    phase = "win";
    locked = true;
    stopTimer();
    const elapsed = performance.now() - startMs;
    setTime(elapsed);
    lastWin = { timeMs: Math.floor(elapsed), moves };

    const isPvp = !pvpPanelEl.classList.contains("is-hidden");
    const nick = sanitizeNick(currentUser?.displayName || "");
    const canSaveGlobal = firebaseReady && !!currentUser && nick.length >= 2 && !isPvp;
    const hint = isPvp
      ? "Матч завершен. Результат виден справа."
      : !firebaseReady
        ? "Лидерборд выключен (Firebase не настроен)."
        : !currentUser
          ? "Войди, чтобы рекорд сохранялся в лидерборд."
          : nick.length < 2
            ? "Задай ник в профиле, чтобы попадать в лидерборд."
            : "Сохраняю рекорд...";

    overlayBtnEl.textContent = isPvp ? "В лобби" : "Сыграть еще";
    showOverlay({
      title: "Победа!",
      text: `Время: ${formatTime(elapsed)}. Ходы: ${moves}.`,
      pill: DIFFICULTIES[difficultyKey].label,
      submitHint: hint,
    });

    if (canSaveGlobal) autoSubmitWinScore();
    if (isPvp) submitPvpResult();
  }

  function onCardClick(cardKey) {
    if (locked || phase !== "play") return;
    const card = cards.find((c) => c.key === cardKey);
    if (!card || card.matched) return;
    if (opened.includes(cardKey)) return;
    if (opened.length >= 2) return;

    setCardFlipped(cardKey, true);
    opened.push(cardKey);

    if (opened.length !== 2) return;

    moves += 1;
    setStats();
    // If in PVP match, update moves live.
    if (!pvpPanelEl.classList.contains("is-hidden") && firebaseReady && db && currentUser && currentRoomCode) {
      db.collection("rooms")
        .doc(currentRoomCode)
        .collection("players")
        .doc(currentUser.uid)
        .set(
          { moves, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        )
        .catch(() => {});
    }

    const [k1, k2] = opened;
    const c1 = cards.find((c) => c.key === k1);
    const c2 = cards.find((c) => c.key === k2);
    if (!c1 || !c2) return;

    locked = true;
    const isMatch = c1.pairId === c2.pairId;

    window.setTimeout(() => {
      if (isMatch) {
        setCardMatched(k1, true);
        setCardMatched(k2, true);
        matched.add(c1.pairId);
        setStats();
      } else {
        setCardFlipped(k1, false);
        setCardFlipped(k2, false);
        onWrongAttempt();
      }

      opened = [];
      locked = false;

      if (matched.size === totalPairs) finishWin();
    }, isMatch ? 320 : 650);
  }

  function startSingle(diffKey) {
    const cfg = DIFFICULTIES[diffKey] || DIFFICULTIES.medium;
    difficultyKey = diffKey;
    totalPairs = cfg.pairs;
    previewSec = cfg.previewSec;
    setBoardCols(cfg.cols);
    showGameUI();
    showGlobalLeaderboardUI();
    loadLeaderboardFor(difficultyKey, { target: "side" });
    resetGame(true);
  }

  function normalizeRoomCode(raw) {
    return String(raw || "").replace(/\D/g, "").slice(0, 5);
  }

  function randomRoomCode() {
    return String(10000 + Math.floor(Math.random() * 90000));
  }

  async function createRoom() {
    if (!firebaseReady || !db) return setHomeHint("Firebase не готов.");
    if (!currentUser) return setHomeHint("Нужно войти, чтобы создавать комнаты.");
    const nick = sanitizeNick(currentUser.displayName || "");
    if (nick.length < 2) return setHomeHint("Сначала задай ник в профиле.");

    const maxPlayers = Number(roomMaxPlayersEl.value);
    if (!Number.isFinite(maxPlayers) || maxPlayers < 2 || maxPlayers > 20) {
      return setHomeHint("Количество игроков должно быть от 2 до 20.");
    }

    const diff = String(roomDifficultyEl.value || "medium");
    const difficulty = DIFFICULTIES[diff] ? diff : "medium";

    setHomeHint("Создаю комнату...");
    roomCodeWrapEl.classList.add("is-hidden");

    const rooms = db.collection("rooms");
    let code = "";
    const seed = Math.floor(Math.random() * 2 ** 31);

    for (let attempt = 0; attempt < 8; attempt++) {
      code = randomRoomCode();
      try {
        const ref = rooms.doc(code);
        const snap = await ref.get();
        if (snap.exists) continue;
        await ref.set({
          code,
          difficulty,
          maxPlayers,
          hostUid: currentUser.uid,
          status: "lobby",
          seed,
          matchId: 0,
          startAt: null,
          createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        });
        // Host player doc
        await ref.collection("players").doc(currentUser.uid).set({
          uid: currentUser.uid,
          nick,
          moves: 0,
          timeMs: null,
          finishedAt: null,
          joinedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        });

        enterLobby(code);
        return;
      } catch (e) {
        setHomeHint(explainFirestoreError(e));
        return;
      }
    }

    setHomeHint("Не удалось сгенерировать код. Попробуй еще раз.");
  }

  async function joinRoom() {
    if (!firebaseReady || !db) return setHomeHint("Firebase не готов.");
    if (!currentUser) return setHomeHint("Нужно войти, чтобы подключаться к комнатам.");
    const nick = sanitizeNick(currentUser.displayName || "");
    if (nick.length < 2) return setHomeHint("Сначала задай ник в профиле.");

    const code = normalizeRoomCode(joinCodeEl.value);
    joinCodeEl.value = code;
    if (code.length !== 5) return setHomeHint("Нужен 5‑значный код комнаты.");

    setHomeHint("Подключаюсь...");
    try {
      const ref = db.collection("rooms").doc(code);
      const snap = await ref.get();
      if (!snap.exists) return setHomeHint("Комната не найдена.");

      const room = snap.data() || {};
      if (String(room.status || "") !== "lobby" && String(room.status || "") !== "starting") {
        return setHomeHint("Комната уже не в лобби.");
      }

      await ref.collection("players").doc(currentUser.uid).set(
        {
          uid: currentUser.uid,
          nick,
          moves: 0,
          timeMs: null,
          finishedAt: null,
          joinedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      enterLobby(code);
    } catch (e) {
      setHomeHint(explainFirestoreError(e));
    }
  }

  function clearRoomSubscriptions() {
    if (roomUnsub) roomUnsub();
    if (playersUnsub) playersUnsub();
    roomUnsub = null;
    playersUnsub = null;
    if (startCountdownId) window.clearInterval(startCountdownId);
    startCountdownId = null;
  }

  function leaveRoomLocal({ keepHint }) {
    clearRoomSubscriptions();
    currentRoomCode = null;
    currentRoom = null;
    currentRoomPlayers = [];
    pvpStartAtMs = 0;
    lastMatchId = null;
    if (!keepHint) setLobbyHint("");
  }

  async function leaveLobby() {
    if (!firebaseReady || !db || !currentRoomCode || !currentUser) {
      leaveRoomLocal({ keepHint: false });
      showStack(homeMainEl);
      return;
    }

    setLobbyHint("Выход...");
    try {
      const ref = db.collection("rooms").doc(currentRoomCode);
      await ref.collection("players").doc(currentUser.uid).delete();

      // If host leaves while in lobby, close the room.
      if (currentRoom && currentRoom.hostUid === currentUser.uid && currentRoom.status === "lobby") {
        await ref.update({
          status: "closed",
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (_) {
      // ignore
    } finally {
      leaveRoomLocal({ keepHint: false });
      showStack(homeMainEl);
    }
  }

  function renderLobby() {
    lobbyCodeEl.textContent = currentRoomCode || "-----";
    const maxPlayers = Number(currentRoom?.maxPlayers || 0);
    lobbyMaxEl.textContent = maxPlayers ? String(maxPlayers) : "?";
    lobbyCountEl.textContent = String(currentRoomPlayers.length);
    lobbyMetaEl.textContent = currentRoom
      ? `${DIFFICULTIES[currentRoom.difficulty]?.label || currentRoom.difficulty} · статус: ${currentRoom.status}`
      : "Ожидание...";

    if (currentRoom && DIFFICULTIES[currentRoom.difficulty]) {
      lobbyDifficultyEl.value = currentRoom.difficulty;
    }

    const isHost = !!currentUser && !!currentRoom && currentRoom.hostUid === currentUser.uid;
    lobbyDifficultyEl.disabled = !isHost || currentRoom?.status !== "lobby";
    saveLobbyDifficultyBtn.classList.toggle("is-hidden", !isHost || currentRoom?.status !== "lobby");

    lobbyListEl.innerHTML = "";
    for (const p of currentRoomPlayers) {
      const li = document.createElement("li");
      li.className = "lobby__item";
      const nick = escapeHtml(p.nick || "Player");
      const tag = p.uid === currentRoom?.hostUid ? "host" : "";
      li.innerHTML = `<span class="lobby__nick">${nick}</span><span class="lobby__tag">${tag}</span>`;
      lobbyListEl.appendChild(li);
    }

    const canStart =
      !!currentUser &&
      !!currentRoom &&
      currentRoom.hostUid === currentUser.uid &&
      currentRoomPlayers.length >= 2 &&
      currentRoom.status === "lobby";
    startPvpBtn.classList.toggle("is-hidden", !canStart);
  }

  function renderPvpList(players) {
    pvpListEl.innerHTML = "";
    for (const p of players) {
      const li = document.createElement("li");
      li.className = "leaderboard__item";
      const nick = escapeHtml(p.nick || "Player");
      const movesText = typeof p.moves === "number" ? `${p.moves} ход` : "-";
      const timeText = typeof p.timeMs === "number" ? formatTime(p.timeMs) : "--:--";
      li.innerHTML = `<span class="leaderboard__name">${nick}</span><span class="leaderboard__score">${movesText} · ${timeText}</span>`;
      pvpListEl.appendChild(li);
    }
  }

  function startCountdown(startAtMs) {
    if (startCountdownId) window.clearInterval(startCountdownId);
    startCountdownId = window.setInterval(() => {
      const leftMs = startAtMs + 5000 - Date.now();
      const left = Math.max(0, Math.ceil(leftMs / 1000));
      setLobbyHint(left > 0 ? `Старт через ${left}...` : "Старт!");
      setPvpMeta(left > 0 ? `Старт через ${left}...` : "Игра идет");
      if (left <= 0) {
        window.clearInterval(startCountdownId);
        startCountdownId = null;
      }
    }, 200);
  }

  function enterLobby(code) {
    currentRoomCode = code;
    setLobbyHint("");
    roomCodeWrapEl.classList.add("is-hidden");
    showStack(lobbyMenuEl);

    clearRoomSubscriptions();
    const ref = db.collection("rooms").doc(code);

    roomUnsub = ref.onSnapshot(
      (snap) => {
        if (!snap.exists) {
          setLobbyHint("Комната удалена.");
          leaveRoomLocal({ keepHint: true });
          showStack(homeMainEl);
          return;
        }
        currentRoom = snap.data() || null;
        renderLobby();

        // When matchId changes, each client resets their own player state for the new match.
        const matchId = typeof currentRoom?.matchId === "number" ? currentRoom.matchId : null;
        if (matchId !== null && matchId !== lastMatchId) {
          lastMatchId = matchId;
          if (currentUser) resetMyPlayerForMatch();
        }

        if (currentRoom?.status === "starting" && currentRoom.startAt) {
          const ms = currentRoom.startAt.toMillis ? currentRoom.startAt.toMillis() : Date.now();
          pvpStartAtMs = ms;
          startCountdown(ms);
          // Start game locally once countdown elapsed.
          const leftMs = ms + 5000 - Date.now();
          if (leftMs <= 0) {
            startPvpGameFromRoom();
          } else {
            window.setTimeout(() => startPvpGameFromRoom(), leftMs + 50);
          }
        }
      },
      (err) => {
        setLobbyHint(explainFirestoreError(err));
      }
    );

    playersUnsub = ref.collection("players").onSnapshot(
      (snap) => {
        const list = [];
        snap.forEach((d) => list.push(d.data() || {}));

        // Keep stable ordering without relying on Firestore orderBy (avoids index/rules edge cases).
        list.sort((a, b) => {
          const aj = a.joinedAt?.toMillis ? a.joinedAt.toMillis() : 0;
          const bj = b.joinedAt?.toMillis ? b.joinedAt.toMillis() : 0;
          if (aj !== bj) return aj - bj;
          const an = String(a.nick || "");
          const bn = String(b.nick || "");
          return an.localeCompare(bn);
        });

        currentRoomPlayers = list;
        renderLobby();

        // Update PVP leaderboard if in match UI.
        if (!pvpPanelEl.classList.contains("is-hidden")) {
          const sorted = [...list].sort((a, b) => {
            const at = typeof a.timeMs === "number" ? a.timeMs : Number.POSITIVE_INFINITY;
            const bt = typeof b.timeMs === "number" ? b.timeMs : Number.POSITIVE_INFINITY;
            if (at !== bt) return at - bt;
            const am = typeof a.moves === "number" ? a.moves : Number.POSITIVE_INFINITY;
            const bm = typeof b.moves === "number" ? b.moves : Number.POSITIVE_INFINITY;
            return am - bm;
          });
          renderPvpList(sorted);
        }
      },
      (err) => {
        setLobbyHint(explainFirestoreError(err));
      }
    );
  }

  async function resetMyPlayerForMatch() {
    if (!firebaseReady || !db || !currentUser || !currentRoomCode) return;
    try {
      await db
        .collection("rooms")
        .doc(currentRoomCode)
        .collection("players")
        .doc(currentUser.uid)
        .set(
          {
            moves: 0,
            timeMs: null,
            finishedAt: null,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    } catch (_) {
      // ignore
    }
  }

  async function applyLobbyDifficulty() {
    if (!firebaseReady || !db || !currentUser || !currentRoomCode || !currentRoom) return;
    if (currentRoom.hostUid !== currentUser.uid) return;
    if (currentRoom.status !== "lobby") return;

    const diff = String(lobbyDifficultyEl.value || "medium");
    const nextDiff = DIFFICULTIES[diff] ? diff : "medium";
    setLobbyHint("Применяю сложность...");
    try {
      await db.collection("rooms").doc(currentRoomCode).update({
        difficulty: nextDiff,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
      setLobbyHint("");
    } catch (e) {
      setLobbyHint(explainFirestoreError(e));
    }
  }

  async function startPvp() {
    if (!firebaseReady || !db) return setLobbyHint("Firebase не готов.");
    if (!currentUser || !currentRoomCode || !currentRoom) return;
    if (currentRoom.hostUid !== currentUser.uid) return;
    if (currentRoomPlayers.length < 2) return setLobbyHint("Нужно минимум 2 игрока.");
    if (currentRoom.status !== "lobby") return;

    setLobbyHint("Запускаю...");
    try {
      const diff = String(lobbyDifficultyEl.value || currentRoom.difficulty || "medium");
      const nextDiff = DIFFICULTIES[diff] ? diff : "medium";
      const newSeed = Math.floor(Math.random() * 2 ** 31);
      const newMatchId = (typeof currentRoom.matchId === "number" ? currentRoom.matchId : 0) + 1;
      await db.collection("rooms").doc(currentRoomCode).update({
        status: "starting",
        difficulty: nextDiff,
        seed: newSeed,
        matchId: newMatchId,
        startAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      setLobbyHint(explainFirestoreError(e));
    }
  }

  function startPvpGameFromRoom() {
    if (!currentRoomCode || !currentRoom) return;
    // Avoid re-entering if already in game.
    if (!gameScreenEl.classList.contains("is-hidden") && !pvpPanelEl.classList.contains("is-hidden")) return;

    const diffKey = DIFFICULTIES[currentRoom.difficulty] ? currentRoom.difficulty : "medium";
    const cfg = DIFFICULTIES[diffKey];
    difficultyKey = diffKey;
    totalPairs = cfg.pairs;
    previewSec = 0;
    setBoardCols(cfg.cols);

    showGameUI();
    showPvpLeaderboardUI(currentRoomCode);
    // Short synchronized preview for PVP.
    stopTimer();
    clearPreviewTimeout();
    opened = [];
    matched = new Set();
    moves = 0;
    hardMistakes = 0;
    locked = true;
    phase = "preview";
    lastWin = null;
    setSubmitHintVisible(false);
    setTime(0);
    setStats();

    const seed = Number(currentRoom.seed || 0);
    cards = buildDeck(totalPairs, seed);
    renderBoard();
    revealAll();

    window.setTimeout(() => {
      hideUnmatched();
      phase = "play";
      locked = false;
      startTimer();
      setPvpMeta("Игра идет");

      // Host marks room as playing (optional, used to re-enable start button later).
      if (currentUser && currentRoom && currentRoom.hostUid === currentUser.uid) {
        db.collection("rooms")
          .doc(currentRoomCode)
          .update({
            status: "playing",
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          })
          .catch(() => {});
      }
    }, PVP_PREVIEW_MS);
  }

  function wireEvents() {
    boardEl.addEventListener("click", (e) => {
      const cardEl = e.target.closest(".card");
      if (!cardEl) return;
      onCardClick(cardEl.dataset.key);
    });

    goSingleBtn.addEventListener("click", () => showStack(singleMenuEl));
    goMultiBtn.addEventListener("click", () => {
      if (!currentUser) {
        setHomeHint("В мультиплеер можно только после входа.");
        openAuthModal("login");
        return;
      }
      showStack(multiMenuEl);
    });
    goSettingsBtn.addEventListener("click", () => showStack(settingsMenuEl));
    goLeaderboardBtn.addEventListener("click", () => {
      showStack(leaderMenuEl);
      // Default preview: medium.
      loadLeaderboardFor("medium", { target: "home" });
    });

    backFromSingleBtn.addEventListener("click", () => showStack(homeMainEl));
    backFromMultiBtn.addEventListener("click", () => showStack(homeMainEl));
    backFromCreateBtn.addEventListener("click", () => showStack(multiMenuEl));
    backFromJoinBtn.addEventListener("click", () => showStack(multiMenuEl));
    backFromSettingsBtn.addEventListener("click", () => showStack(homeMainEl));
    backFromLeaderBtn.addEventListener("click", () => showStack(homeMainEl));
    backFromLeaderViewBtn.addEventListener("click", () => showStack(leaderMenuEl));

    singleMenuEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-difficulty]");
      if (!btn) return;
      startSingle(btn.dataset.difficulty);
    });

    leaderMenuEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-lb]");
      if (!btn) return;
      const diff = btn.dataset.lb;
      showStack(leaderViewEl);
      loadLeaderboardFor(diff, { target: "home" });
    });

    goCreateRoomBtn.addEventListener("click", () => showStack(createMenuEl));
    goJoinRoomBtn.addEventListener("click", () => showStack(joinMenuEl));

    createRoomBtn.addEventListener("click", () => createRoom());
    joinRoomBtn.addEventListener("click", () => joinRoom());
    joinCodeEl.addEventListener("input", () => {
      joinCodeEl.value = normalizeRoomCode(joinCodeEl.value);
    });

    toHomeBtn.addEventListener("click", () => {
      if (currentRoomCode) {
        leaveLobby();
        return;
      }
      showHome();
    });
    restartBtn.addEventListener("click", () => resetGame(true));

    overlayBtnEl.addEventListener("click", () => {
      if (!pvpPanelEl.classList.contains("is-hidden") && currentRoomCode) {
        hideOverlay();
        // Host re-opens lobby after match.
        if (firebaseReady && db && currentUser && currentRoom && currentRoom.hostUid === currentUser.uid) {
          db.collection("rooms")
            .doc(currentRoomCode)
            .update({
              status: "lobby",
              startAt: null,
              updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            })
            .catch(() => {});
        }
        showLobbyOnly();
        return;
      }
      hideOverlay();
      resetGame(true);
    });
    overlayHomeBtnEl.addEventListener("click", () => {
      if (currentRoomCode) {
        hideOverlay();
        leaveLobby();
        return;
      }
      hideOverlay();
      showHome();
    });

    openLoginBtn.addEventListener("click", () => openAuthModal("login"));
    openRegisterBtn.addEventListener("click", () => openAuthModal("register"));
    mCloseBtn.addEventListener("click", () => closeAuthModal());
    mSubmitBtn.addEventListener("click", () => submitAuthModal());
    mGoogleBtn.addEventListener("click", () => signInWithGoogle());
    mTogglePassBtn.addEventListener("click", () => togglePasswordVisibility());
    mPassEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitAuthModal();
    });
    mEmailEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitAuthModal();
    });
    mNickEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitAuthModal();
    });

    authModalEl.addEventListener("click", (e) => {
      if (e.target === authModalEl) closeAuthModal();
    });
    overlayEl.addEventListener("click", (e) => {
      if (e.target === overlayEl) hideOverlay();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!authModalEl.classList.contains("is-hidden")) closeAuthModal();
        else if (!overlayEl.classList.contains("is-hidden")) hideOverlay();
      }
    });

    lbRefreshBtn.addEventListener("click", () => loadLeaderboardFor(difficultyKey, { target: "side" }));

    leaveLobbyBtn.addEventListener("click", () => leaveLobby());
    startPvpBtn.addEventListener("click", () => startPvp());
    saveLobbyDifficultyBtn.addEventListener("click", () => applyLobbyDifficulty());
  }

  function init() {
    wireEvents();
    initFirebase();
    showAuthBars();
    loadLeaderboardFor(difficultyKey, { target: "side" });
    showHome();
  }

  init();
})();
