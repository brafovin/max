'use strict';

// ===== AUDIO ENGINE =====
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;
function ensureAudio() {
  if (!actx) actx = new AudioCtx();
  if (actx.state === 'suspended') actx.resume();
}
function playTone(freq, type, dur, vol = 0.3, delay = 0) {
  ensureAudio();
  const osc = actx.createOscillator(), gain = actx.createGain();
  osc.connect(gain); gain.connect(actx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, actx.currentTime + delay);
  gain.gain.setValueAtTime(vol, actx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + delay + dur);
  osc.start(actx.currentTime + delay);
  osc.stop(actx.currentTime + delay + dur);
}
function playHeartbeat(fast) { const t = fast?0.08:0.12; playTone(60,'sine',t,0.4); playTone(55,'sine',t,0.35,fast?0.12:0.18); }
function playAmbient() { for(let i=0;i<5;i++) playTone(40+Math.random()*60,'sawtooth',2+Math.random()*2,0.03+Math.random()*0.04,i*0.9); }
function playScare() { playTone(800,'sawtooth',0.05,0.9); playTone(600,'square',0.08,0.8,0.04); playTone(400,'sawtooth',0.12,0.7,0.08); playTone(200,'sine',0.3,0.5,0.15); }
function playFootstep() { playTone(80,'sine',0.04,0.12); playTone(70,'sine',0.04,0.08,0.05); }
function playLock() { playTone(320,'square',0.08,0.3); playTone(280,'square',0.1,0.25,0.08); playTone(200,'sine',0.2,0.2,0.16); }
function playPickup() { playTone(440,'sine',0.08,0.2); playTone(660,'sine',0.12,0.2,0.06); playTone(880,'sine',0.16,0.2,0.14); }
function playSuccess() { playTone(440,'sine',0.2,0.2); playTone(550,'sine',0.2,0.2,0.2); playTone(660,'sine',0.4,0.2,0.4); }
function playWhisper() { for(let i=0;i<6;i++) playTone(150+Math.random()*100,'sine',0.06,0.04,i*0.1); }
function playGrowl() {
  ensureAudio();
  const osc = actx.createOscillator(), gain = actx.createGain();
  osc.connect(gain); gain.connect(actx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(70, actx.currentTime);
  osc.frequency.linearRampToValueAtTime(40, actx.currentTime + 1.2);
  gain.gain.setValueAtTime(0.18, actx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 1.2);
  osc.start(); osc.stop(actx.currentTime + 1.2);
}

// ===== CONSTANTS =====
const W = 800, H = 560;
const PR = 11;            // player radius
const GR = 14;            // grenni radius
const PSPEED = 130;
const PRUN = 230;
const GSPEED_WANDER = 50;
const GSPEED_CHASE = 100;

// ===== ROOM DEFINITIONS =====
const ROOMS = {
  bedroom: {
    name: 'Schlafzimmer',
    chapter: 'Kapitel I — Das Erwachen',
    bgColor: '#0a0510',
    floorColor: '#160a18',
    walls: [
      {x:0, y:0, w:800, h:30}, {x:0, y:530, w:800, h:30},
      {x:0, y:0, w:30, h:560},
      {x:770, y:0, w:30, h:240}, {x:770, y:320, w:30, h:240},
    ],
    furniture: [
      { type:'bed',      x:60,  y:80,  w:200, h:130, label:'Bett' },
      { type:'wardrobe', x:560, y:60,  w:140, h:160, label:'Schrank' },
      { type:'table',    x:380, y:430, w:90,  h:60,  label:'Tisch' },
    ],
    hideSpots: [
      { x:60,  y:80,  w:200, h:130, label:'Unter dem Bett',     spotName:'Bett',     px:160, py:200 },
      { x:560, y:60,  w:140, h:160, label:'Im alten Kleiderschrank', spotName:'Schrank', px:630, py:140 },
    ],
    doors: [
      { rect:{x:770, y:240, w:30, h:80}, to:'hallway', spawn:{x:60, y:280}, id:'door_bed_hall', label:'Schlafzimmertür' },
    ],
    spawnPoint: { x: 400, y: 300 },
  },

  hallway: {
    name: 'Flur',
    chapter: 'Kapitel I — Das Erwachen',
    bgColor: '#050505',
    floorColor: '#100808',
    walls: [
      {x:0, y:0, w:180, h:30}, {x:260, y:0, w:540, h:30},
      {x:0, y:530, w:540, h:30}, {x:620, y:530, w:180, h:30},
      {x:0, y:0, w:30, h:240}, {x:0, y:320, w:30, h:240},
      {x:770, y:0, w:30, h:560},
    ],
    furniture: [
      { type:'curtain', x:680, y:60,  w:60, h:90, label:'Vorhang' },
      { type:'curtain', x:60,  y:430, w:50, h:80, label:'Vorhang' },
    ],
    hideSpots: [
      { x:680, y:60,  w:60, h:90, label:'Hinter dem Vorhang', spotName:'Vorhang', px:710, py:105 },
      { x:60,  y:430, w:50, h:80, label:'In der dunklen Nische', spotName:'Nische', px:85,  py:470 },
    ],
    doors: [
      { rect:{x:0, y:240, w:30, h:80},   to:'bedroom',  spawn:{x:740, y:280}, id:'door_bed_hall',  label:'Schlafzimmertür' },
      { rect:{x:180, y:0, w:80, h:30},   to:'red_room', spawn:{x:410, y:510}, id:'door_red_hall',  label:'Rote Tür' },
      { rect:{x:540, y:530, w:80, h:30}, to:'basement', spawn:{x:580, y:50},  id:'door_basement',  label:'Kellertür' },
    ],
    spawnPoint: { x: 400, y: 280 },
  },

  red_room: {
    name: 'Rotes Zimmer',
    chapter: 'Kapitel II — Das Zimmer',
    bgColor: '#0a0303',
    floorColor: '#1a0808',
    walls: [
      {x:0, y:0, w:800, h:30},
      {x:0, y:530, w:370, h:30}, {x:450, y:530, w:350, h:30},
      {x:0, y:0, w:30, h:560}, {x:770, y:0, w:30, h:560},
    ],
    furniture: [
      { type:'chair', x:380, y:120, w:60,  h:90, label:'Stuhl' },
      { type:'table', x:120, y:340, w:140, h:90, label:'Tisch' },
      { type:'toy',   x:600, y:380, w:35,  h:35, label:'Spieluhr' },
    ],
    hideSpots: [
      { x:380, y:120, w:60,  h:90, label:'Hinter dem Stuhl', spotName:'Stuhl', px:410, py:175 },
      { x:120, y:340, w:140, h:90, label:'Unter dem Tisch',  spotName:'Tisch', px:190, py:385 },
    ],
    doors: [
      { rect:{x:370, y:530, w:80, h:30}, to:'hallway', spawn:{x:220, y:50}, id:'door_red_hall', label:'Rote Tür' },
    ],
    spawnPoint: { x: 400, y: 300 },
  },

  basement: {
    name: 'Keller',
    chapter: 'Kapitel III — Die Tiefe',
    bgColor: '#020302',
    floorColor: '#0a0a05',
    walls: [
      {x:0, y:0, w:540, h:30}, {x:620, y:0, w:180, h:30},
      {x:0, y:530, w:800, h:30},
      {x:0, y:0, w:30, h:560},
      {x:770, y:0, w:30, h:560},  // right wall (will get door gap on reveal)
    ],
    wallsRevealed: [  // walls used after cellar revealed (door gap on right)
      {x:0, y:0, w:540, h:30}, {x:620, y:0, w:180, h:30},
      {x:0, y:530, w:800, h:30},
      {x:0, y:0, w:30, h:560},
      {x:770, y:0, w:30, h:240}, {x:770, y:320, w:30, h:240},
    ],
    furniture: [
      { type:'barrel', x:130, y:130, w:60, h:60, label:'Fass' },
      { type:'barrel', x:200, y:130, w:60, h:60, label:'Fass' },
      { type:'barrel', x:130, y:200, w:60, h:60, label:'Fass' },
      { type:'crates', x:550, y:380, w:130, h:90, label:'Kisten' },
    ],
    hideSpots: [
      { x:130, y:130, w:130, h:130, label:'Hinter den Fässern', spotName:'Fässer', px:195, py:195 },
      { x:550, y:380, w:130, h:90,  label:'Hinter den Kisten',  spotName:'Kisten', px:615, py:425 },
    ],
    doors: [
      { rect:{x:540, y:0, w:80, h:30}, to:'hallway', spawn:{x:580, y:500}, id:'door_basement', label:'Kellertür' },
    ],
    doorsRevealed: [
      { rect:{x:540, y:0, w:80, h:30}, to:'hallway', spawn:{x:580, y:500}, id:'door_basement', label:'Kellertür' },
      { rect:{x:770, y:240, w:30, h:80}, to:'cellar', spawn:{x:60, y:280}, id:'door_cellar', label:'Geheimer Durchgang' },
    ],
    interactables: [
      { type:'crack', x:760, y:260, w:30, h:40, label:'Ritze in der Wand', action:'reveal_cellar' },
    ],
    spawnPoint: { x: 580, y: 100 },
  },

  cellar: {
    name: 'Geheimer Raum',
    chapter: 'Kapitel IV — Der Ausgang',
    bgColor: '#030303',
    floorColor: '#0a0505',
    walls: [
      {x:0, y:0, w:370, h:30}, {x:450, y:0, w:350, h:30},
      {x:0, y:530, w:800, h:30}, {x:770, y:0, w:30, h:560},
      {x:0, y:0, w:30, h:240}, {x:0, y:320, w:30, h:240},
    ],
    furniture: [
      { type:'altar', x:340, y:240, w:120, h:100, label:'Knochen-Altar' },
    ],
    hideSpots: [
      { x:340, y:240, w:120, h:100, label:'Hinter dem Altar', spotName:'Altar', px:400, py:300 },
    ],
    doors: [
      { rect:{x:0, y:240, w:30, h:80}, to:'basement', spawn:{x:740, y:280}, id:'door_cellar', label:'Geheimer Durchgang' },
    ],
    interactables: [
      { type:'escape', x:370, y:0, w:80, h:30, label:'Ausgangstür', action:'escape' },
    ],
    spawnPoint: { x: 400, y: 400 },
  },
};

// ===== STATE =====
let state;
function freshState() {
  const keyRooms = ['bedroom', 'hallway', 'red_room', 'basement'];
  const keyRoom  = keyRooms[Math.floor(Math.random() * keyRooms.length)];
  const keyPos   = {
    bedroom:  { x: 350, y: 470 },
    hallway:  { x: 400, y: 280 },
    red_room: { x: 200, y: 200 },
    basement: { x: 380, y: 470 },
  };
  return {
    currentRoom: 'bedroom',
    player: {
      x: 400, y: 380, vx: 0, vy: 0,
      health: 100, stamina: 100, sanity: 100,
      hasKey: false, isHiding: false, hidingSpot: null,
      facing: 'down',
      walkAnim: 0,
    },
    grenni: {
      room: 'hallway', x: 400, y: 280,
      alert: 0, wanderTarget: null, wanderTimer: 0,
      eyeFlicker: 0,
    },
    keyRoom, keyPosition: keyPos[keyRoom],
    lockedDoors: new Set(),
    cellarRevealed: false,
    grenniMeter: 5,
    paused: false,
    storyText: null, storyTimer: 0,
    transitionFlash: 0,
    redFlash: 0,
    shake: { x: 0, y: 0, t: 0 },
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
const heartBar       = document.getElementById('heart-bar');
const heartIcon      = document.getElementById('heart-icon');
const staminaBar     = document.getElementById('stamina-bar');
const sanityVal      = document.getElementById('sanity-val');
const keyIndicator   = document.getElementById('key-indicator');
const roomNameEl     = document.getElementById('room-name-display');
const grenniDots     = [1,2,3,4,5].map(i => document.getElementById('gdot-'+i));
const grenniStatusEl = document.getElementById('grenni-status-text');
const interactPrompt = document.getElementById('interact-prompt');
const promptText     = document.getElementById('prompt-text');
const promptKey      = document.getElementById('prompt-key');
const storyOverlay   = document.getElementById('story-overlay');
const deathMsg       = document.getElementById('death-msg');
const jumpscareImg   = document.getElementById('jumpscare-img');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ===== INPUT =====
const keys = {};
const keysPressed = {};
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (!keys[k]) keysPressed[k] = true;
  keys[k] = true;
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
function consumeKey(k) {
  if (keysPressed[k]) { keysPressed[k] = false; return true; }
  return false;
}

// ===== HELPERS =====
function showScreen(name) {
  Object.values(screens).forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
  screens[name].style.display = 'flex';
  screens[name].classList.add('active');
}
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function circleRectCollide(cx, cy, r, rect) {
  const cx_ = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const cy_ = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - cx_, dy = cy - cy_;
  return dx*dx + dy*dy < r*r;
}
function getWalls(room) {
  if (room === ROOMS.basement && state.cellarRevealed) return room.wallsRevealed;
  return room.walls;
}
function getDoors(room) {
  if (room === ROOMS.basement && state.cellarRevealed) return room.doorsRevealed;
  return room.doors;
}
function isPlayerColliding(x, y, room) {
  const r = PR;
  for (const w of getWalls(room)) if (circleRectCollide(x, y, r, w)) return true;
  for (const f of room.furniture) {
    // small things don't block
    if (f.type === 'toy' || f.type === 'crack') continue;
    if (circleRectCollide(x, y, r, f)) return true;
  }
  return false;
}
function isGrenniColliding(x, y, room) {
  const r = GR;
  for (const w of getWalls(room)) if (circleRectCollide(x, y, r, w)) return true;
  for (const f of room.furniture) {
    if (f.type === 'toy' || f.type === 'crack' || f.type === 'altar') continue;
    if (circleRectCollide(x, y, r, f)) return true;
  }
  return false;
}

// ===== SHOW STORY =====
function showStory(text, duration = 4) {
  state.storyText = text;
  state.storyTimer = duration;
  storyOverlay.textContent = text;
  storyOverlay.classList.remove('hidden');
}
function hideStory() {
  state.storyText = null;
  storyOverlay.classList.add('hidden');
}

// ===== TRANSITION ROOM =====
function transitionRoom(door) {
  if (state.lockedDoors.has(door.id)) {
    showStory(`${door.label} ist abgeschlossen.`, 2);
    return;
  }
  state.currentRoom = door.to;
  state.player.x = door.spawn.x;
  state.player.y = door.spawn.y;
  state.player.isHiding = false;
  state.player.hidingSpot = null;
  state.transitionFlash = 0.4;
  playFootstep();
}

// ===== INTERACT =====
function nearestInteractable() {
  const room = ROOMS[state.currentRoom];
  const px = state.player.x, py = state.player.y;
  // Hide spot
  for (const h of room.hideSpots) {
    if (circleRectCollide(px, py, PR + 25, h)) {
      return { kind: 'hide', label: h.label, spot: h };
    }
  }
  // Key in this room
  if (state.keyRoom === state.currentRoom && !state.player.hasKey) {
    const dx = state.keyPosition.x - px, dy = state.keyPosition.y - py;
    if (dx*dx + dy*dy < 35*35) {
      return { kind: 'pickup_key', label: 'Schlüssel aufheben' };
    }
  }
  // Special interactables
  if (room.interactables) {
    for (const i of room.interactables) {
      if (circleRectCollide(px, py, PR + 25, i)) {
        if (i.action === 'reveal_cellar' && state.cellarRevealed) continue;
        if (i.action === 'escape' && !state.player.hasKey) {
          return { kind: 'locked_escape', label: 'Ausgangstür (verschlossen — Schlüssel fehlt)' };
        }
        return { kind: i.action, label: i.label, target: i };
      }
    }
  }
  return null;
}

function handleInteract() {
  const i = nearestInteractable();
  if (!i) return;
  switch (i.kind) {
    case 'hide':
      doHide(i.spot);
      break;
    case 'pickup_key':
      state.player.hasKey = true;
      playPickup();
      showStory('🗝️ Du hast den Schlüssel. Jetzt finde den Ausgang im Keller.', 4);
      break;
    case 'reveal_cellar':
      state.cellarRevealed = true;
      playSuccess();
      showStory('Du drückst gegen die Ritze. Die Wand bricht — ein geheimer Durchgang öffnet sich.', 4);
      break;
    case 'escape':
      doEscape();
      break;
    case 'locked_escape':
      showStory('Verschlossen. Du brauchst den Schlüssel.', 2);
      break;
  }
}

function doHide(spot) {
  state.player.isHiding = true;
  state.player.hidingSpot = spot.label;
  state.player.x = spot.px;
  state.player.y = spot.py;
  state.grenniMeter = Math.max(0, state.grenniMeter - 15);
  showStory(`Versteckt: ${spot.label}. (E zum Hervorkommen)`, 3);
}
function doUnhide() {
  state.player.isHiding = false;
  state.player.hidingSpot = null;
  state.grenniMeter = Math.min(100, state.grenniMeter + 5);
}

function handleLockDoor() {
  if (!state.player.hasKey) return;
  const room = ROOMS[state.currentRoom];
  for (const d of getDoors(room)) {
    if (circleRectCollide(state.player.x, state.player.y, PR + 30, d.rect)) {
      if (state.lockedDoors.has(d.id)) {
        state.lockedDoors.delete(d.id);
        playLock();
        showStory(`${d.label} aufgeschlossen.`, 2);
      } else {
        state.lockedDoors.add(d.id);
        playLock();
        state.grenniMeter = Math.max(0, state.grenniMeter - 25);
        // If Grenni is on the other side, knock it back
        if (state.grenni.room === d.to) {
          state.grenni.alert = Math.max(0, state.grenni.alert - 50);
        }
        showStory(`${d.label} abgeschlossen. Grenni ist verlangsamt.`, 3);
      }
      return;
    }
  }
}

function doEscape() {
  playSuccess();
  showStory('Du steckst den Schlüssel ins Schloss. Das Schloss klickt. Die Tür öffnet sich…', 3);
  setTimeout(() => {
    showStory('Du läufst durch den Tunnel. Erde, Wurzeln, Dunkelheit. Dann — graues Tageslicht.', 4);
    setTimeout(() => {
      showStory('Eine Straße. Ein Auto hält. Der Fahrer dreht sich um. Leere, weiße Augen. "Wohin darf ich Sie bringen?" Du erkennst das Haus hinter ihm. Grenni schläft nicht.', 6);
      setTimeout(() => showScreen('win'), 4500);
    }, 3500);
  }, 3500);
}

// ===== UPDATE =====
let footstepTimer = 0;
let ambientTimer = 4;
let growlTimer = 8;

function update(dt) {
  if (state.paused) return;
  if (state.storyTimer > 0) {
    state.storyTimer -= dt;
    if (state.storyTimer <= 0) hideStory();
  }
  if (state.transitionFlash > 0) state.transitionFlash -= dt;
  if (state.redFlash > 0) state.redFlash -= dt;
  if (state.shake.t > 0) {
    state.shake.t -= dt;
    state.shake.x = (Math.random() - 0.5) * 12;
    state.shake.y = (Math.random() - 0.5) * 12;
  } else { state.shake.x = state.shake.y = 0; }

  const room = ROOMS[state.currentRoom];

  // === PLAYER INPUT ===
  let dx = 0, dy = 0;
  if (keys.w || keys.arrowup) dy -= 1;
  if (keys.s || keys.arrowdown) dy += 1;
  if (keys.a || keys.arrowleft) dx -= 1;
  if (keys.d || keys.arrowright) dx += 1;
  const wantsRun = keys.shift && state.player.stamina > 5;

  if (state.player.isHiding) {
    // Stamina recovers, grenni meter falls
    state.player.stamina = Math.min(100, state.player.stamina + 35 * dt);
    state.grenniMeter = Math.max(0, state.grenniMeter - 12 * dt);
    if (consumeKey('e') || consumeKey(' ')) doUnhide();
  } else if (dx !== 0 || dy !== 0) {
    const mag = Math.hypot(dx, dy);
    dx /= mag; dy /= mag;
    if (Math.abs(dx) > Math.abs(dy)) state.player.facing = dx > 0 ? 'right' : 'left';
    else state.player.facing = dy > 0 ? 'down' : 'up';

    const speed = wantsRun ? PRUN : PSPEED;
    let nx = state.player.x + dx * speed * dt;
    let ny = state.player.y + dy * speed * dt;
    if (!isPlayerColliding(nx, state.player.y, room)) state.player.x = nx;
    if (!isPlayerColliding(state.player.x, ny, room)) state.player.y = ny;

    state.player.walkAnim += speed * dt * 0.05;

    // Stamina + noise
    if (wantsRun) {
      state.player.stamina = Math.max(0, state.player.stamina - 30 * dt);
      state.grenniMeter = Math.min(100, state.grenniMeter + 18 * dt);
      state.grenni.alert = Math.min(100, state.grenni.alert + 25 * dt);
      footstepTimer -= dt;
      if (footstepTimer <= 0) { playFootstep(); footstepTimer = 0.18; }
    } else {
      state.player.stamina = Math.min(100, state.player.stamina + 6 * dt);
      state.grenniMeter = Math.min(100, state.grenniMeter + 1.5 * dt);
      footstepTimer -= dt;
      if (footstepTimer <= 0) { playFootstep(); footstepTimer = 0.34; }
    }

    // Door check
    for (const d of getDoors(room)) {
      if (circleRectCollide(state.player.x, state.player.y, PR, d.rect)) {
        transitionRoom(d);
        break;
      }
    }
  } else {
    // Idle
    state.player.stamina = Math.min(100, state.player.stamina + 14 * dt);
    state.grenniMeter = Math.max(0, state.grenniMeter - 1.5 * dt);
  }

  // E - interact
  if (!state.player.isHiding && (consumeKey('e') || consumeKey(' '))) handleInteract();
  // L - lock/unlock door
  if (consumeKey('l')) handleLockDoor();

  // === GRENNI AI ===
  updateGrenni(dt);

  // Same room proximity → meter rises
  if (state.grenni.room === state.currentRoom && !state.player.isHiding) {
    const dist = Math.hypot(state.grenni.x - state.player.x, state.grenni.y - state.player.y);
    if (dist < 80)       state.grenniMeter = Math.min(100, state.grenniMeter + 30 * dt);
    else if (dist < 180) state.grenniMeter = Math.min(100, state.grenniMeter + 12 * dt);
    else if (dist < 320) state.grenniMeter = Math.min(100, state.grenniMeter + 5  * dt);

    // CATCH
    if (dist < PR + GR) grenniCatch();
  } else if (state.grenni.room === state.currentRoom && state.player.isHiding) {
    state.grenniMeter = Math.max(0, state.grenniMeter - 4 * dt);
  } else {
    state.grenniMeter = Math.max(0, state.grenniMeter - 3 * dt);
  }

  // Sanity decay when Grenni close
  if (state.grenniMeter > 70) state.player.sanity = Math.max(0, state.player.sanity - 3 * dt);
  else if (state.grenniMeter > 40) state.player.sanity = Math.max(0, state.player.sanity - 0.6 * dt);

  // Death checks
  if (state.player.health <= 0) { showDeath('Grenni hat dich gefunden. Es gab kein Entkommen.'); return; }
  if (state.player.sanity <= 0) { showDeath('Grennies Nähe zerbrach deinen Verstand. Du bliebst für immer.'); return; }

  // Random ambient sound
  ambientTimer -= dt;
  if (ambientTimer <= 0) {
    const r = Math.random();
    if (r < 0.4) playWhisper();
    else if (r < 0.7) playHeartbeat(state.grenniMeter > 60);
    ambientTimer = 4 + Math.random() * 6;
  }
  growlTimer -= dt;
  if (growlTimer <= 0 && state.grenniMeter > 50) {
    playGrowl();
    growlTimer = 6 + Math.random() * 6;
  } else if (growlTimer <= 0) {
    growlTimer = 8 + Math.random() * 8;
  }

  state.grenni.eyeFlicker += dt * 4;

  updateUI();
}

function updateGrenni(dt) {
  const g = state.grenni;
  g.alert = Math.max(0, g.alert - 3 * dt);
  const room = ROOMS[g.room];

  let target = null;
  let speed = GSPEED_WANDER;

  if (g.room === state.currentRoom && !state.player.isHiding) {
    target = { x: state.player.x, y: state.player.y };
    speed = GSPEED_CHASE;
    g.alert = 100;
  } else if (g.alert > 50 && g.room !== state.currentRoom) {
    // Try to move to player's room via available door
    const playerRoom = state.currentRoom;
    let bestDoor = null, fallback = null;
    for (const d of getDoors(room)) {
      if (state.lockedDoors.has(d.id)) continue;
      if (d.to === playerRoom) { bestDoor = d; break; }
      if (!fallback) fallback = d;
    }
    const door = bestDoor || fallback;
    if (door) {
      target = { x: door.rect.x + door.rect.w/2, y: door.rect.y + door.rect.h/2 };
      speed = GSPEED_CHASE;
      const dist = Math.hypot(target.x - g.x, target.y - g.y);
      if (dist < 30) {
        g.room = door.to;
        g.x = door.spawn.x;
        g.y = door.spawn.y;
        g.wanderTarget = null;
        g.wanderTimer = 0;
        return;
      }
    }
  } else {
    // Wander
    g.wanderTimer -= dt;
    if (!g.wanderTarget || g.wanderTimer <= 0 || Math.hypot(g.x - g.wanderTarget.x, g.y - g.wanderTarget.y) < 25) {
      // Pick a new target inside room
      let attempts = 0;
      while (attempts < 25) {
        const nx = 60 + Math.random() * (W - 120);
        const ny = 60 + Math.random() * (H - 120);
        if (!isGrenniColliding(nx, ny, room)) { g.wanderTarget = { x: nx, y: ny }; break; }
        attempts++;
      }
      g.wanderTimer = 3 + Math.random() * 5;
      // Chance to move to adjacent room
      if (Math.random() < 0.35) {
        const valid = getDoors(room).filter(d => !state.lockedDoors.has(d.id));
        if (valid.length > 0) {
          const door = valid[Math.floor(Math.random() * valid.length)];
          g.room = door.to;
          g.x = door.spawn.x;
          g.y = door.spawn.y;
          g.wanderTarget = null;
          return;
        }
      }
    }
    target = g.wanderTarget;
  }

  if (target) {
    const dx = target.x - g.x, dy = target.y - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      const ndx = dx/dist, ndy = dy/dist;
      const nx = g.x + ndx * speed * dt;
      const ny = g.y + ndy * speed * dt;
      if (!isGrenniColliding(nx, g.y, ROOMS[g.room])) g.x = nx;
      if (!isGrenniColliding(g.x, ny, ROOMS[g.room])) g.y = ny;
    }
  }
}

// ===== GRENNI ATTACK =====
function grenniCatch() {
  state.player.health = Math.max(0, state.player.health - 30);
  state.player.sanity = Math.max(0, state.player.sanity - 18);
  state.grenniMeter = 60;
  state.shake.t = 0.5;
  state.redFlash = 0.4;

  triggerJumpscare(() => {
    if (state.player.health <= 0) { showDeath('Grenni hat dich gefunden. Es gab kein Entkommen.'); return; }
    if (state.player.sanity <= 0) { showDeath('Grennies Nähe zerbrach deinen Verstand. Du bliebst für immer.'); return; }
    // Knock player back to spawn of current room, push Grenni away
    state.player.x = ROOMS[state.currentRoom].spawnPoint.x;
    state.player.y = ROOMS[state.currentRoom].spawnPoint.y;
    // Send Grenni to a different room
    const otherRooms = Object.keys(ROOMS).filter(r => r !== state.currentRoom && r !== 'cellar');
    state.grenni.room = otherRooms[Math.floor(Math.random() * otherRooms.length)];
    state.grenni.x = 400; state.grenni.y = 280;
    state.grenni.alert = 0;
  });
}

// ===== JUMPSCARE =====
function triggerJumpscare(onDone) {
  playScare();
  const c = document.createElement('canvas');
  c.width = 400; c.height = 400;
  const cx = c.getContext('2d');
  cx.fillStyle = '#000'; cx.fillRect(0,0,400,400);
  cx.beginPath(); cx.arc(200,200,160,0,Math.PI*2); cx.fillStyle = '#110000'; cx.fill();
  cx.fillStyle = '#000';
  cx.beginPath(); cx.ellipse(140,160,40,50,0,0,Math.PI*2); cx.fill();
  cx.beginPath(); cx.ellipse(260,160,40,50,0,0,Math.PI*2); cx.fill();
  cx.fillStyle = '#ddd';
  cx.beginPath(); cx.ellipse(140,162,28,38,0,0,Math.PI*2); cx.fill();
  cx.beginPath(); cx.ellipse(260,162,28,38,0,0,Math.PI*2); cx.fill();
  cx.fillStyle = '#aa0000';
  cx.beginPath(); cx.arc(140,165,16,0,Math.PI*2); cx.fill();
  cx.beginPath(); cx.arc(260,165,16,0,Math.PI*2); cx.fill();
  cx.fillStyle = '#000';
  cx.beginPath(); cx.arc(140,165,9,0,Math.PI*2); cx.fill();
  cx.beginPath(); cx.arc(260,165,9,0,Math.PI*2); cx.fill();
  cx.strokeStyle = '#cc0000'; cx.lineWidth = 5;
  cx.beginPath(); cx.moveTo(100,290); cx.bezierCurveTo(150,350,250,350,300,290); cx.stroke();
  cx.fillStyle = '#d8d0c0';
  for (let t = 0; t < 6; t++) cx.fillRect(125+t*26,288,20,32);

  jumpscareImg.style.cssText = `background:#000 url(${c.toDataURL()}) center/contain no-repeat`;
  showScreen('jumpscare');
  setTimeout(() => {
    showScreen('game');
    if (onDone) onDone();
  }, 700);
}

// ===== RENDER =====
function render() {
  const room = ROOMS[state.currentRoom];

  // Apply shake offset
  ctx.save();
  ctx.translate(state.shake.x, state.shake.y);

  // Floor
  ctx.fillStyle = room.bgColor;
  ctx.fillRect(0, 0, W, H);
  // Floor tile pattern
  ctx.fillStyle = room.floorColor;
  for (let y = 30; y < H - 30; y += 40) {
    for (let x = 30; x < W - 30; x += 40) {
      if ((x + y) % 80 === 0) ctx.fillRect(x, y, 40, 40);
    }
  }

  // Walls
  for (const w of getWalls(room)) drawWall(w);

  // Furniture
  for (const f of room.furniture) drawFurniture(f);

  // Doors (visual)
  for (const d of getDoors(room)) drawDoor(d);

  // Interactables
  if (room.interactables) {
    for (const i of room.interactables) drawInteractable(i, room);
  }

  // Key
  if (state.keyRoom === state.currentRoom && !state.player.hasKey) {
    drawKey(state.keyPosition.x, state.keyPosition.y);
  }

  // Grenni
  if (state.grenni.room === state.currentRoom) {
    drawGrenni(state.grenni.x, state.grenni.y);
  }

  // Player
  drawPlayer(state.player.x, state.player.y);

  // Darkness overlay (visibility limited around player)
  drawDarkness();

  // Hide indicator
  if (state.player.isHiding) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(80,100,140,0.85)';
    ctx.font = 'bold 28px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('VERSTECKT', W/2, H/2 - 20);
    ctx.font = '14px Georgia';
    ctx.fillText('[E] zum Hervorkommen', W/2, H/2 + 10);
  }

  // Red flash on damage
  if (state.redFlash > 0) {
    ctx.fillStyle = `rgba(180,0,0,${state.redFlash * 1.5})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Transition flash
  if (state.transitionFlash > 0) {
    ctx.fillStyle = `rgba(0,0,0,${state.transitionFlash * 1.5})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}

// === DRAW HELPERS ===
function drawWall(w) {
  // Base
  ctx.fillStyle = '#1a0a08';
  ctx.fillRect(w.x, w.y, w.w, w.h);
  // Top highlight
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(w.x, w.y, w.w, 3);
  // Subtle inner shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(w.x, w.y + w.h - 4, w.w, 4);
}

function drawFurniture(f) {
  ctx.save();
  switch (f.type) {
    case 'bed': {
      // Frame
      ctx.fillStyle = '#2a1010';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      // Mattress
      ctx.fillStyle = '#3a1818';
      ctx.fillRect(f.x + 8, f.y + 8, f.w - 16, f.h - 16);
      // Pillow
      ctx.fillStyle = '#5a3030';
      ctx.fillRect(f.x + 14, f.y + 14, 50, 30);
      // Stains
      ctx.fillStyle = 'rgba(80,0,0,0.6)';
      ctx.beginPath(); ctx.arc(f.x + f.w/2, f.y + f.h/2 + 10, 18, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(f.x + f.w - 30, f.y + 50, 8, 0, Math.PI*2); ctx.fill();
      break;
    }
    case 'wardrobe': {
      ctx.fillStyle = '#2a1505';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = '#3a2008';
      ctx.fillRect(f.x + 4, f.y + 4, f.w - 8, f.h - 8);
      // Doors
      ctx.strokeStyle = '#0a0500';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(f.x + f.w/2, f.y + 4); ctx.lineTo(f.x + f.w/2, f.y + f.h - 4); ctx.stroke();
      // Handles
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(f.x + f.w/2 - 8, f.y + f.h/2, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(f.x + f.w/2 + 8, f.y + f.h/2, 3, 0, Math.PI*2); ctx.fill();
      break;
    }
    case 'table': {
      ctx.fillStyle = '#2a1a0a';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = '#3a2510';
      ctx.fillRect(f.x + 3, f.y + 3, f.w - 6, f.h - 6);
      // Legs (corners)
      ctx.fillStyle = '#1a0a00';
      ctx.fillRect(f.x, f.y, 8, 8); ctx.fillRect(f.x + f.w - 8, f.y, 8, 8);
      ctx.fillRect(f.x, f.y + f.h - 8, 8, 8); ctx.fillRect(f.x + f.w - 8, f.y + f.h - 8, 8, 8);
      break;
    }
    case 'chair': {
      ctx.fillStyle = '#1a0808';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      // Backrest
      ctx.fillStyle = '#2a1010';
      ctx.fillRect(f.x, f.y, f.w, 25);
      ctx.fillRect(f.x, f.y + 25, f.w, f.h - 25);
      // Seat outline
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(f.x, f.y, f.w, f.h);
      break;
    }
    case 'curtain': {
      // Vertical stripes
      const stripes = 5;
      for (let i = 0; i < stripes; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#1a0505' : '#2a0a0a';
        ctx.fillRect(f.x + (f.w / stripes) * i, f.y, f.w / stripes, f.h);
      }
      // Top rail
      ctx.fillStyle = '#3a1505';
      ctx.fillRect(f.x - 5, f.y - 4, f.w + 10, 6);
      break;
    }
    case 'barrel': {
      ctx.fillStyle = '#2a1a0a';
      ctx.beginPath(); ctx.ellipse(f.x + f.w/2, f.y + f.h/2, f.w/2, f.h/2, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#3a2510';
      ctx.beginPath(); ctx.ellipse(f.x + f.w/2, f.y + 8, f.w/2 - 3, 6, 0, 0, Math.PI*2); ctx.fill();
      // Bands
      ctx.strokeStyle = '#1a0805'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(f.x + f.w/2, f.y + f.h/2 - 8, f.w/2 - 1, 4, 0, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(f.x + f.w/2, f.y + f.h/2 + 8, f.w/2 - 1, 4, 0, 0, Math.PI*2); ctx.stroke();
      break;
    }
    case 'crates': {
      ctx.fillStyle = '#1a0a05';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      // Subdivide into crates
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.strokeRect(f.x, f.y, f.w/2, f.h/2);
      ctx.strokeRect(f.x + f.w/2, f.y, f.w/2, f.h/2);
      ctx.strokeRect(f.x, f.y + f.h/2, f.w/2, f.h/2);
      ctx.strokeRect(f.x + f.w/2, f.y + f.h/2, f.w/2, f.h/2);
      // Inner highlights
      ctx.fillStyle = '#2a1505';
      ctx.fillRect(f.x + 4, f.y + 4, f.w/2 - 8, f.h/2 - 8);
      ctx.fillRect(f.x + f.w/2 + 4, f.y + 4, f.w/2 - 8, f.h/2 - 8);
      ctx.fillRect(f.x + 4, f.y + f.h/2 + 4, f.w/2 - 8, f.h/2 - 8);
      ctx.fillRect(f.x + f.w/2 + 4, f.y + f.h/2 + 4, f.w/2 - 8, f.h/2 - 8);
      break;
    }
    case 'altar': {
      // Stone slab
      ctx.fillStyle = '#3a2515';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = '#4a3020';
      ctx.fillRect(f.x + 4, f.y + 4, f.w - 8, f.h - 8);
      // Bones (white sticks)
      ctx.strokeStyle = '#d8d0b0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(f.x + 20, f.y + 20); ctx.lineTo(f.x + 60, f.y + 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(f.x + 80, f.y + 25); ctx.lineTo(f.x + 100, f.y + 60); ctx.stroke();
      // Skull (small)
      ctx.fillStyle = '#e0d8b8';
      ctx.beginPath(); ctx.arc(f.x + f.w/2, f.y + f.h/2 + 10, 12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(f.x + f.w/2 - 4, f.y + f.h/2 + 8, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(f.x + f.w/2 + 4, f.y + f.h/2 + 8, 2.5, 0, Math.PI*2); ctx.fill();
      // Glow
      const grad = ctx.createRadialGradient(f.x + f.w/2, f.y + f.h/2, 5, f.x + f.w/2, f.y + f.h/2, 80);
      grad.addColorStop(0, 'rgba(255,80,0,0.3)');
      grad.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(f.x - 30, f.y - 30, f.w + 60, f.h + 60);
      break;
    }
    case 'toy': {
      // Music box
      ctx.fillStyle = '#3a3010';
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = '#5a4020';
      ctx.fillRect(f.x + 3, f.y + 3, f.w - 6, f.h - 6);
      ctx.fillStyle = '#8a6030';
      ctx.fillRect(f.x + 10, f.y + 10, f.w - 20, 10);
      // Slow rotation indicator
      ctx.strokeStyle = 'rgba(200,150,80,0.6)';
      ctx.lineWidth = 1;
      const angle = state.grenni.eyeFlicker;
      ctx.beginPath();
      ctx.moveTo(f.x + f.w/2, f.y + f.h/2);
      ctx.lineTo(f.x + f.w/2 + Math.cos(angle) * 12, f.y + f.h/2 + Math.sin(angle) * 12);
      ctx.stroke();
      break;
    }
    default:
      ctx.fillStyle = '#1a0a0a';
      ctx.fillRect(f.x, f.y, f.w, f.h);
  }
  ctx.restore();
}

function drawDoor(d) {
  const r = d.rect;
  const isLocked = state.lockedDoors.has(d.id);
  // Door frame
  ctx.fillStyle = isLocked ? '#5a3020' : '#3a1f10';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // Inner door
  ctx.fillStyle = isLocked ? '#4a2515' : '#2a1505';
  ctx.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
  // Handle / lock indicator
  if (isLocked) {
    ctx.fillStyle = '#c8a030';
    if (r.w > r.h) ctx.fillRect(r.x + r.w/2 - 4, r.y + r.h/2 - 3, 8, 6);
    else ctx.fillRect(r.x + r.w/2 - 3, r.y + r.h/2 - 4, 6, 8);
  } else {
    ctx.fillStyle = '#8a7050';
    if (r.w > r.h) ctx.fillRect(r.x + r.w - 8, r.y + r.h/2 - 2, 4, 4);
    else ctx.fillRect(r.x + r.w/2 - 2, r.y + r.h - 8, 4, 4);
  }
}

function drawInteractable(i, room) {
  if (i.type === 'crack') {
    if (state.cellarRevealed) return;
    // Glowing red crack
    const grad = ctx.createRadialGradient(i.x + i.w/2, i.y + i.h/2, 2, i.x + i.w/2, i.y + i.h/2, 40);
    grad.addColorStop(0, 'rgba(255,30,0,0.6)');
    grad.addColorStop(1, 'rgba(255,30,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(i.x - 20, i.y - 20, i.w + 40, i.h + 40);
    ctx.strokeStyle = '#ff2200';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(i.x + 5, i.y + 2);
    ctx.lineTo(i.x + 12, i.y + 14);
    ctx.lineTo(i.x + 6, i.y + 22);
    ctx.lineTo(i.x + 18, i.y + 35);
    ctx.lineTo(i.x + 10, i.y + i.h - 2);
    ctx.stroke();
  } else if (i.type === 'escape') {
    // Big door with key emphasis
    ctx.fillStyle = '#5a3020';
    ctx.fillRect(i.x - 6, i.y, i.w + 12, i.h + 8);
    ctx.fillStyle = '#3a1f10';
    ctx.fillRect(i.x, i.y, i.w, i.h);
    ctx.fillStyle = state.player.hasKey ? '#c8a030' : '#3a2010';
    ctx.fillRect(i.x + i.w/2 - 5, i.y + i.h/2 - 4, 10, 8);
    if (state.player.hasKey) {
      const g = ctx.createRadialGradient(i.x + i.w/2, i.y + i.h/2, 2, i.x + i.w/2, i.y + i.h/2, 60);
      g.addColorStop(0, 'rgba(200,160,48,0.5)');
      g.addColorStop(1, 'rgba(200,160,48,0)');
      ctx.fillStyle = g;
      ctx.fillRect(i.x - 30, i.y - 30, i.w + 60, i.h + 60);
    }
  }
}

function drawKey(x, y) {
  const t = Date.now() / 250;
  const yOff = Math.sin(t) * 3;
  // Glow
  const grad = ctx.createRadialGradient(x, y + yOff, 2, x, y + yOff, 30);
  grad.addColorStop(0, 'rgba(255,200,80,0.7)');
  grad.addColorStop(1, 'rgba(255,200,80,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - 30, y - 30 + yOff, 60, 60);
  // Key shape
  ctx.fillStyle = '#d8b048';
  ctx.beginPath();
  ctx.arc(x - 5, y + yOff, 5, 0, Math.PI*2);
  ctx.fill();
  ctx.fillRect(x - 2, y - 1 + yOff, 13, 3);
  ctx.fillRect(x + 7, y + 2 + yOff, 4, 4);
  ctx.fillRect(x + 4, y + 2 + yOff, 2, 3);
  // Inner hole
  ctx.fillStyle = '#1a0a00';
  ctx.beginPath(); ctx.arc(x - 5, y + yOff, 2, 0, Math.PI*2); ctx.fill();
}

function drawPlayer(x, y) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.ellipse(x, y + PR + 2, PR - 1, 4, 0, 0, Math.PI*2); ctx.fill();

  if (state.player.isHiding) return;

  // Body
  const bob = Math.sin(state.player.walkAnim) * 1.5;
  ctx.fillStyle = '#1a3050';
  ctx.beginPath(); ctx.arc(x, y + bob, PR - 2, 0, Math.PI*2); ctx.fill();
  // Head
  ctx.fillStyle = '#c8a890';
  ctx.beginPath(); ctx.arc(x, y - 4 + bob, 6, 0, Math.PI*2); ctx.fill();
  // Hair
  ctx.fillStyle = '#3a2010';
  ctx.beginPath(); ctx.arc(x, y - 6 + bob, 6, Math.PI, 0); ctx.fill();
  // Facing indicator (eye/direction)
  ctx.fillStyle = '#1a0a08';
  let ex = x, ey = y - 4 + bob;
  if (state.player.facing === 'up')    ey -= 2;
  if (state.player.facing === 'down')  ey += 2;
  if (state.player.facing === 'left')  ex -= 2;
  if (state.player.facing === 'right') ex += 2;
  ctx.beginPath(); ctx.arc(ex, ey, 1.5, 0, Math.PI*2); ctx.fill();
}

function drawGrenni(x, y) {
  // Pulsing dark aura
  const aura = ctx.createRadialGradient(x, y, 5, x, y, 50);
  aura.addColorStop(0, 'rgba(0,0,0,0.6)');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(x - 50, y - 50, 100, 100);
  // Shadow under
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath(); ctx.ellipse(x, y + GR + 3, GR + 2, 5, 0, 0, Math.PI*2); ctx.fill();
  // Body (hunched)
  ctx.fillStyle = '#0a0505';
  ctx.beginPath(); ctx.arc(x, y, GR, 0, Math.PI*2); ctx.fill();
  // Hooded silhouette (slightly larger upper half)
  ctx.fillStyle = '#080202';
  ctx.beginPath();
  ctx.moveTo(x - GR - 2, y);
  ctx.bezierCurveTo(x - GR - 4, y - GR, x + GR + 4, y - GR, x + GR + 2, y);
  ctx.lineTo(x + GR, y + 2);
  ctx.lineTo(x - GR, y + 2);
  ctx.closePath();
  ctx.fill();
  // Glowing red eyes
  const flicker = 0.85 + Math.sin(state.grenni.eyeFlicker * 3) * 0.15;
  ctx.fillStyle = `rgba(255,30,0,${flicker})`;
  ctx.beginPath(); ctx.arc(x - 5, y - 4, 2.6, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5, y - 4, 2.6, 0, Math.PI*2); ctx.fill();
  // Eye glow halo
  const eg = ctx.createRadialGradient(x, y - 4, 1, x, y - 4, 18);
  eg.addColorStop(0, `rgba(255,30,0,${flicker*0.6})`);
  eg.addColorStop(1, 'rgba(255,30,0,0)');
  ctx.fillStyle = eg;
  ctx.fillRect(x - 18, y - 22, 36, 36);
}

function drawDarkness() {
  // Dark vignette around player
  const px = state.player.x, py = state.player.y;
  const visRad = state.player.sanity > 60 ? 220 : (state.player.sanity > 30 ? 170 : 130);
  const grad = ctx.createRadialGradient(px, py, 30, px, py, visRad);
  grad.addColorStop(0,   'rgba(0,0,0,0)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.3)');
  grad.addColorStop(1,   'rgba(0,0,0,0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

// ===== UI =====
function updateUI() {
  // Health
  heartBar.style.width = state.player.health + '%';
  if (state.player.health < 30) { heartBar.style.background = '#ff0000'; heartIcon.style.animationDuration = '0.35s'; }
  else if (state.player.health < 60) { heartBar.style.background = '#aa0000'; heartIcon.style.animationDuration = '0.6s'; }
  else { heartBar.style.background = 'var(--blood)'; heartIcon.style.animationDuration = '1s'; }

  // Stamina
  staminaBar.style.width = state.player.stamina + '%';
  staminaBar.style.background = state.player.stamina < 25 ? '#4a1a00' : (state.player.stamina < 50 ? '#5a5a00' : 'var(--stamina-color)');

  // Sanity
  sanityVal.textContent = Math.floor(state.player.sanity);
  sanityVal.style.color = state.player.sanity < 30 ? '#ff4400' : '#c8b89a';

  // Key
  if (state.player.hasKey) keyIndicator.classList.remove('hidden');
  else keyIndicator.classList.add('hidden');

  // Room name
  const room = ROOMS[state.currentRoom];
  roomNameEl.textContent = `${room.name} · ${room.chapter}`;

  // Grenni meter
  const lvl = grenniLevel();
  grenniDots.forEach((d, i) => {
    d.className = 'gdot';
    if (i < lvl) d.classList.add('lit-' + (i+1));
  });
  grenniStatusEl.className = '';
  if (lvl >= 4) grenniStatusEl.classList.add('level-' + lvl);
  const grenniMessages = ['Still…', 'Du hörst etwas…', 'Schritte im Haus', 'Es ist nah', 'ES KOMMT', 'GRENNI IST DA!'];
  grenniStatusEl.textContent = grenniMessages[lvl];

  // Interact prompt
  const i = nearestInteractable();
  if (i && !state.player.isHiding) {
    interactPrompt.classList.remove('hidden');
    promptText.textContent = i.label;
    promptKey.textContent = 'E';
  } else if (state.player.isHiding) {
    interactPrompt.classList.remove('hidden');
    promptText.textContent = 'Hervorkommen';
    promptKey.textContent = 'E';
  } else {
    // Check if near a door (for lock prompt)
    const room = ROOMS[state.currentRoom];
    let nearDoor = null;
    for (const d of getDoors(room)) {
      if (circleRectCollide(state.player.x, state.player.y, PR + 28, d.rect)) { nearDoor = d; break; }
    }
    if (nearDoor && state.player.hasKey) {
      interactPrompt.classList.remove('hidden');
      promptText.textContent = state.lockedDoors.has(nearDoor.id) ? `${nearDoor.label} aufschließen` : `${nearDoor.label} abschließen`;
      promptKey.textContent = 'L';
    } else {
      interactPrompt.classList.add('hidden');
    }
  }
}

function grenniLevel() {
  const m = state.grenniMeter;
  if (m < 20) return 0;
  if (m < 40) return 1;
  if (m < 60) return 2;
  if (m < 76) return 3;
  if (m < 90) return 4;
  return 5;
}

// ===== DEATH / WIN =====
function showDeath(msg) {
  deathMsg.textContent = msg;
  showScreen('death');
  setTimeout(playAmbient, 300);
}

// ===== RESTART =====
function restartGame() {
  state = freshState();
  showScreen('game');
  showStory('Du wachst auf. Dunkelheit. Irgendwo im Haus — Schritte. Finde den Schlüssel. Flieh.', 5);
  playAmbient();
  startLoop();
}

// ===== GAME LOOP =====
let lastT = 0;
let loopId = null;
function tick(t) {
  const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016;
  lastT = t;
  if (state) {
    update(dt);
    render();
  }
  loopId = requestAnimationFrame(tick);
}
function startLoop() {
  if (loopId) return;
  lastT = 0;
  loopId = requestAnimationFrame(tick);
}

// ===== INIT =====
document.getElementById('btn-start').addEventListener('click', () => {
  ensureAudio();
  state = freshState();
  showScreen('game');
  playAmbient();
  showStory('Du wachst auf. Dunkelheit. Irgendwo im Haus — Schritte. Finde den Schlüssel. Flieh.', 5);
  startLoop();
});
