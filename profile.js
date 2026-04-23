(() => {
  const BACKGROUNDS = {
    default: { path: "sprites/background.png" },
    bg1: { path: "sprites/background1.png" },
    bg2: { path: "sprites/background2.png" },
  };
  const BG_STORAGE_KEY = "mc_bg_v1";

  const emailEl = document.getElementById("pEmail");
  const nickEl = document.getElementById("pNick");
  const hintEl = document.getElementById("pHint");
  const editBtn = document.getElementById("pEditNick");
  const logoutBtn = document.getElementById("pLogout");
  const editWrapEl = document.getElementById("pNickEdit");
  const nickInputEl = document.getElementById("pNickInput");
  const saveBtn = document.getElementById("pNickSave");

  let auth = null;
  let db = null;
  let user = null;
  let saving = false;

  function applySavedBackground() {
    try {
      const k = String(localStorage.getItem(BG_STORAGE_KEY) || "").trim();
      const safe = BACKGROUNDS[k] ? k : "default";
      document.documentElement.style.setProperty("--bg-image", `url("${BACKGROUNDS[safe].path}")`);
    } catch (_) {
      // ignore
    }
  }

  function setHint(text) {
    hintEl.textContent = text || "";
  }

  function sanitizeName(raw) {
    const trimmed = String(raw || "").trim();
    const noAngles = trimmed.replace(/[<>]/g, "");
    const noControls = noAngles.replace(/[\u0000-\u001f\u007f]/g, "");
    return noControls.slice(0, 16);
  }

  function firebaseIsConfigured() {
    const cfg = window.FIREBASE_CONFIG;
    return !!(cfg && typeof cfg === "object" && cfg.projectId);
  }

  function initFirebase() {
    if (!window.firebase) {
      setHint("Firebase SDK не загрузился.");
      return false;
    }
    if (!firebaseIsConfigured()) {
      setHint("Firebase не настроен (проверь firebase-config.js).");
      return false;
    }

    try {
      if (!window.firebase.apps || window.firebase.apps.length === 0) {
        window.firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      auth = window.firebase.auth();
      db = window.firebase.firestore();
      return true;
    } catch (_) {
      setHint("Ошибка инициализации Firebase.");
      return false;
    }
  }

  function render(u) {
    emailEl.textContent = u?.email || "---";
    nickEl.textContent = String(u?.displayName || "").trim() || "---";
    nickInputEl.value = String(u?.displayName || "").slice(0, 16);
  }

  async function logout() {
    if (!auth) return;
    setHint("Выход...");
    try {
      await auth.signOut();
    } catch (_) {
      setHint("Не удалось выйти.");
    }
  }

  async function saveNick() {
    if (!user || !db) return;
    if (saving) return;
    const nickname = sanitizeName(nickInputEl.value);
    if (nickname.length < 2) {
      setHint("Ник минимум 2 символа.");
      return;
    }

    saving = true;
    setHint("Сохраняю...");
    try {
      await user.updateProfile({ displayName: nickname });
      render(user);

      // Keep leaderboard name in sync for all difficulties if rows exist.
      const updatedAt = window.firebase.firestore.FieldValue.serverTimestamp();
      for (const diff of ["easy", "medium", "hard", "superhard"]) {
        const docRef = db.collection("leaderboards").doc(diff).collection("entries").doc(user.uid);
        const snap = await docRef.get();
        if (snap.exists) {
          await docRef.update({ name: nickname, updatedAt });
        }
      }

      setHint("Ник сохранен.");
      editWrapEl.classList.add("is-hidden");
    } catch (e) {
      const code = String(e?.code || "");
      setHint(code ? `Ошибка: ${code}` : "Не удалось сохранить ник.");
    } finally {
      saving = false;
    }
  }

  function wire() {
    editBtn.addEventListener("click", () => {
      editWrapEl.classList.toggle("is-hidden");
      if (!editWrapEl.classList.contains("is-hidden")) nickInputEl.focus();
    });
    logoutBtn.addEventListener("click", () => logout());
    saveBtn.addEventListener("click", () => saveNick());
    nickInputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveNick();
      if (e.key === "Escape") editWrapEl.classList.add("is-hidden");
    });
  }

  function init() {
    wire();
    applySavedBackground();
    if (!initFirebase()) return;

    auth.onAuthStateChanged((u) => {
      user = u || null;
      if (!user) {
        render(null);
        setHint("Нужно войти. Вернись на главную страницу и выполни вход.");
        return;
      }
      setHint("");
      render(user);
    });
  }

  init();
})();
