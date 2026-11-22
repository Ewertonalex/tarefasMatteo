"use strict";

const STORAGE_KEY = "missoes-do-matteo-v1";

const DEFAULT_ACTIVITIES = [
  { id: "cama", name: "Arrumar a cama", icon: "🛏️" },
  { id: "cafe", name: "Tomar o café da manhã", icon: "🥐" },
  { id: "dente-cafe", name: "Escovar os dentes depois do café da manhã", icon: "🪥🥐" },
  { id: "leitura-manha", name: "Fazer a leitura da manhã", icon: "📖" },
  { id: "roupas", name: "Guardar as roupas", icon: "👕" },
  { id: "escola", name: "Fazer as tarefas da escola", icon: "✏️" },
  { id: "almoco", name: "Almoçar", icon: "🍽️" },
  { id: "dente-almoco", name: "Escovar os dentes depois do almoço", icon: "🪥🍽️" },
  { id: "lixo", name: "Jogar o lixo", icon: "🗑️" },
  { id: "jantar", name: "Jantar", icon: "🍲" },
  { id: "dente-jantar", name: "Escovar os dentes depois do jantar", icon: "🪥🍲" },
  { id: "leitura-noite", name: "Fazer a leitura da noite", icon: "📚" },
  { id: "dente-dormir", name: "Escovar os dentes antes de dormir", icon: "🪥🌙" },
];

const ICONS = [
  "⭐", "🛏️", "🥐", "🪥", "🪥🥐", "🍽️", "🪥🍽️", "🍲", "🪥🍲", "🌙", "🪥🌙",
  "📖", "📚", "👕", "✏️", "🎒", "🗑️", "😁", "🚿", "🧸", "⚽", "🎨", "🧩",
  "🍎", "💧", "🐶", "🌱", "🎵", "🧹", "🧼", "☀️", "🏫", "💤",
];

const ACCENTS = ["#7ec4ff", "#2f86ea", "#49c2e8", "#8eb6ff", "#1f6fe0", "#5bd0f0"];
const CONFETTI_COLORS = ["#7ec4ff", "#2f86ea", "#49c2e8", "#0e4f99", "#b9dcff", "#ffffff", "#5bd0f0"];

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const splash = document.getElementById("splash");
const splashText = document.getElementById("splash-text");
const startBtn = document.getElementById("start-btn");
const muteBtn = document.getElementById("mute-btn");
const dateLabel = document.getElementById("date-label");
const greet = document.getElementById("greet");
const progressText = document.getElementById("progress-text");
const progressCount = document.getElementById("progress-count");
const trail = document.getElementById("trail");
const trailFill = document.getElementById("trail-fill");
const trailStar = document.getElementById("trail-star");
const dayBanner = document.getElementById("day-banner");
const dayText = document.getElementById("day-text");
const reopenBtn = document.getElementById("reopen-btn");
const list = document.getElementById("list");
const addBtn = document.getElementById("add-btn");
const finishBtn = document.getElementById("finish-btn");
const restoreBtn = document.getElementById("restore-btn");
const toastEl = document.getElementById("toast");
const mascot = document.getElementById("mascot");
const editor = document.getElementById("editor");
const editorTitle = document.getElementById("editor-title");
const editorForm = document.getElementById("editor-form");
const missionName = document.getElementById("mission-name");
const iconPicker = document.getElementById("icon-picker");
const moveRow = document.getElementById("move-row");
const moveUpBtn = document.getElementById("move-up");
const moveDownBtn = document.getElementById("move-down");
const deleteBtn = document.getElementById("delete-mission");
const editorCancel = document.getElementById("editor-cancel");
const confirmModal = document.getElementById("confirm-modal");
const confirmTitle = document.getElementById("confirm-title");
const confirmText = document.getElementById("confirm-text");
const confirmOk = document.getElementById("confirm-ok");
const confirmCancel = document.getElementById("confirm-cancel");
const ceremony = document.getElementById("ceremony");
const ceremonyCard = document.getElementById("ceremony-card");
const ceremonyEmoji = document.getElementById("ceremony-emoji");
const ceremonyTitle = document.getElementById("ceremony-title");
const ceremonyScore = document.getElementById("ceremony-score");
const ceremonyStars = document.getElementById("ceremony-stars");
const ceremonyText = document.getElementById("ceremony-text");
const lockBtn = document.getElementById("lock-btn");
const backBtn = document.getElementById("back-btn");
const canvas = document.getElementById("confetti");
const ctx2d = canvas.getContext("2d");

let state = loadState();
let started = false;
let editingId = null;
let draftIcon = "⭐";
let celebrateId = null;
let confirmClose = null;
let toastTimer = 0;
let countToken = 0;
let audioCtx = null;
let particles = [];
let confettiFrame = 0;

function todayKey() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function newId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneDefaults() {
  return DEFAULT_ACTIVITIES.map((activity) => ({ ...activity, done: false }));
}

function freshState() {
  return {
    date: todayKey(),
    muted: false,
    dayFinished: false,
    result: null,
    activities: cloneDefaults(),
  };
}

function sanitizeActivity(activity) {
  if (!activity || typeof activity.name !== "string") return null;
  const name = activity.name.trim().slice(0, 80);
  if (name.length < 2) return null;
  const icon = typeof activity.icon === "string" && activity.icon.trim()
    ? [...activity.icon.trim()].slice(0, 4).join("")
    : "⭐";
  return {
    id: String(activity.id || newId()),
    name,
    icon,
    done: Boolean(activity.done),
  };
}

function sanitizeResult(result) {
  if (!result || typeof result !== "object") return null;
  const score = Number(result.score);
  const done = Number(result.done);
  const total = Number(result.total);
  if (!Number.isFinite(score) || !Number.isFinite(done) || !Number.isFinite(total)) return null;
  return {
    score: Math.max(0, Math.min(10, Math.round(score))),
    done: Math.max(0, Math.round(done)),
    total: Math.max(0, Math.round(total)),
  };
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch (error) {
    return null;
  }
}

function loadState() {
  const data = readStorage();
  if (!data) return freshState();
  const activities = Array.isArray(data.activities)
    ? data.activities.map(sanitizeActivity).filter(Boolean)
    : cloneDefaults();
  const result = sanitizeResult(data.result);
  return {
    date: typeof data.date === "string" ? data.date : todayKey(),
    muted: Boolean(data.muted),
    dayFinished: Boolean(data.dayFinished) && Boolean(result),
    result,
    activities,
  };
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Não foi possível guardar as missões neste navegador.", error);
  }
}

function rollover() {
  const today = todayKey();
  if (state.date === today) return false;
  state.date = today;
  state.dayFinished = false;
  state.result = null;
  state.activities.forEach((activity) => {
    activity.done = false;
  });
  save();
  return true;
}

function doneCount() {
  return state.activities.filter((activity) => activity.done).length;
}

function scoreFrom(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 10);
}

function toneFromScore(score) {
  if (score >= 10) return "perfect";
  if (score >= 7) return "almost";
  return "grow";
}

function review(score, done, total) {
  const missionWord = total === 1 ? "missão" : "missões";
  const base = `Você cumpriu ${done} de ${total} ${missionWord}.`;
  const tone = toneFromScore(score);
  if (tone === "perfect") {
    return {
      tone,
      emoji: "🏆",
      title: "Parabéns, Matteo! Você cumpriu tudo!",
      text: `${base} O Bob Esponja está pulando de alegria. Durma feliz, super-herói, e amanhã a gente brilha de novo.`,
    };
  }
  if (tone === "almost") {
    return {
      tone,
      emoji: "🌟",
      title: "Quase lá, Matteo!",
      text: `${base} Faltou um tiquinho. O Bob Esponja acredita em você. Amanhã a gente busca as estrelas que faltaram.`,
    };
  }
  return {
    tone,
    emoji: "🌈",
    title: "Precisa melhorar, Matteo",
    text: `${base} Amanhã é um jogo novo, Matteo. O Bob Esponja continua torcendo por você. Um passo de cada vez já vira estrela.`,
  };
}

function greeting() {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const total = state.activities.length;
  const done = doneCount();
  if (state.dayFinished && state.result) {
    return `${hello}, Matteo! Hoje sua nota foi ${state.result.score} de 10. Descanse bastante.`;
  }
  if (total === 0) return `${hello}, Matteo! Vamos criar uma missão nova?`;
  if (done === 0) return `${hello}, Matteo! Toque na estrela quando cumprir uma missão.`;
  if (done === total) return `${hello}, Matteo! Você cumpriu tudo. Pode finalizar o dia!`;
  const left = total - done;
  const rest = left === 1 ? "Falta 1 missão" : `Faltam ${left} missões`;
  return `${hello}, Matteo! ${rest}. Você consegue!`;
}

function formatDate() {
  const text = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function audio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playNotes(notes, type = "triangle", gap = 0.09, duration = 0.22, volume = 0.12) {
  if (state.muted) return;
  let context;
  try {
    context = audio();
  } catch (error) {
    return;
  }
  const now = context.currentTime;
  notes.forEach((freq, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, now);
    const start = now + index * gap;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  });
}

function playStart() { playNotes([392, 523.25, 659.25], "sine", 0.1, 0.24, 0.12); }
function playComplete() { playNotes([523.25, 659.25, 783.99], "sine", 0.08, 0.2, 0.13); }
function playPerfect() { playNotes([523.25, 659.25, 783.99, 1046.5], "sine", 0.11, 0.28, 0.14); }
function playAlmost() { playNotes([493.88, 659.25, 783.99], "sine", 0.1, 0.24, 0.12); }
function playGrow() { playNotes([392, 523.25], "sine", 0.14, 0.28, 0.1); }
function playUndo() { playNotes([440, 330], "triangle", 0.08, 0.16, 0.08); }
function playAdd() { playNotes([659.25, 880], "sine", 0.08, 0.18, 0.1); }
function playSoft() { playNotes([520], "sine", 0.05, 0.12, 0.07); }

let speakTimer = 0;

function speak(text) {
  if (state.muted || !text || !window.speechSynthesis) return;
  window.clearTimeout(speakTimer);
  speakTimer = window.setTimeout(() => {
    if (state.muted) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pt-BR";
    utter.rate = 1.02;
    utter.pitch = 1.15;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) => item.lang === "pt-BR")
      || voices.find((item) => item.lang && item.lang.toLowerCase().startsWith("pt"));
    if (voice) utter.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, 280);
}

if (window.speechSynthesis) {
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx2d.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function celebrate(x, y, power = 1) {
  if (reduceMotion) return;
  const count = Math.min(110, Math.floor(80 * power));
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (3 + Math.random() * 6) * Math.max(power, 0.45);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      g: 0.16 + Math.random() * 0.08,
      size: 6 + Math.random() * 7,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      life: 70 + Math.random() * 28,
      max: 98,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.28,
      shape: index % 3,
    });
  }
  if (particles.length > 240) particles.splice(0, particles.length - 240);
  if (!confettiFrame) confettiFrame = requestAnimationFrame(drawConfetti);
}

function party(power) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  celebrate(width * 0.5, height * 0.35, power);
  celebrate(width * 0.2, height * 0.28, power * 0.75);
  celebrate(width * 0.8, height * 0.28, power * 0.75);
}

function drawConfetti() {
  ctx2d.clearRect(0, 0, window.innerWidth, window.innerHeight);
  particles.forEach((piece) => {
    piece.vy += piece.g;
    piece.x += piece.vx;
    piece.y += piece.vy;
    piece.life -= 1;
    piece.rot += piece.vr;
    ctx2d.save();
    ctx2d.translate(piece.x, piece.y);
    ctx2d.rotate(piece.rot);
    ctx2d.globalAlpha = Math.max(piece.life / piece.max, 0);
    ctx2d.fillStyle = piece.color;
    if (piece.shape === 0) {
      ctx2d.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
    } else if (piece.shape === 1) {
      ctx2d.beginPath();
      ctx2d.arc(0, 0, piece.size / 3, 0, Math.PI * 2);
      ctx2d.fill();
    } else {
      ctx2d.fillRect(-piece.size / 5, -piece.size / 2, piece.size * 0.4, piece.size);
    }
    ctx2d.restore();
  });
  particles = particles.filter((piece) => piece.life > 0 && piece.y < window.innerHeight + 40);
  if (particles.length) confettiFrame = requestAnimationFrame(drawConfetti);
  else {
    confettiFrame = 0;
    ctx2d.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

function toast(message) {
  toastEl.classList.remove("show");
  toastEl.textContent = "";
  void toastEl.offsetWidth;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 3600);
}

function floatStar(x, y) {
  if (reduceMotion) return;
  const star = document.createElement("div");
  star.className = "floater";
  star.textContent = "⭐ +1";
  star.style.left = `${x}px`;
  star.style.top = `${y}px`;
  document.body.appendChild(star);
  star.addEventListener("animationend", () => star.remove());
}

function hop() {
  mascot.classList.remove("bounce");
  void mascot.offsetWidth;
  mascot.classList.add("bounce");
}

function show(element) {
  element.hidden = false;
  document.body.classList.add("modal-open");
}

function hide(element) {
  element.hidden = true;
  if (!document.querySelector(".modal:not([hidden])")) {
    document.body.classList.remove("modal-open");
  }
}

function renderMute() {
  muteBtn.textContent = state.muted ? "🔇" : "🔊";
  muteBtn.setAttribute("aria-pressed", state.muted ? "false" : "true");
  muteBtn.setAttribute("aria-label", state.muted ? "Ligar sons" : "Desligar sons");
}

function missionCard(activity, index) {
  const card = document.createElement("article");
  card.className = "card";
  if (activity.done) card.classList.add("done");
  if (activity.id === celebrateId) card.classList.add("just-done");
  card.style.setProperty("--accent", activity.done ? "#1d6fbf" : ACCENTS[index % ACCENTS.length]);

  const main = document.createElement("button");
  main.type = "button";
  main.className = "card-main";
  main.dataset.id = activity.id;
  const action = activity.done ? "desmarcar" : "cumprir";
  const status = activity.done ? "Concluída" : "Ainda não";
  main.setAttribute("aria-label", `${activity.name}. ${status}. Toque para ${action}.`);

  const wrap = document.createElement("span");
  wrap.className = "icon-wrap";
  const icon = document.createElement("span");
  icon.className = "icon";
  if ([...activity.icon].length > 1) icon.classList.add("duo");
  icon.textContent = activity.icon;
  icon.setAttribute("aria-hidden", "true");
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = String(index + 1);
  wrap.append(icon, badge);

  const info = document.createElement("span");
  info.className = "info";
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = activity.name;
  const hint = document.createElement("span");
  hint.className = "hint";
  hint.textContent = activity.done ? "Feita! Mandou bem, Matteo!" : "Toque para cumprir";
  info.append(name, hint);
  main.append(wrap, info);

  const side = document.createElement("div");
  side.className = "side";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "mini";
  edit.dataset.edit = activity.id;
  edit.setAttribute("aria-label", `Editar a missão ${activity.name}`);
  edit.textContent = "✏️";
  const check = document.createElement("button");
  check.type = "button";
  check.className = "check";
  check.dataset.id = activity.id;
  check.setAttribute("aria-pressed", activity.done ? "true" : "false");
  check.setAttribute("aria-label", activity.done ? `Desmarcar ${activity.name}` : `Cumprir ${activity.name}`);
  check.textContent = activity.done ? "⭐" : "☆";
  side.append(edit, check);
  card.append(main, side);
  return card;
}

function render() {
  const total = state.activities.length;
  const done = doneCount();
  const percent = total ? (done / total) * 100 : 0;

  dateLabel.textContent = formatDate();
  greet.textContent = greeting();
  progressText.textContent = "Estrelinhas do Matteo";
  progressCount.textContent = `${done}/${total}`;
  trailFill.style.width = `${percent}%`;
  trailStar.style.left = `clamp(0px, calc(${percent}% - 12px), calc(100% - 28px))`;
  trail.setAttribute("aria-valuemax", String(total));
  trail.setAttribute("aria-valuenow", String(done));
  trail.setAttribute("aria-valuetext", `${done} de ${total} estrelinhas`);

  if (state.dayFinished && state.result) {
    dayBanner.hidden = false;
    dayText.textContent = `Dia encerrado, Matteo. Sua nota foi ${state.result.score} de 10.`;
  } else {
    dayBanner.hidden = true;
  }

  list.replaceChildren();
  if (!total) {
    const empty = document.createElement("p");
    empty.className = "how";
    empty.textContent = "Matteo, a lista está vazia. Que tal criar uma missão nova?";
    list.appendChild(empty);
  } else {
    state.activities.forEach((activity, index) => list.appendChild(missionCard(activity, index)));
  }

  finishBtn.textContent = state.dayFinished ? "Ver minha nota" : "Finalizar o dia";
  document.body.classList.toggle("all-done", total > 0 && done === total && !state.dayFinished);
  document.body.classList.toggle("day-over", state.dayFinished);
  document.title = total ? `Matteo — ${done} de ${total} estrelas` : "Missões do Matteo";
  renderMute();
}

function starPoint(id) {
  const button = [...list.querySelectorAll(".check")].find((item) => item.dataset.id === id);
  if (!button) return { x: window.innerWidth / 2, y: window.innerHeight / 3 };
  const rect = button.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function toggle(id) {
  if (state.dayFinished) {
    toast("O dia já acabou, Matteo. Descanse! Amanhã tem aventura nova.");
    playSoft();
    return;
  }
  const activity = state.activities.find((item) => item.id === id);
  if (!activity) return;
  activity.done = !activity.done;
  save();
  if (activity.done) {
    celebrateId = id;
    render();
    const point = starPoint(id);
    const allDone = state.activities.length > 0 && state.activities.every((item) => item.done);
    celebrate(point.x, point.y, allDone ? 1.2 : 1);
    floatStar(point.x, point.y);
    hop();
    if (allDone) {
      playPerfect();
      party(1);
      const message = `Parabéns, Matteo! Você cumpriu tudo! O Bob Esponja está pulando de alegria!`;
      toast(message);
      speak(message);
    } else {
      playComplete();
      const message = `Parabéns, Matteo! O Bob Esponja adorou: ${activity.name}!`;
      toast(message);
      speak(message);
    }
  } else {
    celebrateId = null;
    render();
    playUndo();
    const message = `Tudo bem, Matteo. O Bob Esponja espera você em ${activity.name}.`;
    toast(message);
    speak(message);
  }
}

function countUp(target) {
  const token = countToken + 1;
  countToken = token;
  if (reduceMotion || target === 0) {
    ceremonyScore.textContent = String(target);
    return;
  }
  let current = 0;
  ceremonyScore.textContent = "0";
  const step = () => {
    if (token !== countToken) return;
    current += 1;
    ceremonyScore.textContent = String(current);
    if (current < target) window.setTimeout(step, 70);
  };
  window.setTimeout(step, 80);
}

function openFinish() {
  const totalNow = state.activities.length;
  if (!totalNow) {
    toast("Matteo, crie uma missão antes de finalizar o dia.");
    playSoft();
    return;
  }
  const finished = Boolean(state.dayFinished && state.result);
  const done = finished ? state.result.done : doneCount();
  const total = finished ? state.result.total : totalNow;
  const score = finished ? state.result.score : scoreFrom(done, total);
  const info = review(score, done, total);

  ceremonyCard.classList.remove("tone-perfect", "tone-almost", "tone-grow");
  ceremonyCard.classList.add(`tone-${info.tone}`);
  ceremonyEmoji.textContent = info.emoji;
  ceremonyTitle.textContent = info.title;
  ceremonyText.textContent = info.text;
  ceremonyStars.replaceChildren();
  for (let index = 0; index < 10; index += 1) {
    const star = document.createElement("span");
    star.textContent = index < score ? "⭐" : "☆";
    star.style.animationDelay = `${index * 0.05}s`;
    ceremonyStars.appendChild(star);
  }
  lockBtn.hidden = finished;
  backBtn.textContent = finished ? "Fechar" : "Voltar às missões";
  show(ceremony);
  countUp(score);
  if (info.tone === "perfect") {
    party(1.35);
    playPerfect();
    speak("Nota dez, Matteo! O Bob Esponja diz que você arrasou!");
  } else if (info.tone === "almost") {
    party(0.9);
    playAlmost();
    speak("Quase lá, Matteo! O Bob Esponja acredita em você!");
  } else {
    celebrate(window.innerWidth / 2, window.innerHeight / 3, 0.45);
    playGrow();
    speak("Amanhã melhora, Matteo! O Bob Esponja continua torcendo por você!");
  }
  (finished ? backBtn : lockBtn).focus();
}

function closeCeremony() {
  hide(ceremony);
}

function lockDay() {
  const done = doneCount();
  const total = state.activities.length;
  const score = scoreFrom(done, total);
  state.dayFinished = true;
  state.result = { score, done, total };
  save();
  lockBtn.hidden = true;
  backBtn.textContent = "Fechar";
  backBtn.focus();
  render();
  const bye = "Até amanhã, Matteo! O Bob Esponja volta amanhã.";
  toast(bye);
  playAdd();
  speak(bye);
}

function askConfirm({ title, text, ok, cancel, danger }) {
  confirmTitle.textContent = title;
  confirmText.textContent = text;
  confirmOk.textContent = ok;
  confirmCancel.textContent = cancel;
  confirmOk.className = danger ? "btn btn-danger" : "btn btn-primary";
  show(confirmModal);
  return new Promise((resolve) => {
    const close = (value) => {
      confirmClose = null;
      confirmOk.onclick = null;
      confirmCancel.onclick = null;
      hide(confirmModal);
      resolve(value);
    };
    confirmClose = () => close(false);
    confirmOk.onclick = () => close(true);
    confirmCancel.onclick = () => close(false);
    (danger ? confirmCancel : confirmOk).focus();
  });
}

function paintIcons() {
  const icons = ICONS.includes(draftIcon) ? ICONS : [draftIcon, ...ICONS];
  iconPicker.replaceChildren();
  icons.forEach((icon) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-choice";
    if ([...icon].length > 1) button.classList.add("duo");
    button.textContent = icon;
    button.setAttribute("aria-label", `Escolher o desenho ${icon}`);
    button.setAttribute("aria-pressed", icon === draftIcon ? "true" : "false");
    button.addEventListener("click", () => {
      draftIcon = icon;
      paintIcons();
    });
    iconPicker.appendChild(button);
  });
}

function updateMoveButtons() {
  const index = state.activities.findIndex((activity) => activity.id === editingId);
  moveUpBtn.disabled = index <= 0;
  moveDownBtn.disabled = index < 0 || index >= state.activities.length - 1;
}

function openEditor(id) {
  const current = id ? state.activities.find((activity) => activity.id === id) : null;
  if (id && !current) return;
  editingId = current ? current.id : null;
  editorTitle.textContent = current ? "Mudar a missão" : "Nova missão do Matteo";
  missionName.value = current ? current.name : "";
  draftIcon = current ? current.icon : "⭐";
  moveRow.hidden = !current;
  deleteBtn.hidden = !current;
  paintIcons();
  if (current) updateMoveButtons();
  show(editor);
  missionName.focus();
}

function closeEditor() {
  editingId = null;
  hide(editor);
}

function saveMission() {
  const name = missionName.value.trim();
  if (name.length < 2) {
    toast("Matteo, a missão precisa de um nome bonitinho.");
    missionName.focus();
    return;
  }
  const isEdit = Boolean(editingId);
  if (isEdit) {
    const current = state.activities.find((activity) => activity.id === editingId);
    if (!current) return;
    current.name = name.slice(0, 80);
    current.icon = draftIcon;
  } else {
    state.activities.push({
      id: newId(),
      name: name.slice(0, 80),
      icon: draftIcon,
      done: false,
    });
  }
  save();
  closeEditor();
  render();
  if (state.dayFinished) {
    toast("Lista atualizada, Matteo. A nota de hoje continua guardada.");
  } else if (isEdit) {
    toast("Prontinho, Matteo! A missão foi atualizada.");
  } else {
    const added = "Prontinho, Matteo! O Bob Esponja aprovou a missão nova.";
    toast(added);
    speak(added);
  }
  if (isEdit) playSoft();
  else playAdd();
}

function move(direction) {
  if (!editingId) return;
  const index = state.activities.findIndex((activity) => activity.id === editingId);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= state.activities.length) return;
  const [item] = state.activities.splice(index, 1);
  state.activities.splice(next, 0, item);
  save();
  render();
  updateMoveButtons();
  playSoft();
}

async function removeCurrent() {
  const current = state.activities.find((activity) => activity.id === editingId);
  if (!current) return;
  const yes = await askConfirm({
    title: "Apagar esta missão?",
    text: `Matteo, a missão “${current.name}” vai sair da lista.`,
    ok: "Apagar",
    cancel: "Deixar quieto",
    danger: true,
  });
  if (!yes) return;
  state.activities = state.activities.filter((activity) => activity.id !== current.id);
  save();
  closeEditor();
  render();
  toast("Prontinho, Matteo. A missão saiu da lista.");
  playUndo();
}

function signature(activities) {
  return activities.map((activity) => [activity.id, activity.name, activity.icon, activity.done ? 1 : 0].join("|")).join("||");
}

function mergeDefaults(activities) {
  const pool = activities.map((activity) => ({ ...activity }));
  const used = new Set();
  const next = [];
  DEFAULT_ACTIVITIES.forEach((preset) => {
    const found = pool.find((activity) => !used.has(activity.id) && activity.name.trim().toLowerCase() === preset.name.toLowerCase());
    if (found) {
      used.add(found.id);
      next.push(found);
    } else {
      next.push({ id: newId(), name: preset.name, icon: preset.icon, done: false });
    }
  });
  pool.forEach((activity) => {
    if (!used.has(activity.id)) next.push(activity);
  });
  return next;
}

function updateSplash() {
  if (state.dayFinished && state.result) {
    splashText.textContent = `Matteo, você já brilhou hoje! Sua nota foi ${state.result.score} de 10.`;
    startBtn.textContent = "Ver meu dia";
  } else {
    splashText.textContent = "Toque no botão. O Bob Esponja liga os sons e começa o dia com você.";
    startBtn.textContent = "Começar a aventura";
  }
}

function onWake() {
  if (!started) {
    updateSplash();
    return;
  }
  if (rollover()) {
    if (confirmClose) confirmClose();
    if (!editor.hidden) closeEditor();
    if (!ceremony.hidden) closeCeremony();
    render();
    toast("Um novo dia começou, Matteo! Suas missões estão novinhas.");
  }
}

list.addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit]");
  if (edit) {
    openEditor(edit.dataset.edit);
    return;
  }
  const button = event.target.closest("[data-id]");
  if (button) toggle(button.dataset.id);
});

startBtn.addEventListener("click", () => {
  started = true;
  try { audio().resume(); } catch (error) { /* o navegador pode bloquear o áudio */ }
  if (window.speechSynthesis) window.speechSynthesis.getVoices();
  hide(splash);
  if (state.dayFinished && state.result) openFinish();
  else {
    playStart();
    speak("Olá, Matteo! O Bob Esponja veio torcer por você!");
    hop();
  }
});

muteBtn.addEventListener("click", () => {
  state.muted = !state.muted;
  save();
  renderMute();
  if (state.muted && window.speechSynthesis) window.speechSynthesis.cancel();
  if (!state.muted) playSoft();
});

addBtn.addEventListener("click", () => openEditor(null));
finishBtn.addEventListener("click", openFinish);
lockBtn.addEventListener("click", lockDay);
backBtn.addEventListener("click", closeCeremony);
editorCancel.addEventListener("click", closeEditor);
editorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveMission();
});
moveUpBtn.addEventListener("click", () => move(-1));
moveDownBtn.addEventListener("click", () => move(1));
deleteBtn.addEventListener("click", removeCurrent);

reopenBtn.addEventListener("click", async () => {
  const yes = await askConfirm({
    title: "Reabrir o dia?",
    text: "Matteo poderá continuar as missões. A nota de hoje sai da tela.",
    ok: "Reabrir",
    cancel: "Deixar fechado",
    danger: false,
  });
  if (!yes) return;
  state.dayFinished = false;
  state.result = null;
  save();
  render();
  toast("Dia reaberto, Matteo! Bora buscar mais estrelas?");
  playSoft();
});

restoreBtn.addEventListener("click", async () => {
  const extra = state.dayFinished ? " A nota de hoje fica guardada." : "";
  const yes = await askConfirm({
    title: "Trazer as missões iniciais?",
    text: `As missões originais do Matteo voltam, e as que você criou continuam.${extra}`,
    ok: "Trazer de volta",
    cancel: "Agora não",
    danger: false,
  });
  if (!yes) return;
  const before = signature(state.activities);
  state.activities = mergeDefaults(state.activities);
  if (signature(state.activities) === before) {
    toast("Matteo, as missões iniciais já estão todas aqui.");
    return;
  }
  save();
  render();
  toast("Prontinho, Matteo! As missões iniciais voltaram.");
  playAdd();
});

[editor, confirmModal, ceremony].forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target !== modal) return;
    if (modal === confirmModal && confirmClose) confirmClose();
    else if (modal === editor) closeEditor();
    else if (modal === ceremony) closeCeremony();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (confirmClose) {
    confirmClose();
    return;
  }
  if (!editor.hidden) closeEditor();
  else if (!ceremony.hidden) closeCeremony();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") onWake();
});
window.addEventListener("focus", onWake);
window.addEventListener("resize", resizeCanvas);
mascot.addEventListener("animationend", (event) => {
  if (event.animationName === "hop") mascot.classList.remove("bounce");
});

resizeCanvas();
rollover();
updateSplash();
render();
startBtn.focus();
