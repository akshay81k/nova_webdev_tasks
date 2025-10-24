//TODO: Varaiables
const gameBoard = document.getElementById("gameBoard");
const timerEl = document.getElementById("timer");
const bestScoreEl = document.getElementById("bestScore");
const modalBestScoreEl = document.getElementById("modalBestScore");
const gamesListEl = document.getElementById("gamesList");

const resetBtn = document.getElementById("resetBtn");
const revealBtn = document.getElementById("revealBtn");
const freezeBtn = document.getElementById("freezeBtn");
const scoreBtn = document.getElementById("scoreBtn");
const themeToggle = document.getElementById("themeToggle");
const musicToggle = document.getElementById("musicToggle");

const emojis = ["🍎","🍌","🍇","🍉","🍒","🥝"];
let cards = [...emojis, ...emojis]; 

//TASK: States
let timer = null;
let totalSeconds = 0;
let timeStarted = false;

let flippedCards = [];
let lockBoard = false;
let revealUsed = false;
let freezeUsed = false;


//TASK: Audio
let audioCtx = null;
let musicGain = null;
let musicOsc1 = null;
let musicRunning = false;

function ensureAudioContext(){
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

/* Simple background "chill arpeggio" using oscillator gain */
function startBackgroundMusic(){
  ensureAudioContext();
  if (musicRunning) return;
  musicRunning = true;

  // create gain for volume control
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.03;
  musicGain.connect(audioCtx.destination);

  // create a couple oscillators for texture
  musicOsc1 = audioCtx.createOscillator();
  musicOsc1.type = "sine";
  musicOsc1.frequency.value = 110; // base freq
  const oscGain = audioCtx.createGain();
  oscGain.gain.value = 0.5;
  musicOsc1.connect(oscGain).connect(musicGain);

  musicOsc1.start();

  // subtle movement with interval (change frequency)
  musicOsc1._interval = setInterval(() => {
    const note = 110 + Math.floor(Math.random()*120);
    musicOsc1.frequency.setValueAtTime(note, audioCtx.currentTime);
  }, 450);
}

function stopBackgroundMusic(){
  if (!musicRunning) return;
  musicRunning = false;
  if (musicOsc1) {
    clearInterval(musicOsc1._interval);
    try { musicOsc1.stop(); } catch(e){}
    musicOsc1.disconnect();
    musicOsc1 = null;
  }
  if (musicGain) { musicGain.disconnect(); musicGain = null; }
}

/* small SFX: quick beep */
function playBeep(frequency=600, duration=0.06, type="square", vol=0.12){
  ensureAudioContext();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = frequency;
  g.gain.value = vol;
  o.connect(g); g.connect(audioCtx.destination);
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  setTimeout(()=>{ try{ o.stop(); }catch(e){} }, duration*1000 + 20);
}

/* match sound */
function playMatch(){
  playBeep(900, 0.08, "sawtooth", 0.12);
  setTimeout(()=> playBeep(1200, 0.05, "square", 0.06), 80);
}

/* win sound */
function playWin(){
  playBeep(1000, 0.09, "triangle", 0.10);
  setTimeout(()=> playBeep(1400, 0.14, "sine", 0.12), 90);
}


//TODO: Timer functions
function updateTimerDisplay(){
  const minutes = String(Math.floor(totalSeconds/60)).padStart(2,'0');
  const seconds = String(totalSeconds % 60).padStart(2,'0');
  timerEl.textContent = `Time: ${minutes}:${seconds}`;
}

function startTimer(){
  if (timeStarted) return;
  timeStarted = true;
  timer = setInterval(()=>{
    totalSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer(){
  if (timer) clearInterval(timer);
  timer = null;
  timeStarted = false;
}


//TODO: Freezing time
function freezeTimer(seconds){
  if (!timeStarted && totalSeconds===0){
    // If timer never started, still show freeze message but do nothing
  }
  stopTimer(); 
  const banner = document.createElement("div");
  banner.className = "freeze-banner";
  banner.textContent = `Timer frozen for ${seconds} seconds`;
  banner.style.color = "#ffcc00";
  banner.style.marginBottom = "10px";
  document.querySelector(".main-container").prepend(banner);

  setTimeout(() => {
    banner.remove();
    startTimer();
  }, seconds * 1000);
}


//TASK: Initialization
function initBoard(){
  gameBoard.innerHTML = "";
  flippedCards = [];
  lockBoard = false;
  totalSeconds = 0;
  updateTimerDisplay();
  stopTimer();

  revealUsed = false;
  freezeUsed = false;
  revealBtn.disabled = false;
  freezeBtn.disabled = false;

  // shuffle cards
  cards = [...emojis, ...emojis];
  cards.sort(()=> Math.random() - 0.5);

  cards.forEach((emoji, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.emoji = emoji;

    const inner = document.createElement("div");
    inner.className = "card-inner";

    const back = document.createElement("div");
    back.className = "card-face card-back";
    back.textContent = "█ ░"; 

    const front = document.createElement("div");
    front.className = "card-face card-front";
    front.textContent = emoji;

    inner.appendChild(back);
    inner.appendChild(front);
    card.appendChild(inner);

    card.addEventListener("click", flipCard);
    gameBoard.appendChild(card);
  });

  loadBestScore(); 
}

//TODO: Core Logic
function flipCard(e){
  const card = e.currentTarget;
  if (!timeStarted) {
    // many browsers require user gesture to resume audio context; we'll call here on first click
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(()=>{});
    }
  }

  // start background music on first interaction if musicToggle indicates on
  if (musicToggle.dataset.playing === "yes" && !musicRunning) {
    startBackgroundMusic();
  }

  if (lockBoard) return;
  if (card.classList.contains("matched") || card.classList.contains("flipped")) return;
  if (!timeStarted) startTimer();

  // flip
  card.classList.add("flipped");
  playBeep(700, 0.04, "square", 0.09);
  flippedCards.push(card);

  if (flippedCards.length === 2){
    const [c1, c2] = flippedCards;
    if (c1.dataset.emoji === c2.dataset.emoji){
      // matched
      c1.classList.add("matched");
      c2.classList.add("matched");
      flippedCards = [];
      playMatch();
      checkWin();
    } else {
      lockBoard = true;
      setTimeout(()=>{
        flippedCards.forEach(c => c.classList.remove("flipped"));
        flippedCards = [];
        lockBoard = false;
      }, 900);
    }
  }
}

// TODO: check if all matched 
function checkWin(){
  const matched = document.querySelectorAll(".card.matched").length;
  if (matched === cards.length){
    // game complete
    stopTimer();
    playWin();

    const finalTime = formatTime(totalSeconds);

    // store history
    const gamesPlayed = JSON.parse(localStorage.getItem("gamesPlayed") || "[]");
    gamesPlayed.push(finalTime);
    localStorage.setItem("gamesPlayed", JSON.stringify(gamesPlayed));

    // update best time
    const best = localStorage.getItem("bestTime");
    if (!best || totalSeconds < convertTimeToSeconds(best)){
      localStorage.setItem("bestTime", finalTime);
      bestScoreEl.textContent = `Best Time: ${finalTime}`;
      setTimeout(()=> alert(`Congrats! New Best Time: ${finalTime}`), 200);
    } else {
      setTimeout(()=> alert(`Congrats! You completed the game in ${finalTime}`), 200);
    }
  }
}


//TASK: utilities
function formatTime(total){
  const m = String(Math.floor(total/60)).padStart(2,'0');
  const s = String(total % 60).padStart(2,'0');
  return `${m}:${s}`;
}
function convertTimeToSeconds(time){
  const [m,s] = time.split(":").map(Number);
  return m*60 + s;
}

function revealAllCards(){
  if (revealUsed) return;
  revealUsed = true;
  revealBtn.disabled = true;

  const all = document.querySelectorAll(".card");
  all.forEach(c => { if (!c.classList.contains("matched")) c.classList.add("flipped"); });
  setTimeout(()=>{
    all.forEach(c => { if (!c.classList.contains("matched")) c.classList.remove("flipped"); });
  }, 3000);
}

function loadBestScore(){
  const best = localStorage.getItem("bestTime");
  if (best) bestScoreEl.textContent = `Best Time: ${best}`;
  else bestScoreEl.textContent = `Best Time: --:--`;
}

scoreBtn.addEventListener("click", () => {
  const best = localStorage.getItem("bestTime") || "--:--";
  modalBestScoreEl.textContent = `Best Time: ${best}`;

  gamesListEl.innerHTML = "";
  const gamesPlayed = JSON.parse(localStorage.getItem("gamesPlayed") || "[]");
  if (gamesPlayed.length === 0){
    const li = document.createElement("li");
    li.className = "list-group-item";
    li.textContent = "No games yet";
    gamesListEl.appendChild(li);
  } else {
    gamesPlayed.forEach((t,i) => {
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.textContent = `Game ${i+1}: ${t}`;
      gamesListEl.appendChild(li);
    });
  }

  const scoreModal = new bootstrap.Modal(document.getElementById("scoreModal"));
  scoreModal.show();
});

document.getElementById("clearHistoryBtn").addEventListener("click", ()=>{
  if (!confirm("Clear all saved games and best time?")) return;
  localStorage.removeItem("gamesPlayed");
  localStorage.removeItem("bestTime");
  loadBestScore();
  gamesListEl.innerHTML = "";
});


//TASK: Listeners
resetBtn.addEventListener("click", initBoard);
revealBtn.addEventListener("click", revealAllCards);
freezeBtn.addEventListener("click", ()=>{
  if (freezeUsed) return;
  freezeUsed = true;
  freezeBtn.disabled = true;
  freezeTimer(5);
});

themeToggle.addEventListener("click", ()=>{
  document.body.classList.toggle("light-theme");
});

/* Music toggle (starts / stops background) */
musicToggle.dataset.playing = "no";
musicToggle.addEventListener("click", ()=>{
  // resume audio context on user gesture
  ensureAudioContext();
  if (musicToggle.dataset.playing === "no"){
    // start music
    musicToggle.dataset.playing = "yes";
    musicToggle.textContent = "MUSIC: ON";
    startBackgroundMusic();
  } else {
    // stop music
    musicToggle.dataset.playing = "no";
    musicToggle.textContent = "MUSIC";
    stopBackgroundMusic();
  }
});

/* On first interaction resume audio context (browsers require) */
document.addEventListener('click', function resumeAudio(){
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(()=>{});
  }
  // remove after first user gesture to be clean
  document.removeEventListener('click', resumeAudio);
});

/* initialize board on load */
window.addEventListener("DOMContentLoaded", () => {
  initBoard();
});
