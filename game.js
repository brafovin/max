'use strict';

// ===== AUDIO ENGINE =====
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx = null;

function ensureAudio() {
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
}

function playTone(freq, type, dur, vol = 0.3, delay = 0) {
  ensureAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + dur);
}

function playHeartbeat() {
  playTone(60, 'sine', 0.12, 0.4);
  playTone(55, 'sine', 0.12, 0.35, 0.18);
}

function playScaryAmbient() {
  ensureAudio();
  for (let i = 0; i < 6; i++) {
    const freq = 40 + Math.random() * 60;
    playTone(freq, 'sawtooth', 2 + Math.random() * 3, 0.04 + Math.random() * 0.06, i * 0.8);
  }
}

function playJumpscareSfx() {
  ensureAudio();
  playTone(800, 'sawtooth', 0.05, 0.9);
  playTone(600, 'square', 0.08, 0.8, 0.04);
  playTone(400, 'sawtooth', 0.12, 0.7, 0.08);
  playTone(200, 'sine', 0.3, 0.5, 0.15);
}

function playDoorCreak() {
  ensureAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 1.5);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
  osc.start(); osc.stop(ctx.currentTime + 1.5);
}

function playWhisper() {
  ensureAudio();
  for (let i = 0; i < 8; i++) {
    const f = 150 + Math.random() * 100;
    playTone(f, 'sine', 0.08, 0.06, i * 0.12);
  }
}

function playSuccess() {
  playTone(440, 'sine', 0.2, 0.2);
  playTone(550, 'sine', 0.2, 0.2, 0.2);
  playTone(660, 'sine', 0.4, 0.2, 0.4);
}

// ===== GAME STATE =====
let state = {
  sceneId: 'start',
  health: 100,
  sanity: 100,
  inventory: [],
  flags: {},
};

// ===== SVG SCENES (CSS gradient art) =====
const sceneStyles = {
  bedroom: 'linear-gradient(to bottom, #0a0510 0%, #1a0a1a 40%, #0d0505 100%)',
  hallway: 'linear-gradient(to bottom, #050505 0%, #0f0808 60%, #050303 100%)',
  basement: 'linear-gradient(180deg, #020202 0%, #050a05 50%, #020202 100%)',
  outside: 'linear-gradient(to bottom, #020208 0%, #050510 50%, #0a050a 100%)',
  forest: 'linear-gradient(to bottom, #020802 0%, #051005 60%, #020502 100%)',
  attic: 'linear-gradient(to bottom, #080505 0%, #120808 50%, #060303 100%)',
  cellar: 'linear-gradient(180deg, #030303 0%, #0a0505 100%)',
  escape: 'linear-gradient(to bottom, #050510 0%, #0a0a20 100%)',
};

// ===== STORY DATA =====
const scenes = {
  start: {
    bg: 'bedroom',
    chapter: 'Kapitel I — Das Erwachen',
    text: 'Du öffnest die Augen. Die Decke über dir ist schwarz vor Schimmel. Dein Körper schmerzt. Du liegst auf einem alten Bett, das Holz unter dir knarrt. Durch das zersplitterte Fenster dringt kein Licht... denn draußen ist keine Nacht. Es ist etwas anderes.',
    sfx: 'ambient',
    choices: [
      { text: 'Aufstehen und die Tür untersuchen', next: 'hallway_door', health: 0, sanity: -5 },
      { text: 'Unter das Bett schauen', next: 'under_bed', health: 0, sanity: -15 },
      { text: 'Durch das Fenster blicken', next: 'window_look', health: 0, sanity: -8 },
    ]
  },

  under_bed: {
    bg: 'bedroom',
    chapter: 'Kapitel I — Das Erwachen',
    text: 'Du beugst dich hinunter. Unter dem Bett — in der absoluten Dunkelheit — siehst du zwei reflektierende Augen. Sie blinzeln nicht. Sie warten nur.',
    sfx: 'whisper',
    jumpscare: true,
    jumpDelay: 2000,
    choices: [
      { text: 'AUFSPRINGEN und zur Tür rennen', next: 'hallway_door', health: -15, sanity: -20 },
      { text: 'Starr vor Angst liegen bleiben', next: 'under_bed_wait', health: -5, sanity: -25 },
    ]
  },

  under_bed_wait: {
    bg: 'bedroom',
    chapter: 'Kapitel I — Das Erwachen',
    text: 'Die Augen kommen langsam näher. Ein langer, knochiger Finger streckt sich unter dem Bett hervor und berührt deine Hand. Eiskalt. Du schreist... aber kein Laut kommt.',
    sfx: 'ambient',
    choices: [
      { text: 'Mit letzter Kraft zur Tür kriechen', next: 'hallway_door', health: -20, sanity: -15 },
    ]
  },

  window_look: {
    bg: 'outside',
    chapter: 'Kapitel I — Das Erwachen',
    text: 'Draußen erstreckt sich ein endloser, weißer Nebel. Kein Baum. Kein Gebäude. Nichts. Nur der Nebel — und mittendrin, vielleicht zwanzig Meter entfernt, eine reglose menschliche Silhouette, die direkt zu dir heraufstarrt.',
    sfx: 'ambient',
    choices: [
      { text: 'Weg vom Fenster. Tür öffnen.', next: 'hallway_door', health: 0, sanity: -10 },
      { text: 'Gegen das Fenster klopfen', next: 'window_knock', health: 0, sanity: -5 },
    ]
  },

  window_knock: {
    bg: 'outside',
    chapter: 'Kapitel I — Das Erwachen',
    text: 'Die Silhouette bewegt sich nicht. Dann — in einem Bruchteil einer Sekunde — steht sie direkt vor dem Fenster. Kein Gesicht. Nur eine glatte, weiße Oberfläche.',
    sfx: 'whisper',
    jumpscare: true,
    jumpDelay: 1500,
    choices: [
      { text: 'Zurückweichen und aus dem Raum fliehen', next: 'hallway_door', health: -10, sanity: -20 },
    ]
  },

  hallway_door: {
    bg: 'hallway',
    chapter: 'Kapitel I — Das Erwachen',
    text: 'Du stehst im Flur. Links: eine Treppe, die in die Dunkelheit hinabführt. Rechts: eine geschlossene Tür mit einem roten Handabdruck darauf. Vor dir: ein langer Gang — und am Ende bewegt sich etwas.',
    sfx: 'creak',
    choices: [
      { text: 'Die Treppe hinuntergehen', next: 'basement_entry', health: 0, sanity: -5 },
      { text: 'Die Tür mit dem Handabdruck öffnen', next: 'red_room', health: 0, sanity: -10 },
      { text: 'Den Gang entlanggehen', next: 'hallway_figure', health: -5, sanity: -15 },
    ]
  },

  hallway_figure: {
    bg: 'hallway',
    chapter: 'Kapitel I — Das Erwachen',
    text: 'Du gehst den Gang entlang. Das Ding am Ende dreht sich langsam um. Es hat Arme — zu viele Arme — die sich falsch bewegen, rückwärts, in die falsche Richtung. Es kommt auf dich zu.',
    sfx: 'ambient',
    jumpscare: true,
    jumpDelay: 2500,
    choices: [
      { text: 'RENNEN — zurück zur Treppe', next: 'basement_entry', health: -20, sanity: -20 },
      { text: 'RENNEN — zur roten Tür', next: 'red_room', health: -15, sanity: -15 },
    ]
  },

  red_room: {
    bg: 'attic',
    chapter: 'Kapitel II — Das Zimmer',
    text: 'Ein kleines Zimmer. Wände bedeckt mit Zeitungsausschnitten — alle haben dasselbe Datum: Heute. Auf dem Boden liegt ein Kinderspielzeug. Es dreht sich. Alleine. In der Ecke steht ein Stuhl — mit einer Figur darauf, den Kopf gesenkt.',
    sfx: 'ambient',
    choices: [
      { text: 'Die Figur auf dem Stuhl ansprechen', next: 'chair_figure', health: 0, sanity: -15 },
      { text: 'Die Zeitungsartikel lesen', next: 'newspaper', health: 0, sanity: -10, flag: 'read_news' },
      { text: 'Das Spielzeug nehmen', next: 'take_toy', health: 0, sanity: -5, item: 'toy' },
    ]
  },

  newspaper: {
    bg: 'attic',
    chapter: 'Kapitel II — Das Zimmer',
    text: 'Die Schlagzeile lautet: "GRENNI SCHLÄFT NICHT MEHR". Darunter ein Foto — von dir. Schlafend. Von heute Nacht. Der Artikel beschreibt deinen Tod — schon jetzt, als wäre er unvermeidlich.',
    sfx: 'whisper',
    choices: [
      { text: 'Zeitung zerreißen und ignorieren', next: 'chair_figure', health: 0, sanity: -20 },
      { text: 'Weiterlesen', next: 'newspaper_2', health: 0, sanity: -10 },
    ]
  },

  newspaper_2: {
    bg: 'attic',
    chapter: 'Kapitel II — Das Zimmer',
    text: '"...wurde gefunden um 03:47 Uhr. Das Haus stand leer. Keine Spuren eines Einbruchs. Nur ein einziger Satz, in die Wand geritzt: ICH HABE ZUGESCHAUT."',
    sfx: 'ambient',
    choices: [
      { text: 'Aufhören zu lesen', next: 'chair_figure', health: 0, sanity: -5 },
    ]
  },

  take_toy: {
    bg: 'attic',
    chapter: 'Kapitel II — Das Zimmer',
    text: 'Du greifst nach dem Spielzeug — eine kleine Musikbox. Beim Berühren spielt sie von selbst: ein verzerrtes Kinderlied in Moll. Die Figur auf dem Stuhl hebt langsam den Kopf.',
    sfx: 'creak',
    choices: [
      { text: 'Die Figur ansprechen', next: 'chair_figure', health: 0, sanity: -10 },
      { text: 'Aus dem Zimmer rennen', next: 'basement_entry', health: -10, sanity: -5 },
    ]
  },

  chair_figure: {
    bg: 'attic',
    chapter: 'Kapitel II — Das Zimmer',
    text: 'Du gehst auf die Figur zu. Sie hebt den Kopf. Es ist ein Mädchen — vielleicht zehn Jahre alt — mit leerem, weißem Blick. Ihre Lippen bewegen sich: "Du hättest nicht kommen sollen. Es weiß jetzt, dass du hier bist."',
    sfx: 'whisper',
    choices: [
      { text: '"Wer bist du?" fragen', next: 'girl_answer', health: 0, sanity: -5 },
      { text: '"Was ist Grenni?" fragen', next: 'grenni_truth', health: 0, sanity: -15 },
      { text: 'Zurück in den Keller', next: 'basement_entry', health: 0, sanity: 0 },
    ]
  },

  girl_answer: {
    bg: 'attic',
    chapter: 'Kapitel II — Das Zimmer',
    text: '"Ich bin das letzte Mädchen, das hierher kam. Ich dachte, ich könnte es stoppen." Eine Träne läuft über ihre Wange — schwarz wie Tinte. "Das konnte ich nicht."',
    sfx: 'whisper',
    choices: [
      { text: '"Was ist Grenni?" fragen', next: 'grenni_truth', health: 0, sanity: -10 },
      { text: '"Wie komme ich raus?" fragen', next: 'girl_escape', health: 0, sanity: 0 },
    ]
  },

  grenni_truth: {
    bg: 'attic',
    chapter: 'Kapitel II — Das Zimmer',
    text: 'Sie öffnet den Mund weit — zu weit. Aus ihrer Kehle kommt eine Stimme, tief und alt: "GRENNI IST DER HUNGER ZWISCHEN DEN WÄNDEN. GRENNI IST DAS VERGESSEN. GRENNI BIN ICH — UND ICH BIN AUCH DU."',
    sfx: 'ambient',
    jumpscare: true,
    jumpDelay: 3000,
    choices: [
      { text: 'Fliehen — Keller', next: 'basement_entry', health: -10, sanity: -25 },
    ]
  },

  girl_escape: {
    bg: 'attic',
    chapter: 'Kapitel II — Das Zimmer',
    text: '"Der Keller. Es gibt einen Tunnel. Aber Grenni ist schon dort." Sie schließt die Augen. "Nimm das Licht mit." In deiner Hand erscheint plötzlich ein kleines, flackerndes Feuerzeug.',
    sfx: 'whisper',
    item: 'lighter',
    flag: 'has_clue',
    choices: [
      { text: 'In den Keller gehen', next: 'basement_entry', health: 0, sanity: 5 },
    ]
  },

  basement_entry: {
    bg: 'basement',
    chapter: 'Kapitel III — Die Tiefe',
    text: 'Du steigst die knarrende Treppe hinunter. Die Luft wird schwerer, kälter — riecht nach Erde und etwas Süßlichem, das du nicht einordnen kannst. Unten: Dunkelheit. Fast vollständig. Nur ganz weit hinten — ein schwaches, rötliches Leuchten.',
    sfx: 'creak',
    choices: [
      { text: 'Auf das Licht zugehen', next: 'basement_light', health: 0, sanity: -5 },
      { text: 'An der Wand entlangtasten', next: 'basement_wall', health: -5, sanity: -10 },
      { text: 'Zurückgehen', next: 'hallway_door', health: -5, sanity: 5 },
    ]
  },

  basement_wall: {
    bg: 'basement',
    chapter: 'Kapitel III — Die Tiefe',
    text: 'Deine Hand gleitet über die feuchte Wand. Stein. Stein. Stein. Dann — Haut. Warme, atmende Haut. Die Wand atmet.',
    sfx: 'ambient',
    jumpscare: true,
    jumpDelay: 2000,
    choices: [
      { text: 'SCHNELL zum Licht', next: 'basement_light', health: -15, sanity: -20 },
    ]
  },

  basement_light: {
    bg: 'cellar',
    chapter: 'Kapitel III — Die Tiefe',
    text: 'Das Licht kommt aus einer Ritze in der Wand. Du drückst dagegen — sie gibt nach. Ein geheimer Raum. In der Mitte: ein Altar aus Knochen und altem Holz. Darauf liegt etwas, das aussieht wie eine Maske. Daneben: eine Tür mit einem Schloss.',
    sfx: 'whisper',
    choices: [
      { text: 'Die Maske aufheben', next: 'mask_take', health: 0, sanity: -20, item: 'mask' },
      { text: 'Die verschlossene Tür untersuchen', next: 'locked_door', health: 0, sanity: -5 },
      { text: 'Den Altar zerstören', next: 'destroy_altar', health: -20, sanity: -10 },
    ]
  },

  destroy_altar: {
    bg: 'cellar',
    chapter: 'Kapitel III — Die Tiefe',
    text: 'Du schlägst auf den Altar ein. Die Knochen splittern. Das Licht erlischt. Ein Schrei — von überall gleichzeitig — durchbohrt die Dunkelheit. Dann Stille. Dann: ein Schritt hinter dir.',
    sfx: 'jumpscare',
    jumpscare: true,
    jumpDelay: 1000,
    choices: [
      { text: 'RENNEN — blindlings', next: 'locked_door', health: -25, sanity: -25 },
    ]
  },

  mask_take: {
    bg: 'cellar',
    chapter: 'Kapitel III — Die Tiefe',
    text: 'Die Maske ist aus einem Material, das sich wie kein anderes anfühlt — kalt wie Eis, aber weich wie Haut. Als deine Finger sie berühren, siehst du einen Blitz: Ein Haus. Ein Kind. Eine Kreatur ohne Form, die durch Wände gleitet. Das bist du. Das warst immer du.',
    sfx: 'ambient',
    choices: [
      { text: 'Die Maske anlegen', next: 'mask_wear', health: -10, sanity: -30 },
      { text: 'Die Maske weglegen', next: 'locked_door', health: 0, sanity: 10 },
    ]
  },

  mask_wear: {
    bg: 'cellar',
    chapter: 'Kapitel III — Die Tiefe',
    text: 'Dunkelheit. Dann Klarheit. Du siehst — alles. Durch die Wände, durch die Zeit. Du siehst Grenni. Du siehst, was Grenni war: ein Kind, das in diesem Haus starb und sich weigerte zu verschwinden. Du siehst den Ausgang.',
    sfx: 'whisper',
    flag: 'saw_truth',
    choices: [
      { text: 'Zur Ausgangstür gehen', next: 'locked_door', health: 0, sanity: 20 },
    ]
  },

  locked_door: {
    bg: 'cellar',
    chapter: 'Kapitel IV — Der Ausgang',
    text: 'Eine massive Holztür. Das Schloss ist rostig, aber hält. An der Wand daneben: drei Symbole eingraviert — ein Auge, ein Herz, ein Mund. Eine Inschrift darunter: "Gib zurück, was Grenni gehört."',
    sfx: 'creak',
    choices: [
      { text: 'Das Auge-Symbol drücken', next: 'symbol_eye', health: 0, sanity: -10 },
      { text: 'Das Herz-Symbol drücken', next: 'symbol_heart', health: -20, sanity: 0 },
      { text: 'Den Mund sprechen lassen — deinen Namen rufen', next: 'symbol_mouth', health: 0, sanity: -15 },
    ]
  },

  symbol_eye: {
    bg: 'cellar',
    chapter: 'Kapitel IV — Der Ausgang',
    text: 'Das Auge-Symbol leuchtet auf. Deine Augen brennen. Du siehst dich selbst von außen — wie du dort stehst, zitternd, klein, verloren. Grenni sieht durch dich. Die Tür öffnet sich einen Spalt.',
    sfx: 'ambient',
    choices: [
      { text: 'Durch den Spalt zwängen', next: 'final_corridor', health: -10, sanity: -10 },
    ]
  },

  symbol_heart: {
    bg: 'cellar',
    chapter: 'Kapitel IV — Der Ausgang',
    text: 'Das Herz-Symbol glüht rot. Ein stechender Schmerz in deiner Brust. Du gibst Grenni etwas von dir — eine Erinnerung, die schmerzt. Als der Schmerz nachlässt, weißt du nicht mehr, warum du weinst. Die Tür springt auf.',
    sfx: 'creak',
    choices: [
      { text: 'Durch die Tür gehen', next: 'final_corridor', health: -5, sanity: 5 },
    ]
  },

  symbol_mouth: {
    bg: 'cellar',
    chapter: 'Kapitel IV — Der Ausgang',
    text: 'Du rufst deinen Namen in die Dunkelheit. Das Echo kommt zurück — aber in einer anderen Stimme, tiefer, gebrochen. "Das bin ich jetzt." sagt die Stimme. Die Tür öffnet sich. Du gehst hindurch.',
    sfx: 'whisper',
    choices: [
      { text: 'Weitergehen', next: 'final_corridor', health: 0, sanity: -20 },
    ]
  },

  final_corridor: {
    bg: 'forest',
    chapter: 'Kapitel V — Das Ende',
    text: 'Ein langer Tunnel aus Erde und Wurzeln. Du kriechst hindurch. Deine Hände zittern. Dann — Licht. Echtes Licht. Grau, schwach, aber Licht. Du drückst dich durch eine Luke in den Boden eines Waldes.',
    sfx: 'ambient',
    choices: [
      { text: 'Aufstehen und rennen', next: 'escape_run', health: 0, sanity: 0 },
      { text: 'Zurückblicken', next: 'look_back', health: 0, sanity: -20 },
    ]
  },

  look_back: {
    bg: 'forest',
    chapter: 'Kapitel V — Das Ende',
    text: 'Du blickst zurück auf das Haus. Es steht dort, groß und schwarz gegen den bleigrauen Himmel. Im obersten Fenster — ein Schatten. Er winkt dir. Freundlich. Und du weißt: Er weiß, wo du wohnst.',
    sfx: 'whisper',
    choices: [
      { text: 'Rennen. Einfach rennen.', next: 'escape_run', health: -5, sanity: -15 },
    ]
  },

  escape_run: {
    bg: 'escape',
    chapter: 'Kapitel V — Das Ende',
    text: 'Du rennst. Der Wald fliegt an dir vorbei. Äste peitschen dein Gesicht. Dein Herz hämmert. Dann — eine Straße. Ein Auto. Du winkst. Es hält. Du steigst ein.',
    sfx: 'success',
    choices: [
      { text: '"Ich brauche Hilfe" sagen', next: 'ending', health: 0, sanity: 0 },
    ]
  },

  ending: {
    bg: 'escape',
    chapter: 'Epilog',
    text: 'Der Fahrer dreht sich zu dir um. Leere, weiße Augen. Ein breites Lächeln. "Wohin darf ich Sie bringen?" Du schaust auf die Straße — und erkennst das Haus. Wieder. Überall. Auf jedem Schild. Hinter jedem Fenster. Grenni schläft nicht.',
    sfx: 'whisper',
    jumpscare: true,
    jumpDelay: 3500,
    choices: [
      { text: 'Das Spiel beenden', next: '__win__', health: 0, sanity: 0 },
    ]
  },
};

// ===== DOM REFS =====
const screens = {
  intro: document.getElementById('screen-intro'),
  game: document.getElementById('screen-game'),
  jumpscare: document.getElementById('screen-jumpscare'),
  death: document.getElementById('screen-death'),
  win: document.getElementById('screen-win'),
};
const storyText    = document.getElementById('story-text');
const typingCursor = document.getElementById('typing-cursor');
const choicesBox   = document.getElementById('choices-box');
const heartBar     = document.getElementById('heart-bar');
const sanityVal    = document.getElementById('sanity-val');
const chapterText  = document.getElementById('chapter-text');
const sceneImage   = document.getElementById('scene-image');
const sceneOverlay = document.getElementById('scene-overlay');
const deathMsg     = document.getElementById('death-msg');
const jumpscareImg = document.getElementById('jumpscare-img');

// ===== SCREEN MANAGER =====
function showScreen(name) {
  Object.values(screens).forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  screens[name].style.display = 'flex';
  screens[name].classList.add('active');
}

// ===== TYPING EFFECT =====
let typingTimeout = null;
function typeText(text, cb) {
  if (typingTimeout) clearTimeout(typingTimeout);
  storyText.textContent = '';
  typingCursor.style.display = 'inline';
  let i = 0;
  const speed = text.length > 200 ? 22 : 30;
  function next() {
    if (i < text.length) {
      storyText.textContent += text[i++];
      typingTimeout = setTimeout(next, speed);
    } else {
      typingCursor.style.display = 'none';
      if (cb) cb();
    }
  }
  next();
}

// ===== JUMPSCARE FACES (CSS generated) =====
const jumpscareColors = [
  '#cc0000','#aa0000','#880000','#dd1100','#ff0000'
];
function triggerJumpscare(onDone) {
  playJumpscareSfx();
  jumpscareImg.style.background =
    `radial-gradient(ellipse at 50% 40%, ${jumpscareColors[Math.floor(Math.random()*jumpscareColors.length)]} 0%, #000 70%)`;

  // Draw a scary face using canvas
  const cvs = document.createElement('canvas');
  cvs.width = 400; cvs.height = 400;
  const c = cvs.getContext('2d');
  c.fillStyle = '#000';
  c.fillRect(0,0,400,400);
  // Face
  c.beginPath();
  c.arc(200,200,160,0,Math.PI*2);
  c.fillStyle = '#1a0000';
  c.fill();
  // Eyes
  c.fillStyle = '#fff';
  c.beginPath(); c.ellipse(140,160,35,50,0,0,Math.PI*2); c.fill();
  c.beginPath(); c.ellipse(260,160,35,50,0,0,Math.PI*2); c.fill();
  // Pupils
  c.fillStyle = '#000';
  c.beginPath(); c.arc(148,165,18,0,Math.PI*2); c.fill();
  c.beginPath(); c.arc(268,165,18,0,Math.PI*2); c.fill();
  // Red irises
  c.fillStyle = 'rgba(180,0,0,0.6)';
  c.beginPath(); c.arc(148,165,10,0,Math.PI*2); c.fill();
  c.beginPath(); c.arc(268,165,10,0,Math.PI*2); c.fill();
  // Mouth
  c.strokeStyle = '#ff0000';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(100,290);
  c.bezierCurveTo(150,350,250,350,300,290);
  c.stroke();
  // Teeth
  c.fillStyle = '#e8e8e8';
  for(let t=0;t<6;t++){
    c.fillRect(130+t*28,294,20,30);
  }
  // Cracks/scars
  c.strokeStyle = '#8b0000'; c.lineWidth=2;
  c.beginPath(); c.moveTo(140,120); c.lineTo(130,90); c.lineTo(120,100); c.stroke();
  c.beginPath(); c.moveTo(260,120); c.lineTo(270,85); c.lineTo(285,95); c.stroke();

  jumpscareImg.style.backgroundImage = `url(${cvs.toDataURL()})`;
  jumpscareImg.style.backgroundSize = 'contain';
  jumpscareImg.style.backgroundRepeat = 'no-repeat';
  jumpscareImg.style.backgroundPosition = 'center';

  showScreen('jumpscare');
  document.body.classList.add('shake');

  setTimeout(() => {
    showScreen('game');
    document.body.classList.remove('shake');
    if (onDone) onDone();
  }, 800);
}

// ===== SCENE RENDER =====
function renderScene(sceneId) {
  const scene = scenes[sceneId];
  if (!scene) return;

  // Apply item/flag from scene definition
  if (scene.item && !state.inventory.includes(scene.item)) {
    state.inventory.push(scene.item);
  }
  if (scene.flag) state.flags[scene.flag] = true;

  // Update bg
  sceneImage.style.background = sceneStyles[scene.bg] || sceneStyles.bedroom;
  chapterText.textContent = scene.chapter || '';

  // Update status
  updateStatus();

  // Play sfx
  const sfxMap = {
    ambient: playScaryAmbient,
    creak: playDoorCreak,
    whisper: playWhisper,
    jumpscare: playJumpscareSfx,
    success: playSuccess,
  };
  if (scene.sfx && sfxMap[scene.sfx]) {
    setTimeout(() => sfxMap[scene.sfx](), 300);
  }

  // Type text then show choices
  choicesBox.innerHTML = '';
  typeText(scene.text, () => {
    if (scene.jumpscare) {
      setTimeout(() => {
        triggerJumpscare(() => showChoices(scene.choices));
      }, scene.jumpDelay || 2000);
    } else {
      showChoices(scene.choices);
    }
  });
}

function showChoices(choices) {
  choicesBox.innerHTML = '';
  (choices || []).forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice.text;
    btn.addEventListener('click', () => handleChoice(choice));
    choicesBox.appendChild(btn);
  });
}

function handleChoice(choice) {
  ensureAudio();
  choicesBox.innerHTML = '';

  // Apply stat changes
  if (choice.health) state.health = Math.max(0, Math.min(100, state.health + choice.health));
  if (choice.sanity) state.sanity = Math.max(0, Math.min(100, state.sanity + choice.sanity));

  updateStatus();

  // Check death conditions
  if (state.health <= 0) {
    showDeath('Dein Körper gab auf. Grenni hatte gewonnen.');
    return;
  }
  if (state.sanity <= 0) {
    showDeath('Dein Verstand zerbrach unter dem Gewicht von Grenni. Du bliebst für immer hier.');
    return;
  }

  // Random ambient heartbeat
  if (Math.random() < 0.3) {
    setTimeout(playHeartbeat, 400);
  }

  const next = choice.next;
  if (next === '__win__') {
    showWin();
    return;
  }

  state.sceneId = next;
  renderScene(next);
}

function updateStatus() {
  heartBar.style.width = state.health + '%';
  if (state.health < 30) {
    heartBar.style.background = '#ff0000';
    document.getElementById('heart-icon').style.animationDuration = '0.4s';
  } else if (state.health < 60) {
    heartBar.style.background = '#aa0000';
    document.getElementById('heart-icon').style.animationDuration = '0.7s';
  } else {
    heartBar.style.background = 'var(--blood)';
    document.getElementById('heart-icon').style.animationDuration = '1s';
  }
  sanityVal.textContent = state.sanity;
  if (state.sanity < 30) {
    sanityVal.style.color = '#ff4400';
    applyInsanityEffect();
  } else {
    sanityVal.style.color = '#c8b89a';
  }
}

let insanityInterval = null;
function applyInsanityEffect() {
  if (insanityInterval) return;
  insanityInterval = setInterval(() => {
    if (state.sanity < 30 && Math.random() < 0.15) {
      document.body.style.transform = `rotate(${(Math.random()-0.5)*2}deg)`;
      setTimeout(() => { document.body.style.transform = ''; }, 200);
    }
    if (state.sanity >= 30) {
      clearInterval(insanityInterval);
      insanityInterval = null;
    }
  }, 3000);
}

function showDeath(msg) {
  deathMsg.textContent = msg;
  showScreen('death');
  playScaryAmbient();
}

function showWin() {
  showScreen('win');
  setTimeout(playScaryAmbient, 500);
}

function restartGame() {
  state = { sceneId: 'start', health: 100, sanity: 100, inventory: [], flags: {} };
  if (insanityInterval) { clearInterval(insanityInterval); insanityInterval = null; }
  showScreen('game');
  renderScene('start');
}

// ===== INIT =====
document.getElementById('btn-start').addEventListener('click', () => {
  ensureAudio();
  showScreen('game');
  renderScene('start');
  playScaryAmbient();
});
