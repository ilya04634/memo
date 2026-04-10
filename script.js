(() => {
  const TOTAL_PAIRS = 7;
  const REVEAL_SECONDS = 3;

  const boardEl = document.getElementById("board");
  const timeEl = document.getElementById("time");
  const movesEl = document.getElementById("moves");
  const pairsEl = document.getElementById("pairs");
  const restartBtn = document.getElementById("restart");

  const overlayEl = document.getElementById("overlay");
  const overlayTitleEl = document.getElementById("overlayTitle");
  const overlayTextEl = document.getElementById("overlayText");
  const overlayPillEl = document.getElementById("overlayPill");
  const overlayBtnEl = document.getElementById("overlayBtn");

  const scoreRowEl = document.getElementById("scoreRow");
  const playerNameEl = document.getElementById("playerName");
  const submitScoreBtn = document.getElementById("submitScore");
  const submitHintEl = document.getElementById("submitHint");

  const lbListEl = document.getElementById("lbList");
  const lbMetaEl = document.getElementById("lbMeta");
  const lbRefreshBtn = document.getElementById("lbRefresh");

  const frontImages = Array.from({ length: TOTAL_PAIRS }, (_, idx) => {
    const num = idx + 1;
    return `sprites/frontSideCard${num}.png`;
  });

  let cards = [];
  let opened = [];
  let matched = new Set();
  let locked = true;
  let moves = 0;
  let startMs = 0;
  let timerId = null;
  let previewTimeoutId = null;
  let phase = "menu"; // menu | preview | play | win

  let db = null;
  let leaderboardEnabled = false;
  let lastWin = null;
  let submitting = false;

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
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
    pairsEl.textContent = `${matched.size}/${TOTAL_PAIRS}`;
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

  function hideOverlay() {
    overlayEl.classList.add("is-hidden");
  }

  function setSubmitUIVisible(visible) {
    scoreRowEl.classList.toggle("is-hidden", !visible);
    submitHintEl.classList.toggle("is-hidden", !visible);
    if (!visible) submitHintEl.textContent = "";
  }

  function showOverlay({ title, text, pill, buttonText }) {
    overlayTitleEl.textContent = title;
    overlayTextEl.textContent = text;
    overlayPillEl.textContent = pill;
    overlayBtnEl.textContent = buttonText;
    overlayEl.classList.remove("is-hidden");
  }

  function cardHtml(card) {
    const safeLabel = "Карточка";
    return `
      <div class="card ${card.flipped ? "is-flipped" : ""} ${card.matched ? "is-matched" : ""}" data-key="${card.key}">
        <button type="button" aria-label="${safeLabel}">
          <div class="card-inner">
            <div class="card-face card-back"></div>
            <div class="card-face card-front" style="background-image:url('${card.img}')"></div>
          </div>
        </button>
      </div>
    `;
  }

  function render() {
    boardEl.innerHTML = cards.map(cardHtml).join("");
  }

  function getCardElByKey(key) {
    return boardEl.querySelector(`.card[data-key="${key}"]`);
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

  function clearPreviewTimeout() {
    if (previewTimeoutId) window.clearTimeout(previewTimeoutId);
    previewTimeoutId = null;
  }

  function showMenu() {
    phase = "menu";
    locked = true;
    opened = [];
    clearPreviewTimeout();
    stopTimer();
    setSubmitUIVisible(false);
    showOverlay({
      title: "Memory Cards",
      text: 'Нажми "Начать". Потом карточки откроются на пару секунд для запоминания и закроются.',
      pill: `${TOTAL_PAIRS} пар`,
      buttonText: "Начать",
    });
  }

  function startPreview() {
    phase = "preview";
    locked = true;
    opened = [];
    hideOverlay();
    revealAll();

    clearPreviewTimeout();
    previewTimeoutId = window.setTimeout(() => {
      hideUnmatched();
      phase = "play";
      locked = false;
      startTimer();
      previewTimeoutId = null;
    }, REVEAL_SECONDS * 1000);
  }

  function finishWin() {
    phase = "win";
    locked = true;
    stopTimer();
    const elapsed = performance.now() - startMs;
    setTime(elapsed);
    lastWin = { timeMs: Math.floor(elapsed), moves };

    const bestKey = "memory_best_ms_v1";
    const prevBest = Number(localStorage.getItem(bestKey) || "0");
    const isBest = prevBest === 0 || elapsed < prevBest;
    if (isBest) localStorage.setItem(bestKey, String(Math.floor(elapsed)));

    const bestMs = Number(localStorage.getItem(bestKey) || String(Math.floor(elapsed)));
    const bestText = formatTime(bestMs);

    showOverlay({
      title: "Готово!",
      text: `Время: ${formatTime(elapsed)}. Ходы: ${moves}. Лучшее: ${bestText}.`,
      pill: "Можно сыграть еще раз",
      buttonText: "Сыграть еще",
    });

    if (leaderboardEnabled) {
      setSubmitUIVisible(true);
      submitHintEl.textContent = "Введите имя и отправьте результат в таблицу лидеров.";
      if (!playerNameEl.value) {
        const cachedName = String(localStorage.getItem("memory_player_name_v1") || "").trim();
        if (cachedName) playerNameEl.value = cachedName.slice(0, 16);
      }
      submitScoreBtn.disabled = false;
    } else {
      setSubmitUIVisible(false);
    }
  }

  function sanitizeName(raw) {
    const trimmed = String(raw || "").trim();
    const noAngles = trimmed.replace(/[<>]/g, "");
    const noControls = noAngles.replace(/[\u0000-\u001f\u007f]/g, "");
    return noControls.slice(0, 16);
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setLbMeta(text) {
    lbMetaEl.textContent = text;
  }

  function renderLeaderboard(entries) {
    lbListEl.innerHTML = "";
    if (!entries.length) {
      const li = document.createElement("li");
      li.className = "leaderboard__item";
      li.innerHTML = `<span class="leaderboard__name">Пока пусто</span><span class="leaderboard__score">--:--</span>`;
      lbListEl.appendChild(li);
      return;
    }

    for (const entry of entries) {
      const li = document.createElement("li");
      li.className = "leaderboard__item";
      const name = escapeHtml(entry.name || "Player");
      const score = `${formatTime(entry.timeMs)} · ${entry.moves} ход`;
      li.innerHTML = `<span class="leaderboard__name">${name}</span><span class="leaderboard__score">${score}</span>`;
      lbListEl.appendChild(li);
    }
  }

  function firebaseIsConfigured() {
    const cfg = window.FIREBASE_CONFIG;
    return !!(cfg && typeof cfg === "object" && cfg.projectId);
  }

  function initFirebase() {
    if (!window.firebase) {
      leaderboardEnabled = false;
      setLbMeta("Firebase SDK: не загрузился");
      return;
    }
    if (!firebaseIsConfigured()) {
      leaderboardEnabled = false;
      setLbMeta("Firebase: не настроен");
      return;
    }

    try {
      if (!window.firebase.apps || window.firebase.apps.length === 0) {
        window.firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      db = window.firebase.firestore();
      leaderboardEnabled = true;
      setLbMeta("Firestore: подключен");
    } catch (e) {
      leaderboardEnabled = false;
      setLbMeta("Firestore: ошибка инициализации");
    }
  }

  async function loadLeaderboard() {
    if (!leaderboardEnabled || !db) {
      lbListEl.innerHTML = "";
      const li = document.createElement("li");
      li.className = "leaderboard__item";
      const msg = firebaseIsConfigured()
        ? "Лидерборд недоступен"
        : "Заполни firebase-config.js";
      li.innerHTML = `<span class="leaderboard__name">${msg}</span><span class="leaderboard__score">--:--</span>`;
      lbListEl.appendChild(li);
      return;
    }

    setLbMeta("Firestore: загрузка...");
    try {
      const collectionName = window.LEADERBOARD_COLLECTION || "leaderboard";
      const snap = await db
        .collection(collectionName)
        .orderBy("timeMs", "asc")
        .limit(10)
        .get();

      const entries = [];
      snap.forEach((doc) => {
        const d = doc.data() || {};
        if (typeof d.timeMs !== "number" || typeof d.moves !== "number") return;
        entries.push({ name: String(d.name || "Player"), timeMs: d.timeMs, moves: d.moves });
      });

      setLbMeta(`Firestore: топ ${entries.length}`);
      renderLeaderboard(entries);
    } catch (e) {
      setLbMeta("Firestore: не удалось загрузить (проверь Rules/Index)");
      renderLeaderboard([]);
    }
  }

  async function submitScore() {
    if (!leaderboardEnabled || !db) return;
    if (!lastWin) return;
    if (submitting) return;

    const name = sanitizeName(playerNameEl.value);
    if (name.length < 2) {
      submitHintEl.textContent = "Имя слишком короткое (минимум 2 символа).";
      return;
    }

    submitting = true;
    submitScoreBtn.disabled = true;
    submitHintEl.textContent = "Отправка...";

    try {
      const collectionName = window.LEADERBOARD_COLLECTION || "leaderboard";
      const payload = {
        name,
        timeMs: lastWin.timeMs,
        moves: lastWin.moves,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      };

      localStorage.setItem("memory_player_name_v1", name);
      await db.collection(collectionName).add(payload);

      submitHintEl.textContent = "Готово: результат добавлен.";
      await loadLeaderboard();
    } catch (e) {
      submitHintEl.textContent = "Ошибка отправки (проверь Firestore Rules).";
    } finally {
      submitting = false;
      submitScoreBtn.disabled = false;
    }
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
      }

      opened = [];
      locked = false;

      if (matched.size === TOTAL_PAIRS) finishWin();
    }, isMatch ? 320 : 650);
  }

  function buildDeck() {
    const deck = [];
    let keyCounter = 1;

    for (let pairId = 1; pairId <= TOTAL_PAIRS; pairId++) {
      const img = frontImages[pairId - 1];
      deck.push({ key: String(keyCounter++), pairId, img, flipped: false, matched: false });
      deck.push({ key: String(keyCounter++), pairId, img, flipped: false, matched: false });
    }

    shuffleInPlace(deck);
    return deck;
  }

  function resetGame({ reshuffle, goToMenu }) {
    stopTimer();
    clearPreviewTimeout();
    opened = [];
    matched = new Set();
    moves = 0;
    locked = true;
    phase = "menu";
    lastWin = null;
    setSubmitUIVisible(false);
    setTime(0);
    setStats();

    if (reshuffle) cards = buildDeck();
    cards.forEach((c) => {
      c.flipped = false;
      c.matched = false;
    });

    render();
    if (goToMenu) {
      showMenu();
    } else {
      startPreview();
    }
  }

  function wireEvents() {
    boardEl.addEventListener("click", (e) => {
      const cardEl = e.target.closest(".card");
      if (!cardEl) return;
      onCardClick(cardEl.dataset.key);
    });

    restartBtn.addEventListener("click", () => resetGame({ reshuffle: true, goToMenu: false }));

    lbRefreshBtn.addEventListener("click", () => loadLeaderboard());

    submitScoreBtn.addEventListener("click", () => submitScore());
    playerNameEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitScore();
    });

    overlayBtnEl.addEventListener("click", () => {
      if (phase === "menu") {
        resetGame({ reshuffle: true, goToMenu: false });
        return;
      }
      if (phase === "win") {
        resetGame({ reshuffle: true, goToMenu: false });
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") resetGame({ reshuffle: true, goToMenu: true });
    });
  }

  function init() {
    cards = buildDeck();
    render();
    wireEvents();
    initFirebase();
    loadLeaderboard();
    resetGame({ reshuffle: false, goToMenu: true });
  }

  init();
})();
