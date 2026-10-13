import * as THREE from 'three';
import { assessDriving, assessRailCrossing, canCreditStop, inSchoolZone } from './driving-rules.js';
import { nextTrafficZ, overlapsPlayer } from './traffic-physics.js';
import { advanceIntro } from './intro-timing.js';
import { buildLessonWorlds, CITY_X, FREEWAY_X } from './lesson-worlds.js';
import { advanceTrafficScan, assessNextLesson, laneCheck, turnCheck } from './lesson-rules.js';
import { shuffledOptionIndices } from './question-options.js';
import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <header class="site-header">
    <div class="brand"><span class="brand-mark">F<span class="brand-line"></span>D</span><span><strong>FIRSTDRIVE.IO</strong><small>LEARN THE ROAD · BETA 01</small></span></div>
    <div class="header-center"><span class="live-dot"></span> <span id="headerLesson">FIRST DRIVE</span> <span class="header-divider"></span> SAN FRANCISCO INSPIRED</div>
    <div class="header-actions"><span class="voice-badge">INSTRUCTOR · FENRIR</span><button class="quiet-button" id="soundToggle" aria-label="Toggle instructor voice">VOICE ON</button><button class="quiet-button" id="resetButton">RESTART</button></div>
  </header>
  <main class="main-layout">
    <section class="game-shell welcome-mode" id="gameShell" aria-label="Driving simulator">
      <div id="scene" class="scene"></div>
      <div class="welcome-location">SAN FRANCISCO, CALIFORNIA <span>↗</span></div>
      <div class="vignette"></div>
      <div class="windshield-top"></div>
      <div class="windshield-pillar pillar-left" aria-hidden="true"></div>
      <div class="windshield-pillar pillar-right" aria-hidden="true"></div>
      <div class="driver-door" aria-hidden="true"></div>
      <div class="mirror mirror-center" role="button" tabindex="0" data-look="rear" aria-label="Check rearview mirror"><div class="mirror-scene"><span></span></div><small>REARVIEW · 1</small></div>
      <div class="mirror mirror-left" role="button" tabindex="0" data-look="left" aria-label="Check left mirror"><div class="mirror-scene"><span></span></div><small>LEFT MIRROR · 2</small></div>
      <div class="mirror mirror-right" role="button" tabindex="0" data-look="right" aria-label="Check right mirror"><div class="mirror-scene"><span></span></div><small>RIGHT MIRROR · 3</small></div>
      <div class="instructor-card" id="instructorCard"><div class="instructor-avatar">IN</div><div><div class="eyebrow">YOUR INSTRUCTOR</div><p id="instructorText">Welcome aboard. Let's take one careful route through a San Francisco neighborhood.</p></div></div>
      <div class="scene-status" id="sceneStatus"><span class="status-dot"></span> PARKED · READY TO BEGIN</div>
      <div class="feedback-toast hidden" id="toast" role="status"></div>
      <div class="drive-log hidden" id="driveLog" aria-live="polite"><strong>DRIVE LOG <span id="logCount">0</span></strong><ul id="liveEvents"></ul></div>
      <div class="impact-flash" id="impactFlash" aria-hidden="true"><span>✕</span></div>
      <div class="quiz-panel hidden" id="quizPanel" role="dialog" aria-modal="true" aria-labelledby="quizTitle"><div class="quiz-heading"><span id="quizIndex">DECISION 01 / 05</span><span class="quiz-icon">?</span></div><h2 id="quizTitle"></h2><p id="quizContext"></p><div class="answer-list" id="answerList"></div><div class="quiz-feedback" id="quizFeedback" role="status"></div></div>
      <div class="welcome-panel" id="welcomePanel"><h1 id="welcomeTitle">Your first<br><em>California drive.</em></h1><div class="lesson-choices" aria-label="Choose a practice lesson"><button class="lesson-choice selected" data-lesson="1">01 · FIRST DRIVE</button><button class="lesson-choice" data-lesson="2">02 · CITY SKILLS</button><button class="lesson-choice" data-lesson="3">03 · FREEWAY</button></div><button class="primary-button" id="startButton">START DRIVING <span>↗</span></button><small>Practice simulation · not an official DMV test <span id="bestScore"></span></small></div>
      <div class="result-panel hidden" id="resultPanel" role="dialog" aria-modal="true" aria-labelledby="resultTitle"><div class="eyebrow accent" id="resultEyebrow">ROUTE COMPLETE</div><h2 id="resultTitle">Nice work behind<br>the wheel.</h2><div class="result-score"><span id="resultScore">100</span><small>/ 100<br>PRACTICE SCORE</small></div><p id="resultSummary"></p><div class="result-log"><h3>DRIVE REVIEW</h3><ul id="resultEvents"></ul></div><button class="primary-button" id="driveAgain">DRIVE AGAIN <span>↗</span></button><button class="next-lesson-button hidden" id="nextLessonButton">NEXT LESSON ↗</button></div>
      <div class="cockpit">
        <div class="cockpit-sheen"></div>
        <div class="wheel-wrap"><div class="steering-wheel" id="steeringWheel"><div class="wheel-spoke one"></div><div class="wheel-spoke two"></div><div class="wheel-spoke three"></div><div class="wheel-center">CA</div></div></div>
        <div class="dashboard"><div class="dash-label">DRIVE STATUS</div><div class="dash-readout"><span class="signal-indicator" id="leftSignal">◀</span><div class="speed"><strong id="speedReadout">00</strong><span>MPH</span></div><span class="signal-indicator" id="rightSignal">▶</span></div><div class="dash-footer"><span id="gearReadout">PARK</span><span id="headlightsReadout">◌ LIGHTS OFF</span></div></div>
        <div class="control-deck"><div class="control-heading">VEHICLE CONTROLS</div><div class="control-row"><button id="leftButton" aria-label="Left signal">Q <span>◀ SIGNAL</span></button><button id="rightButton" aria-label="Right signal">E <span>SIGNAL ▶</span></button><button id="lightsButton" aria-label="Toggle headlights">L <span>LIGHTS</span></button></div><div class="shoulder-row"><button id="leftShoulder" aria-label="Check left shoulder blind spot">4 · LEFT SHOULDER</button><button id="rightShoulder" aria-label="Check right shoulder blind spot">5 · RIGHT SHOULDER</button></div><div class="traffic-look-row"><button id="lookLeft" aria-label="Look left for cross traffic">6 · LOOK LEFT</button><button id="lookRight" aria-label="Look right for cross traffic">7 · LOOK RIGHT</button></div><div class="control-hint">W / ↑ ACCELERATE · S / ↓ BRAKE<br>A / D STEER · 1–3 MIRRORS · 4–5 SHOULDERS · 6–7 LOOK</div></div>
      </div>
    </section>
    <div class="below-game"><div class="lesson-label"><span class="section-count" id="sectionCount">01 / 03</span><div><strong id="lessonName">FIRST DRIVE</strong><p id="lessonDescription">Read signs, turn, and cross the tracks safely.</p></div></div><div class="lesson-progress"><span class="progress-step active" data-progress="1">01 <b>FIRST DRIVE</b></span><span class="progress-step" data-progress="2">02 <b>CITY SKILLS</b></span><span class="progress-step" data-progress="3">03 <b>FREEWAY</b></span></div><a href="https://www.dmv.ca.gov/portal/handbook/driving-test-criteria/driving-performance-evaluation-dpe-scoring-criteria/" target="_blank" rel="noopener noreferrer">DMV SCORING REFERENCE ↗</a></div>
  </main>
  <footer>Built for practice. Route geometry is simplified and inspired by San Francisco streets. This is not affiliated with the California DMV.</footer>
`;

const $ = (id) => document.getElementById(id);
document.body.classList.add('welcome-mode');
const viewport = $('scene');
const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bd3ee);
scene.fog = new THREE.FogExp2(0x9bd3ee, 0.0032);
const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.58;
viewport.appendChild(renderer.domElement);

const ambient = new THREE.HemisphereLight(0xffffff, 0x95a3a2, 2.2);
scene.add(ambient);
const sunLight = new THREE.DirectionalLight(0xffedc8, 2.5);
sunLight.position.set(-65, 105, -75);
scene.add(sunLight);

const mat = (color, roughness = 1) => new THREE.MeshStandardMaterial({ color, roughness });
function roadTexture(repeatX, repeatY) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#555b5b'; ctx.fillRect(0, 0, 256, 256);
  let seed = 7419;
  for (let i = 0; i < 5600; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0; const x = seed & 255;
    seed = (seed * 1664525 + 1013904223) >>> 0; const y = seed & 255;
    ctx.fillStyle = i % 3 ? '#666c6a' : '#414a4b';
    ctx.fillRect(x, y, i % 9 ? 1 : 2, 1);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}
const asphalt = new THREE.MeshStandardMaterial({ map: roadTexture(1, 30), roughness: 1 });
const asphaltAlt = new THREE.MeshStandardMaterial({ map: roadTexture(30, 1), roughness: 1 });
const sidewalk = mat(0xcbd0c5);
const curb = mat(0xe3e0d2);
const white = mat(0xf1eee0);
const yellow = mat(0xe0ad61);
const dark = mat(0x1b2933);
const grass = mat(0x94aa91);
let railGate, railTrain;
const railSignals = [];

function box(w, h, d, material, x, y, z, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function cylinder(rTop, rBottom, h, material, x, y, z, parent = scene, sides = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, sides), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function plane(w, h, material, x, y, z, parent = scene) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}
const sidingTexture = canvasTexture(256, 256, (c,w,h) => {
  c.fillStyle='#f1f0eb'; c.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=13){c.fillStyle='#d5d8d3';c.fillRect(0,y,w,2);c.fillStyle='#fff';c.fillRect(0,y+2,w,1);}
});
sidingTexture.wrapS=sidingTexture.wrapT=THREE.RepeatWrapping;sidingTexture.repeat.set(1,3);
const brickTexture = canvasTexture(256, 256, (c,w,h) => {
  c.fillStyle='#eee9df';c.fillRect(0,0,w,h);
  for(let row=0;row<10;row++){
    const y=row*26;
    for(let x=-30+(row%2)*28;x<w;x+=56){c.fillStyle=row%3?'#d8d1c5':'#e2d9cf';c.fillRect(x+2,y+2,52,22);}
  }
});
brickTexture.wrapS=brickTexture.wrapT=THREE.RepeatWrapping;brickTexture.repeat.set(2,2);

function makeWorld() {
  scene.background=canvasTexture(16,512,(c,w,h)=>{
    const sky=c.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,'#72b7e5');sky.addColorStop(.65,'#afdaf0');sky.addColorStop(1,'#e2edf0');
    c.fillStyle=sky;c.fillRect(0,0,w,h);
  });
  plane(800, 800, grass, 0, -0.13, 0);
  plane(19, 650, asphalt, 0, 0, 0);
  plane(650, 19, asphaltAlt, 0, 0.005, 0);
  // Sidewalks, pale curbs, and marked lanes.
  for (const side of [-1, 1]) {
    box(6.5, 0.17, 650, sidewalk, side * 13.2, 0.03, 0);
    box(0.28, 0.32, 650, curb, side * 9.7, 0.1, 0);
    box(650, 0.17, 6.5, sidewalk, 0, 0.03, side * 13.2);
    box(650, 0.32, 0.28, curb, 0, 0.1, side * 9.7);
    plane(0.17, 650, white, side * 8.6, 0.035, 0);
    plane(650, 0.17, white, 0, 0.04, side * 8.6);
  }
  for (const center of [-169.5, 169.5]) {
    for (const offset of [-.18, .18]) {
      plane(.12, 310, yellow, offset, .052, center);
      plane(310, .12, yellow, center, .054, offset);
    }
  }
  const sidewalkSeam = mat(0xaeb8af);
  for (let z = -300; z < 310; z += 16) {
    if (Math.abs(z) < 18) continue;
    for (const side of [-1, 1]) {
      plane(1.05, .1, white, side * 7.7, .045, z);
      plane(5.5, .045, sidewalkSeam, side * 13.2, .125, z);
    }
  }
  // The northbound approach has a real stopping space before the crosswalk.
  plane(8.5, 0.46, white, 4.35, 0.07, 12.1);
  for (let x = -7.5; x <= 7.5; x += 2.2) {
    plane(1.25, 4.9, white, x, 0.068, 5.8);
    plane(1.25, 4.9, white, x, 0.068, -5.8);
  }
  for (let z = -7.5; z <= 7.5; z += 2.2) {
    plane(4.9, 1.25, white, -5.8, 0.069, z);
    plane(4.9, 1.25, white, 5.8, 0.069, z);
  }
  for (let z = 66; z <= 76; z += 2.2) plane(17.5, 1.05, white, 0, .07, z);
  const seedColors = [0xe9bfae, 0xabc1b5, 0xe1d7be, 0xb9c4d0, 0xd0aab1, 0xc2c5a9];
  for (let i = -8; i <= 12; i++) {
    const z = i * 20 + 10;
    if (Math.abs(z) < 30) continue;
    for (const side of [-1, 1]) {
      if (side > 0 && z >= 50 && z <= 90) {
        if (z === 70) makeSchool(29, 70);
        continue;
      }
      const c = seedColors[(i + 20 + (side > 0 ? 2 : 0)) % seedColors.length];
      makeHouse(side * 29, z, c, i, side);
      if (i % 2 === 0) makeTree(side * 18.1, z - 6.5, 4.4 + ((i + 6) % 3) * .45);
      // Keep the first approach sightline clear of a lamp arm above the lane.
      if (i % 3 === 0 && !(side > 0 && z + 8 > 125)) makeLamp(side * 10.8, z + 8);
    }
  }
  for (let i = -3; i <= 3; i++) {
    const x = i * 46 + 22;
    if (Math.abs(x) < 30) continue;
    for (const side of [-1, 1]) {
      makeHouse(x, side * 29, seedColors[(i + 14 + (side > 0 ? 1 : 3)) % seedColors.length], i, side, true);
      makeTree(x - 16, side * 18, 4.2);
    }
  }
  makeStopSign(10.8, 16.8);
  makeHayesRightSign(10.8, 16.8);
  makeStreetSign(-10.8, -10.8);
  // Drivers see the residential limit before the school warning and 15 mph sign.
  makeSpeedSign(10.9, 193, 25, false);
  makeSchoolWarning(14, 171);
  makeSpeedSign(14, 125, 15, true);
  makeSpeedSign(14, 28, 25, false);
  makePedestrian(13.3, 74, 0xdb8849);
  makePedestrian(15.1, 78, 0x5b7e99);
  makeRailCrossing();
}
function makeHouse(x, z, color, i, side, rotated = false) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  g.rotation.y = rotated ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
  scene.add(g);
  const floors = 2 + Math.abs(i % 2), h = floors * 4.2;
  const wall = new THREE.MeshStandardMaterial({color,map:sidingTexture,roughness:1});
  const trim = mat(0xe9e4d8), roof = mat(0x555e60), glass = mat(0x416a7b, .2);
  const front = -8.08;
  box(14.8, .12, 16.8, mat(0x6e7b75), 0, .04, 0, g);
  box(14, h, 16, wall, 0, h / 2 + .2, 0, g);
  box(14.5, .32, 16.5, roof, 0, h + .43, 0, g);
  box(14.7, .4, .5, trim, 0, h + .25, front - .05, g);
  box(14.6, .24, .45, trim, 0, h - .28, front - .1, g);
  box(14.4, .33, 2, trim, 0, 1.05, front - .9, g);
  const door = mat(i % 3 ? 0x365969 : 0x815b48);
  box(2.15, 3.1, .22, door, 1.9, 1.73, front - .17, g);
  box(2.5, .24, .4, trim, 1.9, 3.35, front - .18, g);
  box(.15, .15, .17, mat(0xdac183), 2.62, 1.6, front - .31, g);
  box(4.25, 2.5, .2, mat(0xd8d6c9), -3.2, 1.55, front - .16, g);
  const garageLine = mat(0x9da6a2);
  for (let row = 0; row < 4; row++) box(4.25, .05, .23, garageLine, -3.2, 1 + row * .54, front - .29, g);
  for (let floor = 1; floor < floors; floor++) {
    for (let col = -1; col <= 1; col++) {
      const wx = col * 4.15, wy = floor * 4.15 + 2.25;
      box(2.95, 2.75, .28, trim, wx, wy, front - .18, g);
      box(2.5, 2.32, .31, glass, wx, wy, front - .37, g);
      box(.1, 2.4, .34, trim, wx, wy, front - .56, g);
      box(2.7, .12, .36, trim, wx, wy - .1, front - .57, g);
      box(3.2, .19, .75, trim, wx, wy - 1.45, front - .6, g);
    }
  }
  if (i % 3 === 0) {
    const wy = 6.4;
    box(3.55, 2.95, 1.05, trim, 0, wy, front - .7, g);
    box(3.05, 2.5, .12, glass, 0, wy, front - 1.3, g);
    box(.12, 2.55, .14, trim, 0, wy, front - 1.42, g);
    box(3.8, .18, 1.4, trim, 0, wy - 1.55, front - .8, g);
  }
  if (rotated) {
    for (const edge of [-1, 1]) {
      for (const floor of [1, 2]) {
        if (floor >= floors) continue;
        for (const depth of [-3.2, 3.2]) {
          box(.2, 2.1, 2.35, trim, edge * 7.1, floor * 4.15 + 2.2, depth, g);
          box(.23, 1.75, 2.03, glass, edge * 7.22, floor * 4.15 + 2.2, depth, g);
        }
      }
    }
  }
  if (i % 4 === 1) box(14.3, .16, 1.5, mat(0x546e69), 0, 3.5, front - .8, g);
  box(14.4, .18, .58, roof, 0, h + .55, front - .32, g);
}
function makeSchool(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.PI / 2; scene.add(g);
  const brick = new THREE.MeshStandardMaterial({color:0xa66251,map:brickTexture,roughness:1});
  const trim = mat(0xe4d7bd), glass = mat(0x46778b, .2);
  box(52, 11.5, 18, brick, 0, 5.8, 0, g);
  box(53, .48, 19, mat(0x4b5755), 0, 11.7, 0, g);
  box(52.7, .52, .5, trim, 0, 10.7, -9.1, g);
  for (let col = -4; col <= 4; col++) {
    if (col === 0) continue;
    for (const y of [3.2, 7.8]) {
      box(3.35, 3.1, .22, trim, col * 5.25, y, -9.12, g);
      box(2.75, 2.55, .24, glass, col * 5.25, y, -9.3, g);
      box(.1, 2.6, .27, trim, col * 5.25, y, -9.46, g);
    }
  }
  box(5.5, 4.8, .24, trim, 0, 2.5, -9.13, g);
  box(4.6, 4.1, .28, mat(0x315766), 0, 2.2, -9.3, g);
  box(.14, 4.1, .32, trim, 0, 2.2, -9.49, g);
  const label = canvasTexture(900, 130, (c, w, h) => {
    c.fillStyle = '#e9dfc6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#253f43'; c.font = '700 69px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('BAKER SCHOOL', w / 2, h / 2 + 4);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 2.05), new THREE.MeshBasicMaterial({ map: label }));
  sign.position.set(0, 8.4, -9.35); sign.rotation.y = Math.PI; g.add(sign);
}
function makeTree(x, z, scale) {
  cylinder(.3, .43, scale, mat(0x7a6354), x, scale / 2, z);
  const leaf = mat(0x608b6d);
  for (const [dx, dy, dz, r] of [[0, scale + 1.1, 0, 2.5],[-1.3, scale + .5, .3, 1.8],[1.1, scale + .7, -.5, 1.9]]) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaf); m.position.set(x + dx, dy, z + dz); scene.add(m);
  }
}
function makeLamp(x, z) {
  cylinder(.12, .17, 7.7, dark, x, 3.85, z);
  box(2.5, .15, .17, dark, x + (x > 0 ? -1.15 : 1.15), 7.75, z);
  box(.8, .14, .46, mat(0xffe2a8), x + (x > 0 ? -2.25 : 2.25), 7.66, z);
}
function makePedestrian(x, z, shirtColor) {
  const person = new THREE.Group(); person.position.set(x, 0, z); scene.add(person);
  const shirt = mat(shirtColor), pants = mat(0x3e4c53), skin = mat(0xb98563);
  box(.55, .8, .36, shirt, 0, 1.25, 0, person);
  cylinder(.21, .22, .46, skin, 0, 1.9, 0, person);
  for (const side of [-1,1]) {
    cylinder(.1, .1, .8, pants, side * .15, .48, 0, person);
    cylinder(.075, .075, .67, skin, side * .37, 1.16, 0, person);
  }
}
function makeStopSign(x, z) {
  cylinder(.09, .11, 3.4, mat(0x89918b), x, 1.7, z);
  const texture = canvasTexture(512, 512, c => {
    c.translate(256, 256);
    const octagon = radius => {
      c.beginPath();
      for (let n = 0; n < 8; n++) {
        const a = Math.PI / 8 + n * Math.PI / 4;
        const px = Math.cos(a) * radius, py = Math.sin(a) * radius;
        if (n === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath();
    };
    octagon(240); c.fillStyle = '#a9292b'; c.fill();
    octagon(218); c.strokeStyle = '#fff'; c.lineWidth = 16; c.stroke();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 140px Arial'; c.fillText('STOP', 0, 8);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
  sign.position.set(x, 3.75, z); scene.add(sign);
}
function makeStreetSign(x, z) {
  cylinder(.09,.11,4.6,mat(0x84938e),x,2.3,z);
  for (const [name, y, rotation] of [['HAYES ST',4.55,0],['BAKER ST',5.25,Math.PI/2]]) {
    const texture = canvasTexture(900, 170, (c,w,h) => {
      c.fillStyle='#176246'; c.fillRect(0,0,w,h);
      c.strokeStyle='#e9f3e7'; c.lineWidth=10; c.strokeRect(12,12,w-24,h-24);
      c.fillStyle='#fff'; c.textAlign='center'; c.textBaseline='middle'; c.font='800 106px Arial';
      c.fillText(name,w/2,h/2+7);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.1,.78),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
    sign.position.set(x,y,z); sign.rotation.y=rotation; scene.add(sign);
  }
}
function makeHayesRightSign(x, z) {
  const texture = canvasTexture(900, 190, (c,w,h) => {
    c.fillStyle='#176246'; c.fillRect(0,0,w,h);
    c.strokeStyle='#eef7e8'; c.lineWidth=12; c.strokeRect(12,12,w-24,h-24);
    c.fillStyle='#fff'; c.textAlign='center'; c.textBaseline='middle'; c.font='900 118px Arial';
    c.fillText('HAYES ST',w/2,h/2+4);
  });
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(4.9,1.04),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  panel.position.set(x,5.55,z);scene.add(panel);
}
function makeSpeedSign(x, z, limit, school) {
  cylinder(.07,.09,4.05,mat(0x89918b),x,2.02,z);
  const texture = canvasTexture(512, school ? 760 : 640, (c,w,h) => {
    c.fillStyle='#f8f8f4'; c.fillRect(0,0,w,h);
    c.strokeStyle='#202326'; c.lineWidth=19; c.strokeRect(20,20,w-40,h-40);
    c.fillStyle='#191d1e'; c.textAlign='center'; c.textBaseline='middle';
    if (school) { c.font='800 64px Arial'; c.fillText('SCHOOL',w/2,92); }
    c.font='800 82px Arial'; c.fillText('SPEED',w/2,school?206:105);
    c.fillText('LIMIT',w/2,school?292:192);
    c.font='900 294px Arial'; c.fillText(String(limit),w/2,school?485:393);
    if (school) {
      c.font='700 38px Arial'; c.fillText('WHEN CHILDREN',w/2,657);
      c.fillText('ARE PRESENT',w/2,704);
    }
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.25,school?3.34:2.8),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  sign.position.set(x,school?4.2:3.8,z); scene.add(sign);
}
function makeSchoolWarning(x, z) {
  cylinder(.07,.09,3.5,mat(0x89918b),x,1.75,z);
  const texture = canvasTexture(512,512,c => {
    c.fillStyle='#d9f24c'; c.beginPath();
    c.moveTo(256,18);c.lineTo(489,184);c.lineTo(489,490);c.lineTo(23,490);c.lineTo(23,184);c.closePath();c.fill();
    c.strokeStyle='#171e1c';c.lineWidth=17;c.stroke();
    c.fillStyle='#1b2420';
    c.beginPath();c.arc(197,185,32,0,Math.PI*2);c.arc(324,218,25,0,Math.PI*2);c.fill();
    c.lineCap='round';c.lineWidth=32;
    for(const [a,b] of [[[195,225],[203,355]],[[200,275],[135,323]],[[205,270],[283,311]],[[202,352],[145,440]],[[205,352],[265,440]],[[322,250],[320,367]],[[320,280],[267,329]],[[322,283],[385,325]],[[320,367],[272,445]],[[320,367],[372,445]]]){
      c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();
    }
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide}));
  sign.position.set(x,3.45,z);scene.add(sign);
  const plaque = canvasTexture(512,180,(c,w,h)=>{
    c.fillStyle='#d9f24c';c.fillRect(0,0,w,h);c.strokeStyle='#171e1c';c.lineWidth=14;c.strokeRect(8,8,w-16,h-16);
    c.fillStyle='#171e1c';c.font='800 115px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('AHEAD',w/2,h/2+5);
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.4,.84),new THREE.MeshBasicMaterial({map:plaque,side:THREE.DoubleSide}));
  panel.position.set(x,1.95,z);scene.add(panel);
}
function makeRailCrossing() {
  const timber = mat(0x635347), steel = mat(0xb8c3c1, .25);
  for (let z = -28; z <= 28; z += 2.3) box(4.5,.1,.36,timber,-45.75,.08,z);
  for (const x of [-47,-44.5]) box(.17,.16,58,steel,x,.17,0);
  // Stop line is over 15 feet ahead of the nearest rail.
  plane(.5,8,white,-36.5,.08,-4.4);
  const signCanvas=document.createElement('canvas');signCanvas.width=256;signCanvas.height=256;
  const c=signCanvas.getContext('2d');
  c.fillStyle='#ffd557';c.beginPath();c.arc(128,128,116,0,Math.PI*2);c.fill();
  c.lineWidth=10;c.strokeStyle='#25363b';c.stroke();
  c.fillStyle='#25363b';c.textAlign='center';c.textBaseline='middle';c.font='900 77px Arial';c.fillText('X',128,123);
  c.font='900 55px Arial';c.fillText('R',63,129);c.fillText('R',193,129);
  const roundTexture=new THREE.CanvasTexture(signCanvas);roundTexture.colorSpace=THREE.SRGBColorSpace;
  cylinder(.09,.11,3.1,steel,-19,1.55,-9.5);
  const advance=new THREE.Mesh(new THREE.PlaneGeometry(2.25,2.25),new THREE.MeshBasicMaterial({map:roundTexture,transparent:true,side:THREE.DoubleSide}));
  advance.position.set(-19,3.5,-9.5);advance.rotation.y=Math.PI/2;scene.add(advance);

  cylinder(.12,.15,4.1,steel,-40.5,2.05,-9.5);
  const crossTexture=canvasTexture(512,512,cc=>{
    cc.translate(256,256);
    for(const angle of [-Math.PI/4,Math.PI/4]){
      cc.save();cc.rotate(angle);cc.fillStyle='#fffdf0';cc.strokeStyle='#27343a';cc.lineWidth=8;
      cc.fillRect(-235,-37,470,74);cc.strokeRect(-235,-37,470,74);cc.restore();
    }
    for(const [angle,label] of [[-Math.PI/4,'RAILROAD'],[Math.PI/4,'CROSSING']]){
      cc.save();cc.rotate(angle);
      cc.fillStyle='#27343a';cc.font='900 52px Arial';cc.textAlign='center';cc.textBaseline='middle';
      cc.fillText(label,0,5);cc.restore();
    }
  });
  const cross=new THREE.Mesh(new THREE.PlaneGeometry(3.8,3.8),new THREE.MeshBasicMaterial({map:crossTexture,transparent:true,side:THREE.DoubleSide}));
  cross.position.set(-40.5,5.15,-9.5);cross.rotation.y=Math.PI/2;scene.add(cross);
  for(const z of [-10.15,-8.85]){
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.31,12,8),new THREE.MeshBasicMaterial({color:0x562723}));
    lamp.position.set(-40.25,3.55,z);scene.add(lamp);railSignals.push(lamp);
  }
  railGate=new THREE.Group();railGate.position.set(-40.5,2.55,-9.5);railGate.rotation.x=-1.35;scene.add(railGate);
  box(.22,.22,9.1,mat(0xfff6e4),0,0,4.55,railGate);
  for(let z=1;z<9;z+=2)box(.235,.24,.84,mat(0xd64237),0,0,z,railGate);

  railTrain=new THREE.Group();scene.add(railTrain);railTrain.position.set(-45.75,0,62);
  const red=mat(0xbd5446,.4), cream=mat(0xf5dfb6), glass=mat(0x314d60,.2);
  box(3.45,3.3,16,red,0,2.0,0,railTrain);
  box(3.55,.5,16.2,cream,0,2.4,0,railTrain);
  box(3.6,.45,16.3,mat(0x664f48),0,3.88,0,railTrain);
  for(const z of [-5.8,-3.4,-1,1.4,3.8,6.2]){
    box(.045,1.05,1.35,glass,1.77,2.93,z,railTrain);
    box(.045,1.05,1.35,glass,-1.77,2.93,z,railTrain);
  }
  for(const z of [-6.5,6.5]){
    for(const x of [-1.15,1.15])cylinder(.48,.48,.3,dark,x,.48,z,railTrain,12);
  }
}
function makeTrafficCar(color = 0x375e72) {
  const g = new THREE.Group(); scene.add(g);
  const body = mat(color, .3), windows = mat(0x243945, .2), tires = mat(0x17232b);
  box(4.2, 1.15, 2.1, body, 0, .85, 0, g);
  box(2.25, .84, 1.86, windows, -.15, 1.65, 0, g);
  for (const x of [-1.35,1.35]) for (const z of [-1.12,1.12]) {
    const wheel = cylinder(.48,.48,.2,tires,x,.48,z,g,16); wheel.rotation.x = Math.PI/2;
  }
  box(.15,.23,.45,mat(0xffe5a1),-2.08,.94,-.67,g);
  box(.15,.23,.45,mat(0xffe5a1),-2.08,.94,.67,g);
  return g;
}
makeWorld();
const trafficCar = makeTrafficCar();
trafficCar.position.set(24, 0, 3.5);
// Light traffic gives the road life without obstructing the guided stop-line exercise.
const ambientTraffic = [
  { car: makeTrafficCar(0xd4c9b8), x: 3.4, z: 27, heading: -Math.PI / 2, speed: -8.5 },
  { car: makeTrafficCar(0x8b3f3c), x: -3.5, z: 52, heading: Math.PI / 2, speed: 7.5 },
  { car: makeTrafficCar(0xc2c7c5), x: -3.5, z: -54, heading: Math.PI / 2, speed: 6.5 },
  { car: makeTrafficCar(0xb49a6b), x: 7.0, z: 82, heading: -Math.PI / 2, speed: 0 },
  { car: makeTrafficCar(0x3b6260), x: -7.0, z: 116, heading: Math.PI / 2, speed: 0 },
  { car: makeTrafficCar(0xddd9ca), x: 7.0, z: -48, heading: -Math.PI / 2, speed: 0 }
];
ambientTraffic.forEach(vehicle => {vehicle.initialZ=vehicle.z;vehicle.car.position.set(vehicle.x,0,vehicle.z);vehicle.car.rotation.y=vehicle.heading;});
const { cityTraffic, freewayTraffic } = buildLessonWorlds({ THREE, scene, box, cylinder, plane, mat, canvasTexture, makeTrafficCar });

const questions = [
  {
    title: 'At the next intersection, turn left.',
    context: 'You are approaching Hayes Street. What should you do as you prepare?',
    options: [
      'Signal left in advance, check the left mirror and shoulder, watch traffic, and slow smoothly.',
      'Move toward the centerline first and signal only when you begin turning.',
      'Stop immediately in your lane, then decide whether a turn is possible.',
      'Turn on the hazard lights so every driver knows you are changing direction.'
    ],
    correct: 0,
    explanation: 'Good. Signal before the turn and check over the left shoulder before steering. The left indicator is now on.',
    cue: 'At Hayes Street, turn left.'
  },
  {
    title: 'What does this intersection require?',
    context: 'Use the sign and the white line in your road view.',
    options: [
      'After the crosswalk, where the view of traffic is clearest.',
      'Before the limit line, then edge forward only if the view is blocked.',
      'Beside the STOP sign even if that places you past the limit line.',
      'Only stop if another car is already waiting at the intersection.'
    ],
    correct: 1,
    explanation: 'Correct. Brake with S or ↓ and stop before the white limit line. Then assess the intersection.',
    cue: null
  },
  {
    title: 'You have stopped before Hayes Street.',
    context: 'A car is crossing the intersection. What is the safest next move?',
    options: [
      'Check left, right, and left again; yield until the crossing car clears.',
      'Look only toward the lane you will enter and turn quickly.',
      'Proceed because your turn signal gives you the right of way.',
      'Turn off the signal and wait for the next vehicle to wave you through.'
    ],
    correct: 0,
    explanation: 'Exactly. The crossing car will pass. Check again, then make a smooth left turn when safe.',
    cue: null
  },
  {
    title: 'What does the round yellow sign mean?',
    context: 'Look at the sign on the approach along Hayes Street.',
    options: [
      'Railroad crossing ahead; slow down, look and listen, and be ready to stop.',
      'A road narrows ahead; move across the centerline to keep clear.',
      'No stopping at any time, including when warning lights flash.',
      'A school zone begins; keep the car at exactly 15 mph.'
    ],
    correct: 0,
    explanation: 'Correct. That advance warning sign marks a railroad crossing ahead.',
    cue: null
  },
  {
    title: 'You reach the crossing. What now?',
    context: 'Use the lights, gate, and tracks in your road view.',
    options: [
      'Stop before the crossing, at least 15 feet from the nearest rail, and wait until the lights stop.',
      'Cross if the train looks far away and the gate has not reached the road.',
      'Stop directly on the tracks so you can check both directions.',
      'Go as soon as the gate rises, even if the red lights continue flashing.'
    ],
    correct: 0,
    explanation: 'Correct. Stay before the line while the lights flash. Cross only when the signal clears and the road beyond is open.',
    cue: null
  }
];

const cityQuestions = [
  { title:'Move into the right lane when safe.', context:'You are in the left of two northbound lanes. What should happen before you steer?',
    options:['Signal right, check the right mirror and blind spot, choose a clear gap, then move smoothly.','Signal only after your car crosses the lane marking.','Check the rearview mirror only, then move over immediately.','Brake hard so the cars behind you have to make room.'], correct:0,
    explanation:'Good. Make the mirror and shoulder checks yourself, then use E and steer gently into the right lane.', cue:'When safe, change to the right lane.' },
  { title:'At the next intersection, turn right.', context:'There is a marked bike lane near the corner. What is the safest setup?',
    options:['Signal, check the right mirror and shoulder for a cyclist, look left and right for traffic, yield, and turn into the right lane.','Turn from the left lane because it gives a wider arc.','Watch only the traffic signal; cyclists must stop for you.','Cut across the bike lane without looking if the light is green.'], correct:0,
    explanation:'Correct. Check for a cyclist and scan cross traffic before turning. A green signal does not remove that duty.', cue:'At the next intersection, turn right.' },
  { title:'Make a U-turn at the next intersection.', context:'What must you check before beginning the turn?',
    options:['Confirm U-turns are allowed, signal left, check the left mirror and shoulder, and yield until the view is clear.','Turn immediately from the middle of the block without checking traffic.','Stop in a through lane until all traffic behind you has passed.','Cross the centerline at any point because a U-turn always has priority.'], correct:0,
    explanation:'Good. Wait for the marked junction and a clear gap, then steer left into the opposite travel lane.', cue:'At the next intersection, make a U-turn when safe.' }
];
const freewayQuestions = [
  { title:'Join the freeway when safe.', context:'The entrance lane is ending. What is the best merge?',
    options:['Signal left, check mirror and blind spot, find a gap, and build speed close to freeway traffic.','Stop at the end of the ramp and wait for all traffic to pass.','Drive over the striped gore area to shorten the merge.','Assume freeway traffic must yield and move over without checking.'], correct:0,
    explanation:'Correct. Check the traffic gap yourself, then merge smoothly before the ramp ends.', cue:'Join the freeway when safe.' },
  { title:'Take the next exit.', context:'The exit is ahead on the right. What is the safest sequence?',
    options:['Signal early, check the right mirror and shoulder, move one lane at a time, and slow on the exit ramp.','Brake to ramp speed in the freeway lane before signaling.','Cut across the solid white gore area at the last moment.','Wait until the exit starts to signal and check the mirror.'], correct:0,
    explanation:'Good. Signal now; make the checks and move onto the ramp when its opening is clear.', cue:'Take the next exit.' }
];
const lessonInfo = {
  1:{ name:'FIRST DRIVE', description:'Read signs, turn, and cross the tracks safely.', start:[3.5,215,0], intro:'Your first<br><em>California drive.</em>' },
  2:{ name:'CITY SKILLS', description:'Lane change, right turn, and legal U-turn.', start:[CITY_X+2.45,190,0], intro:'Your next<br><em>California drive.</em>' },
  3:{ name:'FREEWAY', description:'Supplemental practice: merge and take an exit.', start:[FREEWAY_X+16.3,230,0], intro:'Your freeway<br><em>California drive.</em>' }
};
const activeQuestions = () => state.lesson===1?questions:state.lesson===2?cityQuestions:freewayQuestions;
const lastQuestionOrders = new Map();

const START_Z = 215;
const state = {
  lesson:1, phase: 'welcome', step: 'intro', x: 3.5, z: START_Z, yaw: 0, speed: 0,
  signal: 'off', lights: false, voice: true, look: 0, lookUntil: 0,
  keys: new Set(), mistakes: [], wrongAnswers: 0, stopped: false,
  trafficX: 23, trafficMoving: false, speedingTimer: 0, steering: 0,
  railPhase: 'idle', railTimer: 0, trainZ: 62, trackStopTimer: 0, railLooked: false,
  seen: new Set(), trafficScan: [], elapsed: 0, freeDriveTime: 0, missedDirections:0, recovery:null,
  laneChecked:false, rightChecked:false, leftTurnChecked:false, mergeChecked:false, exitChecked:false, uturnChecked:false
};
let toastTimer;
const voiceClips = new Map([
  [questions[0].cue, 'turn-left'],
  [cityQuestions[0].cue,'city-lane'],
  [cityQuestions[1].cue,'city-right'],
  [cityQuestions[2].cue,'city-uturn'],
  [freewayQuestions[0].cue,'freeway-merge'],
  [freewayQuestions[1].cue,'freeway-exit'],
  ['Please turn around when it is safe and return to the last direction.','turn-around'],
  ['Continue ahead. We will rejoin the route at the next safe point.','continue-safe'],
  ['Continue straight on Hayes Street.', 'continue-hayes'],
  ['Nice work! You finished the route. Check your practice score, and take another drive whenever you’re ready.', 'finish'],
  ['The drive has ended after a critical error. Review your drive log, then try again.', 'failed']
]);
let currentAudio = null;
let crossingAudioContext = null;
let lastBellBeat = -1;
function ringCrossingBell() {
  if (!crossingAudioContext) return;
  const now = crossingAudioContext.currentTime;
  const oscillator = crossingAudioContext.createOscillator();
  const gain = crossingAudioContext.createGain();
  oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(760, now);
  oscillator.frequency.exponentialRampToValueAtTime(540, now + .23);
  gain.gain.setValueAtTime(.045, now);
  gain.gain.exponentialRampToValueAtTime(.001, now + .28);
  oscillator.connect(gain).connect(crossingAudioContext.destination);
  oscillator.start(now); oscillator.stop(now + .3);
}
function say(text, updateText = true) {
  if (updateText) $('instructorText').textContent = text;
  currentAudio?.pause(); currentAudio = null;
  if (!state.voice) return;
  const clip = voiceClips.get(text);
  if (!clip) return;
  currentAudio = new Audio(`${import.meta.env.BASE_URL}audio/${clip}.wav`);
  currentAudio.play().catch(() => {});
}
function toast(text, kind = 'info') {
  const el = $('toast'); el.textContent = text; el.dataset.kind = kind; el.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), 4200);
}
function recordEvent(message, penalty, severity = 'warning') {
  if (state.mistakes.some(m => m.message === message)) return;
  state.mistakes.push({ message, penalty, severity });
  $('driveLog').classList.remove('hidden');
  $('logCount').textContent = state.mistakes.length;
  const item = document.createElement('li');
  item.className = severity;
  item.textContent = `${severity === 'critical' ? '✕' : '⚠'} ${message}`;
  $('liveEvents').appendChild(item);
  if (state.phase === 'driving') toast(message, severity);
}
function mistake(message, penalty) {
  recordEvent(message, penalty, 'warning');
}
function populateResultLog() {
  $('resultEvents').replaceChildren();
  if (!state.mistakes.length) {
    const item = document.createElement('li'); item.textContent = 'No mistakes or warnings on this drive.';
    $('resultEvents').appendChild(item);
  } else {
    state.mistakes.forEach(event => {
      const item = document.createElement('li'); item.className = event.severity;
      item.textContent = `${event.severity === 'critical' ? 'CRITICAL' : 'WARNING'} · ${event.message}`;
      $('resultEvents').appendChild(item);
    });
  }
}
function fail(code) {
  if (state.phase !== 'driving') return;
  const reasons = {
    oncoming: 'You crossed the center divider into the oncoming lane.',
    stop: 'You crossed the marked limit line before a stop was recorded there.',
    'school-speed': 'You drove 10 mph or more above the posted school-zone limit.',
    speed: 'You drove 10 mph or more above the posted speed limit.',
    traffic: 'You entered the intersection while cross traffic was passing.',
    'car-collision': 'Your car collided with another vehicle.',
    'rail-active': 'You entered the railroad crossing while the red lights were flashing.',
    'rail-tracks': 'You stopped on the railroad tracks.',
    'ignored-directions':'You missed two directions, or continued after being asked to correct a missed direction.',
    'off-road':'You drove beyond the roadway.',
    'barrier':'You crossed the freeway barrier.',
    'early-uturn':'You began the U-turn before the requested intersection.',
    'wrong-turn-lane':'You entered the right turn from the wrong lane.',
    'unchecked-blind-spot':'You changed direction without checking the relevant mirror and blind spot.',
    'unchecked-turn-scan':'You turned right without checking cross traffic in both directions.'
  };
  const reason = reasons[code];
  recordEvent(reason, 100, 'critical');
  state.phase = 'failed'; state.speed = 0; state.signal = 'off'; state.keys.clear();
  $('quizPanel').classList.add('hidden');
  $('resultPanel').classList.add('failed');
  $('resultEyebrow').textContent = 'CRITICAL ERROR · TEST ENDED';
  $('resultTitle').textContent = 'This drive has ended.';
  $('resultScore').textContent = '—';
  $('resultSummary').textContent = reason + ' Review what happened, then restart the practice route.';
  $('driveAgain').innerHTML = 'RESTART TEST <span>↗</span>';
  $('nextLessonButton').classList.add('hidden');
  populateResultLog();
  $('resultPanel').classList.remove('hidden');
  if (code === 'oncoming' || code === 'traffic' || code === 'car-collision' || code === 'rail-active') {
    $('gameShell').classList.add('crash');
    setTimeout(() => $('gameShell').classList.remove('crash'), 1000);
  }
  say('The drive has ended after a critical error. Review your drive log, then try again.');
  updateHud();
}
function requestCorrection(label, checkpoint, cue) {
  if (state.recovery || state.phase !== 'driving') return;
  state.missedDirections++;
  if (state.missedDirections >= 2) { fail('ignored-directions'); return; }
  recordEvent(`Missed direction: ${label}.`, 15);
  state.recovery={ startYaw:state.yaw, distance:0, checkpoint, cue, mode:state.lesson===3?'continue':'turnaround' };
  if(state.lesson===3){
    say('Continue ahead. We will rejoin the route at the next safe point.');
    toast('MISSED DIRECTION · Continue ahead. The route will rejoin safely.', 'warning');
  } else {
    say('Please turn around when it is safe and return to the last direction.');
    toast('MISSED DIRECTION · Turn around when safe. Ignoring the next one ends the test.', 'warning');
  }
}
function updateRecovery(dt) {
  if (!state.recovery) return false;
  state.recovery.distance += state.speed * dt;
  if(state.recovery.mode==='continue' && (state.x<FREEWAY_X-1.5||state.x>FREEWAY_X+22.5)){fail('off-road');return true;}
  if ((state.recovery.mode==='turnaround' && Math.cos(state.yaw - state.recovery.startYaw) < -.48 && state.recovery.distance > 4) ||
      (state.recovery.mode==='continue' && state.recovery.distance > 28)) {
    const { checkpoint, cue } = state.recovery;
    [state.x,state.z,state.yaw]=checkpoint;
    state.speed=0;state.signal='off';state.seen.clear();state.recovery=null;
    say(cue);
    toast('Rejoined the route at a safe point. Follow the direction again.', 'info');
    return true;
  }
  if (state.recovery.distance > 65) { fail('ignored-directions'); return true; }
  return true;
}
function openQuestion(index) {
  // Pause the route while the driver decides, then resume at the same speed.
  // A quiz must never count as a physical stop at a limit line.
  state.phase = 'question';
  const q = activeQuestions()[index];
  $('quizIndex').textContent = `DECISION 0${index + 1} / 0${activeQuestions().length}`;
  $('quizTitle').textContent = q.title;
  $('quizContext').textContent = q.context;
  $('quizFeedback').textContent = '';
  $('answerList').innerHTML = '';
  const key = `${state.lesson}:${index}`;
  const order = shuffledOptionIndices(q.options.length, lastQuestionOrders.get(key));
  lastQuestionOrders.set(key, order);
  order.forEach((choice, i) => {
    const b = document.createElement('button'); b.className = 'answer';
    b.innerHTML = `<span class="answer-letter">${String.fromCharCode(65+i)}</span><span>${q.options[choice]}</span><span class="answer-arrow">↗</span>`;
    b.addEventListener('click', () => answer(index, choice, b));
    $('answerList').appendChild(b);
  });
  $('quizPanel').classList.remove('hidden');
  $('answerList').firstElementChild?.focus();
  if (q.cue) { $('instructorCard').classList.remove('hidden'); say(q.cue); }
}
function answer(qIndex, choice, button) {
  const q = activeQuestions()[qIndex];
  if (choice !== q.correct) {
    state.wrongAnswers++;
    recordEvent(`Decision ${qIndex + 1}: ${q.options[choice]}`, 5);
    button.classList.add('incorrect');
    button.disabled = true;
    $('quizFeedback').textContent = 'Not quite. Think about what keeps you and other road users safe, then try again.';
    return;
  }
  button.classList.add('correct');
  $('quizFeedback').textContent = q.explanation;
  Array.from($('answerList').children).forEach(el => el.disabled = true);
  setTimeout(() => {
    if (state.phase !== 'question') return;
    $('quizPanel').classList.add('hidden');
    if(state.lesson!==1) {
      const steps=state.lesson===2?['urban-lane','urban-right','urban-uturn']:['freeway-merge','freeway-exit'];
      state.step=steps[qIndex];state.phase='driving';state.seen.clear();state.trafficScan=[];
      toast('Decision recorded. Use the vehicle controls to carry it out.', 'success');
      updateHud();return;
    }
    if (qIndex === 0) { state.signal = 'left'; state.phase = 'driving'; state.step = 'approach'; toast('Decision recorded. Continue toward Hayes Street.', 'success'); }
    if (qIndex === 1) { state.phase = 'driving'; state.step = 'stop-drive'; toast('Decision recorded. Continue driving.', 'success'); }
    if (qIndex === 2) { state.phase = 'driving'; state.step = 'turn'; state.trafficMoving = true; state.seen.clear(); toast('Decision recorded. Continue to Hayes Street.', 'success'); }
    if (qIndex === 3) { state.phase = 'driving'; state.step = 'rail-approach'; state.railPhase = 'active'; state.railTimer = 0; state.trainZ = 62; state.seen.clear(); say('Continue straight on Hayes Street.'); }
    if (qIndex === 4) { state.phase = 'driving'; state.step = 'rail-stop'; toast('Decision recorded.', 'success'); }
    updateHud();
  }, 1000);
}
function start() {
  if (state.phase !== 'welcome') return;
  if (!crossingAudioContext && (window.AudioContext || window.webkitAudioContext)) {
    crossingAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  $('instructorCard').classList.add('hidden');
  $('welcomePanel').classList.add('hidden');
  document.body.classList.remove('welcome-mode');
  $('gameShell').classList.remove('welcome-mode');
  state.phase = 'driving'; state.step = state.lesson===1?'free-drive':state.lesson===2?'urban-intro':'freeway-intro'; state.freeDriveTime = 0;
  updateHud();
}
function selectLesson(lesson) {
  state.lesson=lesson;
  const info=lessonInfo[lesson];
  document.title=`FirstDrive.io — ${info.name}`;
  [state.x,state.z,state.yaw]=info.start;
  $('welcomeTitle').innerHTML=info.intro;
  $('headerLesson').textContent=info.name;
  $('sectionCount').textContent=`0${lesson} / 03`;
  $('lessonName').textContent=info.name;
  $('lessonDescription').textContent=info.description;
  document.querySelectorAll('.lesson-choice').forEach(button=>button.classList.toggle('selected',Number(button.dataset.lesson)===lesson));
  document.querySelectorAll('.progress-step').forEach(item=>item.classList.toggle('active',Number(item.dataset.progress)===lesson));
  updateHud();
}
function reset() {
  currentAudio?.pause(); currentAudio = null;
  state.phase='welcome'; state.step='intro'; [state.x,state.z,state.yaw]=lessonInfo[state.lesson].start; state.speed=0;
  state.signal='off'; state.lights=false; state.look=0; state.keys.clear(); state.mistakes=[]; state.wrongAnswers=0;
  state.stopped=false; state.trafficX=23; state.trafficMoving=false; state.speedingTimer=0; state.steering=0; state.seen.clear(); state.trafficScan=[]; state.elapsed=0; state.freeDriveTime=0;
  state.railPhase='idle'; state.railTimer=0; state.trainZ=62; state.trackStopTimer=0; state.railLooked=false;
  state.missedDirections=0;state.recovery=null;state.laneChecked=false;state.rightChecked=false;state.leftTurnChecked=false;
  state.mergeChecked=false;state.exitChecked=false;state.uturnChecked=false;
  lastBellBeat=-1;
  ambientTraffic.forEach(vehicle=>{vehicle.z=vehicle.initialZ;vehicle.car.position.z=vehicle.initialZ;});
  [...cityTraffic,...freewayTraffic].forEach(vehicle=>{vehicle.x=vehicle.initialX;vehicle.z=vehicle.initialZ;vehicle.car.position.set(vehicle.x,0,vehicle.z);});
  document.body.classList.add('welcome-mode'); $('gameShell').classList.add('welcome-mode');
  $('welcomePanel').classList.remove('hidden'); $('quizPanel').classList.add('hidden'); $('resultPanel').classList.add('hidden');
  $('resultPanel').classList.remove('failed'); $('gameShell').classList.remove('crash');
  $('driveLog').classList.add('hidden'); $('liveEvents').replaceChildren(); $('logCount').textContent='0';
  $('resultEyebrow').textContent='ROUTE COMPLETE'; $('resultTitle').innerHTML='Nice work behind<br>the wheel.';
  $('driveAgain').innerHTML='DRIVE AGAIN <span>↗</span>';
  $('nextLessonButton').classList.add('hidden');
  $('instructorText').textContent = "Welcome aboard. Let's take one careful route through a San Francisco neighborhood.";
  updateHud();
}
function finish() {
  state.phase='complete'; state.speed=0; state.signal='off';
  const score=Math.max(0,100-state.mistakes.reduce((sum,m)=>sum+m.penalty,0));
  $('resultScore').textContent=score;
  $('resultSummary').textContent = state.mistakes.length ? 'You completed the route. Review the warnings below and try to clear them on your next drive.' : state.lesson===1?'You read the signs, turned safely, and crossed the tracks after the signal cleared.':state.lesson===2?'You changed lanes, turned right, and completed a legal U-turn.':'You merged onto the freeway and took the exit safely.';
  populateResultLog();
  $('resultPanel').classList.remove('hidden');
  $('nextLessonButton').classList.toggle('hidden',state.lesson>=3);
  $('nextLessonButton').textContent=state.lesson===1?'NEXT: CITY SKILLS ↗':'NEXT: FREEWAY ↗';
  say('Nice work! You finished the route. Check your practice score, and take another drive whenever you’re ready.');
  try { const prev=Number(localStorage.getItem('california-drive-lab-best')||0); if(score>prev)localStorage.setItem('california-drive-lab-best',String(score)); } catch (_) {}
  showBest();
  updateHud();
}
function showBest() {
  try { const best=Number(localStorage.getItem('california-drive-lab-best')||0); $('bestScore').textContent=best?` · Best ${best}/100 saved on this device`:''; } catch (_) { $('bestScore').textContent=''; }
}
function toggleSignal(which) {
  state.signal=state.signal===which?'off':which;
  updateHud();
}
function updateHud() {
  $('speedReadout').textContent=String(Math.round(state.speed*2.23694)).padStart(2,'0');
  $('gearReadout').textContent=state.phase==='welcome'?'PARK':state.phase==='complete'?'ROUTE COMPLETE':state.phase==='failed'?'TEST ENDED':'DRIVE';
  $('headlightsReadout').textContent=state.lights?'◉ LIGHTS ON':'◌ LIGHTS OFF';
  $('leftSignal').classList.toggle('active',state.signal==='left'); $('rightSignal').classList.toggle('active',state.signal==='right');
  $('leftButton').classList.toggle('active',state.signal==='left'); $('rightButton').classList.toggle('active',state.signal==='right'); $('lightsButton').classList.toggle('active',state.lights);
  const status = state.phase==='welcome' ? 'PARKED · READY TO BEGIN' : state.phase==='question' ? 'DECISION PAUSED · CHOOSE AN ANSWER' : state.phase==='complete' ? 'ROUTE COMPLETE' : state.phase==='failed' ? 'TEST ENDED · CRITICAL ERROR' : state.recovery ? 'RETURN TO THE LAST DIRECTION' : state.lesson===2 ? state.step==='urban-lane'?'CITY · CHANGE TO RIGHT LANE':state.step==='urban-right'?'CITY · RIGHT TURN AHEAD':state.step==='urban-uturn'?'CITY · U-TURN AT NEXT JUNCTION':state.step==='urban-return'?'CITY · RETURN ALONG THE ROAD':'CITY · FREE DRIVE' : state.lesson===3 ? state.step==='freeway-merge'?'FREEWAY · MERGE WHEN SAFE':state.step==='freeway-exit'?'FREEWAY · EXIT AHEAD':state.step==='freeway-ramp'?'EXIT RAMP · DECELERATE FOR CURVE':state.step==='freeway-cruise'?'FREEWAY · KEEP A SAFE GAP':'ENTRANCE RAMP · FREE DRIVE' : state.step==='free-drive' ? 'BAKER ST · FREE DRIVE' : state.step.startsWith('rail') ? state.railPhase==='active' ? 'RAIL CROSSING · RED LIGHTS FLASHING' : 'RAIL CROSSING · SIGNAL CLEAR' : state.step==='turn' ? 'HAYES ST · CONTINUE ROUTE' : state.step==='stop-drive' ? 'BAKER ST · INTERSECTION AHEAD' : inSchoolZone(state.z) ? 'BAKER ST · SCHOOL ZONE' : 'BAKER ST · APPROACHING HAYES';
  if ($('sceneStatus').dataset.label !== status) {
    $('sceneStatus').innerHTML=`<span class="status-dot"></span> ${status}`;
    $('sceneStatus').dataset.label=status;
  }
  $('steeringWheel').style.transform=`rotate(${state.steering*24}deg)`;
}

$('startButton').addEventListener('click',start);
$('driveAgain').addEventListener('click',reset);
$('nextLessonButton').addEventListener('click',()=>{if(state.lesson<3){selectLesson(state.lesson+1);reset();start();}});
$('resetButton').addEventListener('click',reset);
document.querySelectorAll('.lesson-choice').forEach(button=>button.addEventListener('click',()=>{
  if(state.phase==='welcome')selectLesson(Number(button.dataset.lesson));
}));
$('soundToggle').addEventListener('click',()=>{state.voice=!state.voice; $('soundToggle').textContent=state.voice?'VOICE ON':'VOICE OFF'; if(!state.voice)currentAudio?.pause();});
$('leftButton').addEventListener('click',()=>toggleSignal('left'));
$('rightButton').addEventListener('click',()=>toggleSignal('right'));
$('lightsButton').addEventListener('click',()=>{state.lights=!state.lights;updateHud();});
document.querySelectorAll('.mirror').forEach(el => {
  const look = () => { const side=el.dataset.look; state.seen.add(side); state.look=side==='left'?-0.8:side==='right'?0.8:Math.PI; state.lookUntil=performance.now()+1300; toast(`${side.toUpperCase()} view checked`, 'info'); };
  el.addEventListener('click',look); el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();look();}});
});
for(const [side,id] of [['left','leftShoulder'],['right','rightShoulder']]) {
  $(id).addEventListener('click',()=>{
    if(state.phase!=='driving')return;
    state.seen.add(`${side}-shoulder`);
    state.look=side==='left'?-1.55:1.55;state.lookUntil=performance.now()+1450;
    toast(`${side.toUpperCase()} blind spot checked`,'info');
  });
}
for (const [side,id] of [['left','lookLeft'],['right','lookRight']]) {
  $(id).addEventListener('click',()=>{
    if(state.phase!=='driving')return;
    state.trafficScan=advanceTrafficScan(state.trafficScan,side);
    state.look=side==='left'?-1.05:1.05;state.lookUntil=performance.now()+1300;
    toast(`Looked ${side.toUpperCase()} for cross traffic`,'info');
  });
}
window.addEventListener('keydown', e => {
  const k=e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','q','e','l','1','2','3','4','5','6','7','escape'].includes(k))e.preventDefault();
  state.keys.add(k);
  if(e.repeat)return;
  if(k==='q')toggleSignal('left'); if(k==='e')toggleSignal('right'); if(k==='l'){$('lightsButton').click();}
  if(['1','2','3'].includes(k))document.querySelectorAll('.mirror')[{1:0,2:1,3:2}[k]].click();
  if(k==='4')$('leftShoulder').click();if(k==='5')$('rightShoulder').click();
  if(k==='6')$('lookLeft').click();if(k==='7')$('lookRight').click();
  if(k==='escape'&&state.phase==='driving')toast('Press RESTART to begin the route again.');
});
window.addEventListener('keyup',e=>state.keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>state.keys.clear());

function updateDriving(dt) {
  state.elapsed+=dt;
  const accelerating=state.keys.has('w')||state.keys.has('arrowup');
  const braking=state.keys.has('s')||state.keys.has('arrowdown');
  const left=state.keys.has('a')||state.keys.has('arrowleft');
  const right=state.keys.has('d')||state.keys.has('arrowright');
  const steer=(right?1:0)-(left?1:0);
  state.steering += (steer-state.steering)*Math.min(1,dt*8);
  if(accelerating)state.speed+=(state.lesson===3?3.5:2.2)*dt;
  else state.speed=Math.max(0,state.speed-.7*dt);
  if(braking)state.speed=Math.max(0,state.speed-6.2*dt);
  state.speed=Math.min(state.speed,state.lesson===3?32:19.5);
  state.yaw+=state.steering*Math.min(state.speed/8,1)*0.72*dt;
  state.x+=Math.sin(state.yaw)*state.speed*dt;
  state.z-=Math.cos(state.yaw)*state.speed*dt;
  const intro=['free-drive','urban-intro','freeway-intro'].includes(state.step)?advanceIntro(state.freeDriveTime,state.speed,dt):null;
  if(intro)state.freeDriveTime=intro.elapsed;
  const activeTraffic=state.lesson===1?ambientTraffic:state.lesson===2?cityTraffic:freewayTraffic;
  if(activeTraffic.some(vehicle=>overlapsPlayer(vehicle,state))) {fail('car-collision');return;}
  if(updateRecovery(dt))return;
  if(state.lesson!==1){updateNextLesson(intro,dt);return;}
  const mph=state.speed*2.23694;
  const assessment = assessDriving({ ...state, mph });
  if (assessment.critical) { fail(assessment.critical); return; }
  state.speedingTimer = assessment.speedWarning ? state.speedingTimer + dt : 0;
  if (state.speedingTimer > 1) mistake(`You exceeded the posted ${assessment.limit} mph limit.`, 10);
  if(intro?.ready) {openQuestion(0);return;}
  if(state.step==='approach'&&state.z<38)openQuestion(1);
  if(state.step==='stop-drive') {
    // A displayed 0 MPH should count across the final approach, not only
    // inside a narrow window that drivers cannot judge from this camera.
    if(!state.stopped&&canCreditStop(state)) {
      state.stopped=true;
      if(state.z>22)mistake('You stopped well before the limit line. Pull closer to it next time.',5);
      openQuestion(2);
    }
  }
  if(state.step==='turn') {
    if(state.z<-22&&state.x>-8){requestCorrection('left turn at Hayes Street',[3.5,55,0],'At Hayes Street, turn left.');return;}
    if(state.x<-18&&Math.abs(state.z)>12)mistake('Keep the car in the receiving lane after the turn.',10);
    if(state.x<-24&&state.signal!=='left'&&state.yaw<-.4)mistake('The left signal was off during the turn.',10);
    if(state.x<-10&&Math.abs(state.z)<12&&state.yaw<-.55) {
      if(!state.leftTurnChecked){
        state.leftTurnChecked=true;
        const missing=turnCheck({...state,side:'left'});
        if(missing.length)mistake(`Left turn: missing ${missing.join(', ')}.`,10);
      }
      openQuestion(3);
    }
  }
  if(state.step==='rail-approach'&&state.x<-27)openQuestion(4);
  if(state.step==='rail-stop') {
    state.trackStopTimer=state.x<-43&&state.x>-49&&state.speed<.2?state.trackStopTimer+dt:0;
    const railError=assessRailCrossing(state);
    if(railError){fail(railError);return;}
    if(state.x<-43&&!state.railLooked) {
      state.railLooked=true;
      if(!state.seen.has('left')||!state.seen.has('right'))mistake('You crossed the tracks without looking both ways.',10);
    }
    if(state.x<-95&&Math.abs(state.z)<12)finish();
  }
  if(Math.abs(state.x)>340||Math.abs(state.z)>340){mistake('You left the practice area.',10);state.x=3.5;state.z=START_Z;state.yaw=0;state.speed=0;}
}
function updateNextLesson(intro,dt) {
  const mph=state.speed*2.23694;
  const assessment=assessNextLesson({...state,mph});
  if(assessment.critical){fail(assessment.critical);return;}
  state.speedingTimer=assessment.speedWarning?state.speedingTimer+dt:0;
  if(state.speedingTimer>1)mistake(`You exceeded the posted ${assessment.limit} mph limit.`,10);
  if(intro?.ready){openQuestion(0);return;}
  if(state.lesson===2){
    const cx=state.x-CITY_X;
    if(state.step==='urban-lane'){
      if(cx>5.45&&!state.laneChecked){
        state.laneChecked=true;
        const missing=laneCheck({...state,side:'right',mph});
        if(missing.some(item=>item.includes('mirror')||item.includes('shoulder'))){fail('unchecked-blind-spot');return;}
        if(missing.length)mistake(`Lane change: missing ${missing.join(', ')}.`,10);
        else toast('Right lane change checked and completed.','success');
      }
      if(state.z<103&&state.laneChecked){openQuestion(1);return;}
      if(state.z<36&&!state.laneChecked){requestCorrection('right lane change',[CITY_X+2.45,155,0],'When safe, change to the right lane.');return;}
    }
    if(state.step==='urban-right'){
      if(cx>19&&state.z>-8&&state.z<12&&state.yaw>.65&&!state.rightChecked){
        state.rightChecked=true;
        const missing=turnCheck({...state,side:'right',scanTraffic:true});
        if(missing.length)mistake(`Right turn: missing ${missing.join(', ')}.`,10);
        state.signal='off';state.seen.clear();state.step='urban-cruise';
        toast('Right turn complete. Continue to the next intersection.','success');
      }
      if(state.z<-17&&cx<16){requestCorrection('right turn',[CITY_X+6.5,100,0],'At the next intersection, turn right.');return;}
    }
    if(state.step==='urban-cruise'&&cx>78){openQuestion(2);return;}
    if(state.step==='urban-uturn'){
      if(cx>154&&state.z>0){requestCorrection('U-turn at the intersection',[CITY_X+90,3.5,Math.PI/2],'At the next intersection, make a U-turn when safe.');return;}
      if(cx>102&&state.z<0&&state.yaw<-.7){
        const missing=turnCheck({...state,side:'left'});
        if(missing.length)mistake(`U-turn: missing ${missing.join(', ')}.`,10);
        state.step='urban-return';state.signal='off';
        toast('U-turn complete. Continue in the westbound lane.','success');
      }
    }
    if(state.step==='urban-return'&&cx<73&&state.z<0&&state.yaw<-.7){finish();return;}
  }
  if(state.lesson===3){
    const fx=state.x-FREEWAY_X;
    if(state.step==='freeway-merge'){
      if(fx<11.6&&!state.mergeChecked){
        state.mergeChecked=true;
        const missing=laneCheck({...state,side:'left',mph,freeway:true});
        if(missing.some(item=>item.includes('mirror')||item.includes('shoulder'))){fail('unchecked-blind-spot');return;}
        if(missing.length)mistake(`Freeway merge: missing ${missing.join(', ')}.`,10);
        state.step='freeway-cruise';state.signal='off';state.seen.clear();
        toast('Merge complete. Keep a safe gap and watch the exit signs.','success');
      }
      if(state.z<66&&!state.mergeChecked){requestCorrection('freeway merge',[FREEWAY_X+16.3,205,0],'Join the freeway when safe.');return;}
    }
    if(state.step==='freeway-cruise'&&state.z<110){openQuestion(1);return;}
    if(state.step==='freeway-exit'){
      if(fx>13.2&&state.z<18&&!state.exitChecked){
        state.exitChecked=true;
        const missing=laneCheck({...state,side:'right',mph});
        if(missing.some(item=>item.includes('mirror')||item.includes('shoulder'))){fail('unchecked-blind-spot');return;}
        if(missing.length)mistake(`Freeway exit: missing ${missing.join(', ')}.`,10);
        state.step='freeway-ramp';state.signal='off';
        toast('Exit lane entered. Decelerate on the ramp for the 35 mph advisory curve.','success');
      }
      if(state.z<-125&&!state.exitChecked){requestCorrection('freeway exit',[FREEWAY_X+8.2,110,0],'Take the next exit.');return;}
    }
    if(state.step==='freeway-ramp'&&state.z<-255&&mph>40)mistake('Exit curve: above the posted 35 mph advisory speed.',10);
    if(state.step==='freeway-ramp'&&state.z<-295&&fx>17){finish();return;}
  }
}
function animate() {
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  if(state.phase==='driving')updateDriving(dt);
  if(state.phase==='driving'&&state.railPhase==='active'){
    state.railTimer+=dt;
    state.trainZ-=9.5*dt;
    if(import.meta.env.DEV&&new URLSearchParams(location.search).get('preview')==='rail')state.trainZ=0;
    const bellBeat=Math.floor(state.railTimer/.75);
    if(bellBeat!==lastBellBeat){lastBellBeat=bellBeat;ringCrossingBell();}
    if(state.trainZ<-35){state.railPhase='clear';toast('Railroad signal clear.', 'success');}
  }
  railTrain.position.z=state.trainZ;
  railTrain.visible=state.railPhase==='active'&&state.trainZ>-35;
  const gateTarget=state.railPhase==='active'?0:-1.35;
  railGate.rotation.x+=(gateTarget-railGate.rotation.x)*Math.min(1,dt*3);
  railSignals.forEach((lamp,i)=>lamp.material.color.setHex(state.railPhase==='active'&&Math.floor(performance.now()/330)%2===i?0xff2925:0x562723));
  if(state.phase==='driving'&&state.trafficMoving) {state.trafficX=Math.max(-32,state.trafficX-7.5*dt);if(state.trafficX<=-32)state.trafficMoving=false;}
  trafficCar.visible=state.trafficX>-28;
  trafficCar.position.x=state.trafficX;
  if(state.phase==='driving'){
    for (const vehicle of ambientTraffic) {
      if (!vehicle.speed) continue;
      vehicle.z = nextTrafficZ(vehicle, dt, state);
      if (vehicle.z > 165) vehicle.z = -145;
      if (vehicle.z < -145) vehicle.z = 165;
      vehicle.car.position.z = vehicle.z;
    }
    for(const vehicle of cityTraffic){
      if(vehicle.heading===0){vehicle.x-=vehicle.speed*dt;if(vehicle.x<CITY_X+25)vehicle.x=CITY_X+180;vehicle.car.position.x=vehicle.x;}
      else {vehicle.z+=vehicle.speed*dt;if(vehicle.z>235)vehicle.z=-5;vehicle.car.position.z=vehicle.z;}
    }
    for(const vehicle of freewayTraffic){
      vehicle.z-=vehicle.speed*dt;if(vehicle.z<-300)vehicle.z=280;
      vehicle.car.position.z=vehicle.z;
    }
  }
  if(performance.now()>state.lookUntil)state.look+=(0-state.look)*Math.min(1,dt*5);
  const heading=state.yaw+state.look;
  const eyeX=state.x-Math.cos(state.yaw)*.28;
  const eyeZ=state.z-Math.sin(state.yaw)*.28;
  camera.position.set(eyeX,1.64,eyeZ);
  camera.lookAt(eyeX+Math.sin(heading)*25,1.55,eyeZ-Math.cos(heading)*25);
  renderer.render(scene,camera);
  hudElapsed+=dt;
  if(hudElapsed>.1){updateHud();hudElapsed=0;}
}
function resize() {
  const w=viewport.clientWidth,h=viewport.clientHeight;
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
let hudElapsed=0;
selectLesson(state.lesson);
if (import.meta.env.DEV) {
  const preview = new URLSearchParams(location.search).get('preview');
  if (['rail','failed','stop','school','hayes','city','freeway','city-question','freeway-question','city-no-uturn','city-uturn','freeway-limit','freeway-exit-preview','freeway-gore-preview','freeway-ramp-preview','question-motion'].includes(preview)) {
    if(preview?.startsWith('city')||preview?.startsWith('freeway'))selectLesson(preview.startsWith('city')?2:3);
    $('welcomePanel').classList.add('hidden');
    document.body.classList.remove('welcome-mode'); $('gameShell').classList.remove('welcome-mode');
    $('instructorCard').classList.add('hidden');
    state.phase='driving';
    if(preview==='question-motion'){
      state.step='approach';state.z=190;state.speed=7.5;openQuestion(0);
    } else if(preview==='city-no-uturn'||preview==='city-uturn'){
      state.step=preview==='city-no-uturn'?'urban-cruise':'urban-uturn';
      state.x=CITY_X+(preview==='city-no-uturn'?38:90);state.z=3.5;state.yaw=Math.PI/2;
    } else if(preview==='freeway-exit-preview'){
      state.step='freeway-exit';state.x=FREEWAY_X+8.2;state.z=83;
    } else if(preview==='freeway-gore-preview'){
      state.step='freeway-ramp';state.x=FREEWAY_X+16.4;state.z=-70;
    } else if(preview==='freeway-ramp-preview'){
      state.step='freeway-ramp';state.x=FREEWAY_X+18;state.z=-185;
    } else if(preview==='freeway-limit'){
      state.step='freeway-cruise';state.x=FREEWAY_X+8;state.z=98;
    } else if(preview?.startsWith('city')||preview?.startsWith('freeway')){
      state.step=preview.startsWith('city')?'urban-lane':'freeway-merge';
      state.z=preview.startsWith('city')?125:150;
      if(preview.endsWith('question'))openQuestion(0);
    } else if (preview === 'stop' || preview === 'school' || preview === 'hayes') {
      state.step=preview === 'stop' ? 'stop-drive' : 'approach';
      state.z=preview === 'stop' ? 28 : preview === 'hayes' ? 48 : 116;
      if (preview === 'stop') {ambientTraffic[0].z=-30;ambientTraffic[0].car.position.z=-30;}
    } else {
      state.step='rail-stop'; state.x=-25; state.z=-3.5; state.yaw=-Math.PI/2;
      state.railPhase='active'; state.trainZ=14; state.railTimer=5;
      if (preview === 'failed') fail('rail-active');
    }
  }
}
new ResizeObserver(resize).observe(viewport);resize();animate();updateHud();showBest();
