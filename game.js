'use strict';

// ===== AUDIO =====
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx = null;
function ensureAudio() {
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
}
function playTone(freq, type, dur, vol = 0.3, delay = 0) {
  ensureAudio();
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
  osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + dur);
}
function playHeartbeat(fast = false) {
  const t = fast ? 0.08 : 0.12;
  playTone(60,'sine',t,0.4); playTone(55,'sine',t,0.35,fast?0.12:0.18);
}
function playAmbient() {
  for (let i = 0; i < 5; i++) playTone(40 + Math.random()*60,'sawtooth',2+Math.random()*2,0.03+Math.random()*0.04,i*0.9);
}
function playScare() {
  playTone(800,'sawtooth',0.05,0.9); playTone(600,'square',0.08,0.8,0.04);
  playTone(400,'sawtooth',0.12,0.7,0.08); playTone(200,'sine',0.3,0.5,0.15);
}
function playCreak() {
  ensureAudio();
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 1.4);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
  osc.start(); osc.stop(ctx.currentTime + 1.4);
}
function playWhisper() {
  for (let i = 0; i < 8; i++) playTone(150+Math.random()*100,'sine',0.07,0.05,i*0.11);
}
function playFootstep() {
  playTone(80,'sine',0.06,0.25); playTone(70,'sine',0.06,0.2,0.08);
}
function playLock() {
  playTone(320,'square',0.08,0.3); playTone(280,'square',0.1,0.25,0.08); playTone(200,'sine',0.2,0.2,0.16);
}
function playSuccess() {
  playTone(440,'sine',0.2,0.2); playTone(550,'sine',0.2,0.2,0.2); playTone(660,'sine',0.4,0.2,0.4);
}

// ===== SCENE BACKGROUNDS =====
const sceneStyles = {
  bedroom: 'linear-gradient(to bottom,#0a0510 0%,#1a0a1a 40%,#0d0505 100%)',
  hallway: 'linear-gradient(to bottom,#050505 0%,#0f0808 60%,#050303 100%)',
  basement: 'linear-gradient(180deg,#020202 0%,#050a05 50%,#020202 100%)',
  attic:   'linear-gradient(to bottom,#080505 0%,#120808 50%,#060303 100%)',
  cellar:  'linear-gradient(180deg,#030303 0%,#0a0505 100%)',
  forest:  'linear-gradient(to bottom,#020802 0%,#051005 60%,#020502 100%)',
  escape:  'linear-gradient(to bottom,#050510 0%,#0a0a20 100%)',
};

// ===== ROOM MAP =====
// Each room: name, bg, chapter, base description, exits, hideSpots, hasKey (set at runtime)
const ROOMS = {
  bedroom: {
    name: 'Schlafzimmer', bg: 'bedroom', chapter: 'Kapitel I — Das Erwachen',
    baseDesc: 'Ein verrottetes Zimmer. Das Bett, aus dem du aufwachst, knarrt. Das Fenster ist vergittert. Zeitungsartikel bedecken die Wand — alle vom heutigen Datum.',
    exits: [{ to:'hallway', door:'door_bed_hall', label:'Flur' }],
    hideSpots: ['Unter dem Bett','Im alten Kleiderschrank'],
  },
  hallway: {
    name: 'Flur', bg: 'hallway', chapter: 'Kapitel I — Das Erwachen',
    baseDesc: 'Ein langer, dunkler Flur. Links: die Kellertreppe. Rechts: eine schwere Tür mit rotem Handabdruck. Der Flur ist lang — am Ende bewegt sich etwas.',
    exits: [
      { to:'bedroom',  door:'door_bed_hall',  label:'Schlafzimmer' },
      { to:'red_room', door:'door_red_hall',  label:'Rotes Zimmer' },
      { to:'basement', door:'door_basement',  label:'Kellertreppe hinunter' },
    ],
    hideSpots: ['Hinter dem Vorhang','In der dunklen Nische'],
  },
  red_room: {
    name: 'Rotes Zimmer', bg: 'attic', chapter: 'Kapitel II — Das Zimmer',
    baseDesc: 'Zeitungsausschnitte bedecken alle Wände. Eine Spieluhr dreht sich alleine. Eine kindliche Figur sitzt auf einem Stuhl und starrt.',
    exits: [{ to:'hallway', door:'door_red_hall', label:'Flur' }],
    hideSpots: ['Hinter dem alten Stuhl','Unter dem Tisch'],
  },
  basement: {
    name: 'Keller', bg: 'basement', chapter: 'Kapitel III — Die Tiefe',
    baseDesc: 'Feuchte Luft, Erde und etwas Süßliches. Ganz hinten: ein rötliches Leuchten aus einer Ritze in der Wand.',
    exits: [
      { to:'hallway', door:'door_basement', label:'Treppe hoch (Flur)' },
      { to:'cellar',  door:null,            label:'Geheimer Raum (durch die Ritze)' },
    ],
    hideSpots: ['Hinter den alten Fässern','Im Dunkeln an der Wand'],
  },
  cellar: {
    name: 'Geheimer Raum', bg: 'cellar', chapter: 'Kapitel IV — Der Ausgang',
    baseDesc: 'Ein kleiner Raum hinter der Wand. Knochen-Altar. Flackerndes Licht. Eine massive Holztür mit einem Schloss — das ist der Ausgang.',
    exits: [{ to:'basement', door:null, label:'Zurück zum Keller' }],
    hideSpots: ['Hinter dem Altar'],
  },
};

// Doors that can be locked: roomA ↔ roomB
const DOOR_DEFS = {
  door_bed_hall:  { label:'Schlafzimmertür', grenniCost:30 },
  door_red_hall:  { label:'Rote Tür',        grenniCost:28 },
  door_basement:  { label:'Kellertür',        grenniCost:35 },
};

// ===== GAME STATE =====
let state = {};
function freshState() {
  const keyRooms = ['bedroom','hallway','red_room','basement'];
  return {
    roomId: 'bedroom',
    health: 100,
    sanity: 100,
    stamina: 100,
    grenni: 5,
    hasKey: false,
    keyRoom: keyRooms[Math.floor(Math.random() * keyRooms.length)],
    lockedDoors: new Set(),
    isHiding: false,
    escapeDoorOpen: false,
    turn: 0,
    flags: {},
  };
}

// ===== DOM =====
const screens = {
  intro:     document.getElementById('screen-intro'),
  game:      document.getElementById('screen-game'),
  jumpscare: document.getElementById('screen-jumpscare'),
  death:     document.getElementById('screen-death'),
  win:       document.getElementById('screen-win'),
};
const storyText       = document.getElementById('story-text');
const typingCursor    = document.getElementById('typing-cursor');
const choicesBox      = document.getElementById('choices-box');
const heartBar        = document.getElementById('heart-bar');
const staminaBar      = document.getElementById('stamina-bar');
const sanityVal       = document.getElementById('sanity-val');
const chapterText     = document.getElementById('chapter-text');
const roomNameEl      = document.getElementById('room-name');
const sceneImageEl    = document.getElementById('scene-image');
const keyIndicator    = document.getElementById('key-indicator');
const hidingOverlay   = document.getElementById('hiding-overlay');
const grenniDots      = [1,2,3,4,5].map(i => document.getElementById('gdot-'+i));
const grenniStatusEl  = document.getElementById('grenni-status-text');
const deathMsg        = document.getElementById('death-msg');
const jumpscareImg    = document.getElementById('jumpscare-img');
const heartIcon       = document.getElementById('heart-icon');

// ===== SCREEN MANAGER =====
function showScreen(name) {
  Object.values(screens).forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
  screens[name].style.display = 'flex';
  screens[name].classList.add('active');
}

// ===== TYPING =====
let typingTimer = null;
function typeText(text, cb) {
  if (typingTimer) clearTimeout(typingTimer);
  storyText.textContent = '';
  typingCursor.style.display = 'inline';
  let i = 0;
  const speed = text.length > 180 ? 20 : 28;
  function next() {
    if (i < text.length) {
      storyText.textContent += text[i++];
      typingTimer = setTimeout(next, speed);
    } else {
      typingCursor.style.display = 'none';
      if (cb) cb();
    }
  }
  next();
}

// ===== GRENNI LEVEL =====
function grenLevel() {
  if (state.grenni < 20) return 0;
  if (state.grenni < 40) return 1;
  if (state.grenni < 60) return 2;
  if (state.grenni < 76) return 3;
  if (state.grenni < 90) return 4;
  return 5;
}
const grenniMessages = [
  'Still…',
  'Du hörst etwas…',
  'Schritte im Haus',
  'Es ist nah',
  'ES KOMMT',
  'GRENNI IST DA!'
];
function updateGrenni() {
  const lvl = grenLevel();
  grenniDots.forEach((d, i) => {
    d.className = 'gdot';
    if (i < lvl) d.classList.add('lit-' + (i + 1));
  });
  grenniStatusEl.className = '';
  if (lvl >= 4) grenniStatusEl.classList.add('level-' + lvl);
  grenniStatusEl.textContent = grenniMessages[lvl];
}

// ===== STATUS UPDATE =====
function updateStatus() {
  // Health
  heartBar.style.width = state.health + '%';
  if (state.health < 30) { heartBar.style.background = '#ff0000'; heartIcon.style.animationDuration = '0.35s'; }
  else if (state.health < 60) { heartBar.style.background = '#aa0000'; heartIcon.style.animationDuration = '0.6s'; }
  else { heartBar.style.background = 'var(--blood)'; heartIcon.style.animationDuration = '1s'; }

  // Stamina
  staminaBar.style.width = state.stamina + '%';
  if (state.stamina < 25) staminaBar.style.background = '#4a1a00';
  else if (state.stamina < 50) staminaBar.style.background = '#5a5a00';
  else staminaBar.style.background = 'var(--stamina-color)';

  // Sanity
  sanityVal.textContent = state.sanity;
  if (state.sanity < 30) {
    sanityVal.style.color = '#ff4400';
    if (!sanityInterval) startInsanity();
  } else {
    sanityVal.style.color = '#c8b89a';
  }

  // Key
  if (state.hasKey) keyIndicator.classList.remove('hidden');
  else keyIndicator.classList.add('hidden');

  // Hiding
  if (state.isHiding) hidingOverlay.classList.add('active');
  else hidingOverlay.classList.remove('active');

  updateGrenni();
}

// ===== INSANITY =====
let sanityInterval = null;
function startInsanity() {
  sanityInterval = setInterval(() => {
    if (state.sanity >= 30) { clearInterval(sanityInterval); sanityInterval = null; return; }
    if (Math.random() < 0.2) {
      document.body.style.transform = `rotate(${(Math.random()-0.5)*3}deg)`;
      setTimeout(() => { document.body.style.transform = ''; }, 250);
    }
  }, 2500);
}

// ===== JUMPSCARE =====
function triggerJumpscare(onDone) {
  playScare();
  const cvs = document.createElement('canvas');
  cvs.width = 400; cvs.height = 400;
  const c = cvs.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0,0,400,400);
  // Face
  c.beginPath(); c.arc(200,200,160,0,Math.PI*2); c.fillStyle = '#110000'; c.fill();
  // Eye sockets
  c.fillStyle = '#000';
  c.beginPath(); c.ellipse(140,160,38,48,0,0,Math.PI*2); c.fill();
  c.beginPath(); c.ellipse(260,160,38,48,0,0,Math.PI*2); c.fill();
  // White eyes
  c.fillStyle = '#ddd';
  c.beginPath(); c.ellipse(140,162,28,36,0,0,Math.PI*2); c.fill();
  c.beginPath(); c.ellipse(260,162,28,36,0,0,Math.PI*2); c.fill();
  // Red irises
  c.fillStyle = '#880000';
  c.beginPath(); c.arc(140,164,18,0,Math.PI*2); c.fill();
  c.beginPath(); c.arc(260,164,18,0,Math.PI*2); c.fill();
  // Pupils
  c.fillStyle = '#000';
  c.beginPath(); c.arc(140,164,10,0,Math.PI*2); c.fill();
  c.beginPath(); c.arc(260,164,10,0,Math.PI*2); c.fill();
  // Glint
  c.fillStyle = 'rgba(255,100,0,0.7)'; c.beginPath(); c.arc(134,157,5,0,Math.PI*2); c.fill();
  c.beginPath(); c.arc(254,157,5,0,Math.PI*2); c.fill();
  // Mouth
  c.strokeStyle = '#cc0000'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(100,285); c.bezierCurveTo(150,345,250,345,300,285); c.stroke();
  // Teeth
  c.fillStyle = '#d8d0c0';
  for (let t = 0; t < 6; t++) c.fillRect(125+t*26,287,20,32);
  // Cracks
  c.strokeStyle = '#660000'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(135,120); c.lineTo(128,95); c.lineTo(120,102); c.stroke();
  c.beginPath(); c.moveTo(265,118); c.lineTo(272,90); c.lineTo(283,98); c.stroke();

  jumpscareImg.style.cssText = `background:#000 url(${cvs.toDataURL()}) center/contain no-repeat`;
  showScreen('jumpscare');
  document.body.classList.add('shake');
  setTimeout(() => {
    document.body.classList.remove('shake');
    showScreen('game');
    if (onDone) onDone();
  }, 750);
}

// ===== GRENNI TICK =====
// Called after each player action. delta = how much to change grenni proximity.
// Locked doors between player and Grenni reduce the effect.
function grenniTick(delta) {
  // Locked doors reduce Grenni approach
  const room = ROOMS[state.roomId];
  let doorBonus = 0;
  room.exits.forEach(ex => {
    if (ex.door && state.lockedDoors.has(ex.door)) doorBonus += 12;
  });
  const actual = delta > 0 ? Math.max(0, delta - doorBonus) : delta;
  state.grenni = Math.max(0, Math.min(100, state.grenni + actual));

  // Random atmospheric events
  if (Math.random() < 0.15) {
    const roll = Math.random();
    if (roll < 0.4) setTimeout(playCreak, 1200);
    else if (roll < 0.7) setTimeout(playWhisper, 800);
    else setTimeout(() => playHeartbeat(state.grenni > 60), 500);
  }

  // Attack if threshold
  if (state.grenni >= 90) {
    grenniAttack();
  }
}

function grenniAttack() {
  state.health  = Math.max(0, state.health - 28);
  state.sanity  = Math.max(0, state.sanity - 22);
  state.grenni  = 30; // lost you after attack
  state.isHiding = false;
  updateStatus();

  triggerJumpscare(() => {
    if (state.health <= 0) { showDeath('Grenni hat dich gefunden. Es gab kein Entkommen.'); return; }
    if (state.sanity <= 0) { showDeath('Grennis Blick zerbrach deinen Verstand. Du bliebst für immer.'); return; }
    renderRoom();
  });
}

// ===== ROOM DESCRIPTION =====
function buildRoomDesc(roomId) {
  const room = ROOMS[roomId];
  let desc = room.baseDesc;

  // Key hint
  if (state.keyRoom === roomId && !state.hasKey) {
    const hints = {
      bedroom: ' Etwas Metallisches glitzert unter dem Bett.',
      hallway: ' Ein alter Schlüssel hängt an einem Nagel an der Wand.',
      red_room: ' Unter dem Spielzeug liegt etwas Metallisches.',
      basement: ' Zwischen alten Kisten — ein schwaches Glitzern.',
    };
    desc += (hints[roomId] || '');
  }

  // Locked doors note
  room.exits.forEach(ex => {
    if (ex.door && state.lockedDoors.has(ex.door)) {
      desc += ` Die ${DOOR_DEFS[ex.door].label} ist abgeschlossen.`;
    }
  });

  // Cellar escape door
  if (roomId === 'cellar') {
    desc += state.hasKey
      ? ' Du hast den Schlüssel — die Ausgangstür kann geöffnet werden.'
      : ' Die Ausgangstür ist verschlossen. Du brauchst den Schlüssel.';
  }

  // Hiding
  if (state.isHiding) desc = '(Versteckt) Du regst dich nicht. Du hörst Grennies Schritte... Sie kommen näher. Dann entfernen sie sich wieder. Du atmest nicht.';

  return desc;
}

// ===== RENDER ROOM =====
function renderRoom() {
  const room = ROOMS[state.roomId];
  chapterText.textContent = room.chapter;
  roomNameEl.textContent  = room.name;
  sceneImageEl.style.background = sceneStyles[room.bg] || sceneStyles.bedroom;
  updateStatus();

  choicesBox.innerHTML = '';
  const desc = buildRoomDesc(state.roomId);

  typeText(desc, () => buildActions());
}

// ===== BUILD ACTIONS =====
function buildActions() {
  choicesBox.innerHTML = '';
  const room = ROOMS[state.roomId];

  // --- MOVEMENT ---
  const movLabel = document.createElement('div');
  movLabel.className = 'action-group-label';
  movLabel.textContent = 'Bewegen';
  choicesBox.appendChild(movLabel);

  const moveGroup = document.createElement('div');
  moveGroup.className = 'action-group';

  room.exits.forEach(exit => {
    if (!ROOMS[exit.to]) return;

    // Walk quietly
    const btnWalk = makeBtn(`🚶 Schleichen → ${exit.label}`, 'walk', () => doWalk(exit));
    moveGroup.appendChild(btnWalk);

    // Run (loud, costs stamina)
    const btnRun = makeBtn(`🏃 Rennen → ${exit.label}`, 'run', () => doRun(exit));
    if (state.stamina < 20) btnRun.disabled = true;
    moveGroup.appendChild(btnRun);
  });
  choicesBox.appendChild(moveGroup);

  // --- HIDE ---
  if (room.hideSpots.length > 0 && !state.isHiding) {
    const hideLabel = document.createElement('div');
    hideLabel.className = 'action-group-label';
    hideLabel.textContent = 'Verstecken';
    choicesBox.appendChild(hideLabel);

    const hideGroup = document.createElement('div');
    hideGroup.className = 'action-group';

    room.hideSpots.forEach(spot => {
      const btn = makeBtn(`🙈 Verstecken: ${spot}`, 'hide', () => doHide(spot));
      hideGroup.appendChild(btn);
    });
    choicesBox.appendChild(hideGroup);
  }

  if (state.isHiding) {
    const unHideLabel = document.createElement('div');
    unHideLabel.className = 'action-group-label';
    unHideLabel.textContent = 'Versteckt';
    choicesBox.appendChild(unHideLabel);
    const unhideGroup = document.createElement('div');
    unhideGroup.className = 'action-group';
    unhideGroup.appendChild(makeBtn('👀 Hervorkriechen', 'hide', () => doUnhide()));
    choicesBox.appendChild(unhideGroup);
  }

  // --- LOCK DOOR ---
  const lockable = room.exits.filter(ex => ex.door && !state.lockedDoors.has(ex.door) && DOOR_DEFS[ex.door]);
  if (lockable.length > 0 && state.hasKey) {
    const lockLabel = document.createElement('div');
    lockLabel.className = 'action-group-label';
    lockLabel.textContent = 'Tür abschließen';
    choicesBox.appendChild(lockLabel);

    const lockGroup = document.createElement('div');
    lockGroup.className = 'action-group';
    lockable.forEach(ex => {
      lockGroup.appendChild(makeBtn(`🔒 ${DOOR_DEFS[ex.door].label} abschließen`, 'lock', () => doLockDoor(ex.door)));
    });
    choicesBox.appendChild(lockGroup);
  }

  // --- TAKE KEY ---
  if (state.keyRoom === state.roomId && !state.hasKey) {
    const keyLabel = document.createElement('div');
    keyLabel.className = 'action-group-label';
    keyLabel.textContent = 'Gegenstand';
    choicesBox.appendChild(keyLabel);
    const keyGroup = document.createElement('div');
    keyGroup.className = 'action-group';
    keyGroup.appendChild(makeBtn('🗝️ Schlüssel nehmen', 'special', () => doTakeKey()));
    choicesBox.appendChild(keyGroup);
  }

  // --- SEARCH ROOM ---
  const searchLabel = document.createElement('div');
  searchLabel.className = 'action-group-label';
  searchLabel.textContent = 'Erkunden (macht Geräusche)';
  choicesBox.appendChild(searchLabel);
  const searchGroup = document.createElement('div');
  searchGroup.className = 'action-group';
  searchGroup.appendChild(makeBtn('🔍 Raum durchsuchen', 'search', () => doSearch()));
  choicesBox.appendChild(searchGroup);

  // --- ESCAPE DOOR (cellar only) ---
  if (state.roomId === 'cellar' && state.hasKey) {
    const escLabel = document.createElement('div');
    escLabel.className = 'action-group-label';
    escLabel.textContent = 'Flucht';
    choicesBox.appendChild(escLabel);
    const escGroup = document.createElement('div');
    escGroup.className = 'action-group';
    escGroup.appendChild(makeBtn('🚪 Ausgangstür aufschließen und fliehen!', 'special', () => doEscape()));
    choicesBox.appendChild(escGroup);
  }
}

function makeBtn(label, type, onClick) {
  const btn = document.createElement('button');
  btn.className = `choice-btn type-${type}`;
  btn.textContent = label;
  btn.addEventListener('click', () => { ensureAudio(); onClick(); });
  return btn;
}

// ===== PLAYER ACTIONS =====

function doWalk(exit) {
  state.isHiding = false;
  state.roomId = exit.to;
  state.stamina = Math.min(100, state.stamina + 5);
  grenniTick(8);
  state.turn++;
  playFootstep();
  renderRoom();
}

function doRun(exit) {
  if (state.stamina < 20) return;
  state.isHiding = false;
  state.roomId = exit.to;
  state.stamina = Math.max(0, state.stamina - 28);
  grenniTick(22); // loud!
  state.turn++;
  playFootstep(); setTimeout(playFootstep, 120); setTimeout(playFootstep, 240);
  typeText(`Du rennst durch ${ROOMS[exit.to].name}! Deine Schritte hallen laut!`, () => renderRoom());
}

function doHide(spot) {
  state.isHiding = true;
  state.stamina = Math.min(100, state.stamina + 35);
  grenniTick(-20);
  state.sanity = Math.max(0, state.sanity - 5);
  state.turn++;
  updateStatus();
  typeText(`Du pressst dich ${spot}. Reglos. Kaum atmend. Die Dunkelheit umhüllt dich vollständig.`, () => buildActions());
}

function doUnhide() {
  state.isHiding = false;
  grenniTick(5);
  state.turn++;
  updateStatus();
  renderRoom();
}

function doLockDoor(doorId) {
  state.lockedDoors.add(doorId);
  const cost = DOOR_DEFS[doorId].grenniCost;
  grenniTick(-cost);
  state.turn++;
  playLock();
  typeText(`Das Schloss rastet ein. ${DOOR_DEFS[doorId].label} ist verriegelt. Grenni kann nicht sofort folgen.`, () => {
    updateStatus();
    buildActions();
  });
}

function doTakeKey() {
  state.hasKey = true;
  grenniTick(3);
  state.turn++;
  playSuccess();
  typeText('Deine zitternden Finger schließen sich um den kalten Metall-Schlüssel. Du hast ihn. Jetzt musst du den Ausgang finden.', () => {
    updateStatus();
    buildActions();
  });
}

function doSearch() {
  grenniTick(12); // searching takes time and makes noise
  state.turn++;
  updateStatus();

  const roomSearchTexts = {
    bedroom:  [
      'Du durchsuchst die Schubladen. Leere Glasflaschen, zerissene Fotos — dein Gesicht darauf, aber älter, verzerrt. Kein Schlüssel hier.',
      'Unter der Matratze: ein Tagebuch. Die letzten Einträge sind unleserlich — zu schnell geschrieben, als hätte die Person Angst gehabt.',
      'Die Wanduhr ist stehen geblieben. Um 3:47 Uhr. Heute Nacht.',
    ],
    hallway: [
      'Du untersuchst die Wände. Überall Kratzspuren — auf Augenhöhe. Zu viele, als ob jemand gezählt hätte.',
      'Am Ende des Flurs — ein Spiegel. Dein Spiegelbild bewegt sich eine Sekunde zu spät.',
      'Unter dem Fußboden knarrt es rhythmisch. Wie Atemzüge.',
    ],
    red_room: [
      'Die Zeitungsartikel berichten alle dasselbe: "Grenni schläft nicht". Alle haben das heutige Datum.',
      'Das Kinderspielzeug ist eine Spieluhr. Die Melodie erinnert dich an etwas — aber du weißt nicht woran.',
      'Der Stuhl, auf dem die Figur saß, ist jetzt leer. Du hast nicht gesehen, wann sie verschwand.',
    ],
    basement: [
      'Du tastest in der Dunkelheit. Alte Kisten, vermoderte Kleidung. Dann — etwas Warmes. Die Wand atmet.',
      'In einer alten Kiste: Fotos. Von einem Kind. Das Kind lächelt nicht.',
      'Das Rauschen aus der Ritze in der Wand wird lauter, wenn du dich näherst. Als wäre dahinter Leben.',
    ],
    cellar: [
      'Der Altar besteht aus Knochen und Holz. In der Mitte eine Vertiefung — genau groß genug für einen Schlüssel.',
      'An der Decke: Symbole, in den Stein geritzt. Auge. Herz. Mund. Wieder Auge.',
      'Du findest eine zerknitterte Notiz: "Der Schlüssel ist nicht hier. Er ist da, wo alles begann."',
    ],
  };

  const texts = roomSearchTexts[state.roomId] || ['Du durchsuchst den Raum. Nichts Besonderes.'];
  const text = texts[state.turn % texts.length];
  typeText(text, () => buildActions());
}

function doEscape() {
  if (!state.hasKey) return;
  grenniTick(5);
  playSuccess();
  typeText(
    'Das Schloss öffnet sich. Dahinter — ein Tunnel aus Erde und Wurzeln. Du kriechst hindurch. Deine Hände zittern. Dann: Licht. Kaltes, graues Licht. Du bist draußen.',
    () => {
      setTimeout(() => {
        typeText('Du läufst. Du rennst. Der Nebel liegt schwer. Dann — eine Straße. Ein Auto. Es hält. Du steigst ein. Der Fahrer dreht sich um. Leere, weiße Augen. "Wohin darf ich Sie bringen?" Du erkennst das Haus hinter ihm. Grenni schläft nicht.',
        () => {
          setTimeout(() => showScreen('win'), 3000);
        });
      }, 2500);
    }
  );
}

// ===== DEATH / WIN =====
function showDeath(msg) {
  deathMsg.textContent = msg;
  showScreen('death');
  setTimeout(playAmbient, 300);
}

// ===== RESTART =====
function restartGame() {
  if (sanityInterval) { clearInterval(sanityInterval); sanityInterval = null; }
  state = freshState();
  showScreen('game');
  sceneImageEl.style.background = sceneStyles.bedroom;
  playAmbient();
  typeText(
    'Du öffnest die Augen. Dunkelheit. Das Bett unter dir knarrt. Irgendwo im Haus — ein Geräusch.',
    () => renderRoom()
  );
}

// ===== INIT =====
document.getElementById('btn-start').addEventListener('click', () => {
  ensureAudio();
  state = freshState();
  showScreen('game');
  playAmbient();
  typeText(
    'Du öffnest die Augen. Dunkelheit. Das Bett unter dir knarrt. Irgendwo im Haus — ein Geräusch. Grenni schläft nicht.',
    () => renderRoom()
  );
});
