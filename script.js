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
    resetGame({ reshuffle: false, goToMenu: true });
  }

  init();
})();
