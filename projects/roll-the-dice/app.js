/* =========================================================
   ROLL — D6 Simulator with hidden rigging control room
   ========================================================= */

// ---------- STATE ----------
const state = {
  theme: 'dark',
  accent: '#d97757',
  font: 'mono',
  sound: true,
  haptics: true,
  showRigDot: true,

  weightEnabled: false,
  weights: [1,1,1,1,1,1], // relative weights for faces 1..6

  queue: [], // array of {type:'fixed', face:n} | {type:'random'}

  playerMode: false,
  totalPlayers: 4,
  mySeat: 1,
  playerTargetFace: 6,
  boostStrength: 60,
  turnCounter: 0,

  volumeMode: false,
  volDial: 50,
  midFace: 6,
  highFace: 6,

  isRolling: false,
  lastValue: null,
  history: []
};

const ACCENTS = ['#d97757','#e0475a','#e8b23d','#5ec98f','#4e9ee8','#a06ee8','#e85fb9','#8d8d8d'];

// ---------- TOAST ----------
let toastTimer = null;
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove('show'), 1800);
}

// ---------- SOUND (WebAudio, no external files) ----------
let actx = null;
function ensureAudio(){
  if(!actx){
    actx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if(actx.state === 'suspended') actx.resume();
  return actx;
}
function playTick(vol=0.15){
  if(!state.sound) return;
  const ctx = ensureAudio();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.value = 700 + Math.random()*400;
  g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.07);
}
function playLand(){
  if(!state.sound) return;
  const ctx = ensureAudio();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(180, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.18);
  g.gain.value = 0.4;
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.24);
}
function playUIClick(){
  if(!state.sound) return;
  const ctx = ensureAudio();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = 1200;
  g.gain.value = 0.08;
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.06);
}
function playMenuOpen(){
  if(!state.sound) return;
  const ctx = ensureAudio();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(220, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
  g.gain.value = 0.06;
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.2);
}

function haptic(pattern){
  if(!state.haptics) return;
  if(navigator.vibrate) navigator.vibrate(pattern);
}

// =========================================================
// THREE.JS DIE
// =========================================================
let scene, camera, renderer, dieMesh, ambLight, keyLight, rimLight;
let bgScene, bgCamera, bgRenderer, bgParticles;

function pipTexture(faceValue, accentHex){
  const size = 256;
  const cvs = document.createElement('canvas');
  cvs.width = size; cvs.height = size;
  const ctx = cvs.getContext('2d');

  // base
  const isLight = document.body.dataset.theme === 'light';
  ctx.fillStyle = isLight ? '#f7f5f0' : '#1c1c22';
  roundRect(ctx, 4, 4, size-8, size-8, 36);
  ctx.fill();

  ctx.strokeStyle = isLight ? '#00000018' : '#ffffff14';
  ctx.lineWidth = 3;
  roundRect(ctx, 4, 4, size-8, size-8, 36);
  ctx.stroke();

  ctx.fillStyle = accentHex;
  const r = 20;
  const positions = {
    1: [[0.5,0.5]],
    2: [[0.28,0.28],[0.72,0.72]],
    3: [[0.28,0.28],[0.5,0.5],[0.72,0.72]],
    4: [[0.28,0.28],[0.72,0.28],[0.28,0.72],[0.72,0.72]],
    5: [[0.28,0.28],[0.72,0.28],[0.5,0.5],[0.28,0.72],[0.72,0.72]],
    6: [[0.28,0.24],[0.72,0.24],[0.28,0.5],[0.72,0.5],[0.28,0.76],[0.72,0.76]]
  }[faceValue];

  positions.forEach(([px,py])=>{
    ctx.beginPath();
    ctx.arc(px*size, py*size, r, 0, Math.PI*2);
    ctx.shadowColor = accentHex;
    ctx.shadowBlur = 18;
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(cvs);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

// face order for BoxGeometry: +x,-x,+y,-y,+z,-z -> assign standard die (opposite faces sum 7)
// order: [right, left, top, bottom, front, back]
const FACE_ORDER = [1,6,2,5,3,4]; // right=1, left=6, top=2, bottom=5, front=3, back=4 (arbitrary valid die)

function buildDieMaterials(){
  return FACE_ORDER.map(f => new THREE.MeshStandardMaterial({
    map: pipTexture(f, state.accent),
    roughness: 0.35,
    metalness: 0.15,
  }));
}

function initDiceScene(){
  const canvas = document.getElementById('dice-canvas');
  const stage = document.getElementById('stage');

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, stage.clientWidth/stage.clientHeight, 0.1, 100);
  camera.position.set(0, 1.6, 5.6);
  camera.lookAt(0,0,0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);

  ambLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambLight);

  keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);

  rimLight = new THREE.PointLight(0xd97757, 1.4, 20);
  rimLight.position.set(-3, -1, -3);
  scene.add(rimLight);

  const fillLight = new THREE.PointLight(0x6e8cff, 0.5, 20);
  fillLight.position.set(-2, 3, 2);
  scene.add(fillLight);

  const geo = new THREE.BoxGeometry(1.7,1.7,1.7, 1,1,1);
  const mats = buildDieMaterials();
  dieMesh = new THREE.Mesh(geo, mats);
  dieMesh.rotation.set(-0.35, 0.5, 0);
  scene.add(dieMesh);

  // soft shadow-like ellipse under die
  const shadowGeo = new THREE.CircleGeometry(1.35, 48);
  const shadowMat = new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.35 });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI/2;
  shadowMesh.position.y = -1.25;
  scene.add(shadowMesh);

  animateIdle();
  window.addEventListener('resize', onResize);
  onResize();
}

function onResize(){
  const stage = document.getElementById('stage');
  camera.aspect = stage.clientWidth/stage.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(stage.clientWidth, stage.clientHeight);
}

let idleT = 0;
function animateIdle(){
  requestAnimationFrame(animateIdle);
  if(!state.isRolling){
    idleT += 0.01;
    dieMesh.rotation.y += 0.0032;
    dieMesh.position.y = Math.sin(idleT*1.3) * 0.09;
  }
  renderer.render(scene, camera);
}

// map face value -> euler rotation that shows that face pointing toward camera (+z-ish/top)
// We show the result on the TOP face relative to a fixed "reading" orientation.
// Simplify: define target quaternions per face value that align that face upward & readable.
const FACE_TARGET_ROTATIONS = {
  // [x, y, z] radians — tuned so numeral faces the camera/up clearly
  1: [0, Math.PI/2, 0],     // right(1) -> front
  6: [0, -Math.PI/2, 0],    // left(6) -> front
  2: [-Math.PI/2, 0, 0],    // top(2) -> front
  5: [Math.PI/2, 0, 0],     // bottom(5) -> front
  3: [0, 0, 0],             // front(3) stays front
  4: [0, Math.PI, 0]        // back(4) -> front
};

function rollDieTo(face, onDone){
  state.isRolling = true;
  document.getElementById('readout').style.opacity = '0';
  document.getElementById('tapHint').style.opacity = '0';

  const startRot = dieMesh.rotation.clone();
  const spins = 3 + Math.floor(Math.random()*2); // extra full spins
  const target = FACE_TARGET_ROTATIONS[face];

  const endRot = new THREE.Euler(
    target[0] + Math.PI*2*spins * (Math.random()<0.5?1:-1),
    target[1] + Math.PI*2*spins * (Math.random()<0.5?1:-1),
    target[2] + (Math.random()-0.5)*0.6
  );

  const duration = 900;
  const startTime = performance.now();
  const startPos = { y: dieMesh.position.y };

  let lastTick = 0;

  function frame(now){
    const t = Math.min(1, (now - startTime) / duration);
    const ease = 1 - Math.pow(1-t, 3); // easeOutCubic

    dieMesh.rotation.x = startRot.x + (endRot.x - startRot.x) * ease;
    dieMesh.rotation.y = startRot.y + (endRot.y - startRot.y) * ease;
    dieMesh.rotation.z = startRot.z + (endRot.z - startRot.z) * ease;

    // bounce arc
    const bounce = Math.sin(t * Math.PI) * 0.9 * (1-t*0.3);
    dieMesh.position.y = bounce;
    dieMesh.position.x = Math.sin(t*Math.PI*2) * 0.15 * (1-t);

    // tick sound during fast spin
    if(t < 0.7 && now - lastTick > 70){
      playTick(0.08 * (1-t));
      lastTick = now;
    }

    if(t < 1){
      requestAnimationFrame(frame);
    } else {
      dieMesh.position.y = 0;
      dieMesh.position.x = 0;
      state.isRolling = false;
      playLand();
      haptic([25,20,45]);
      onDone && onDone();
    }
  }
  requestAnimationFrame(frame);
}

// =========================================================
// BACKGROUND AMBIENT PARTICLES
// =========================================================
function initBg(){
  const canvas = document.getElementById('bg-canvas');
  bgScene = new THREE.Scene();
  bgCamera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
  bgCamera.position.z = 10;
  bgRenderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  bgRenderer.setSize(window.innerWidth, window.innerHeight);

  const count = 90;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count*3);
  for(let i=0;i<count;i++){
    positions[i*3] = (Math.random()-0.5)*18;
    positions[i*3+1] = (Math.random()-0.5)*18;
    positions[i*3+2] = (Math.random()-0.5)*10 - 4;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  const mat = new THREE.PointsMaterial({ color: 0xd97757, size:0.035, transparent:true, opacity:0.5 });
  bgParticles = new THREE.Points(geo, mat);
  bgScene.add(bgParticles);

  window.addEventListener('resize', ()=>{
    bgCamera.aspect = window.innerWidth/window.innerHeight;
    bgCamera.updateProjectionMatrix();
    bgRenderer.setSize(window.innerWidth, window.innerHeight);
  });
  animateBg();
}
function animateBg(){
  requestAnimationFrame(animateBg);
  bgParticles.rotation.y += 0.0006;
  bgParticles.rotation.x += 0.0002;
  bgRenderer.render(bgScene, bgCamera);
}

// =========================================================
// RIGGING ENGINE — decides the "true" outcome
// =========================================================
function weightedRandomFace(weights){
  const total = weights.reduce((a,b)=>a+b,0);
  let r = Math.random() * total;
  for(let i=0;i<6;i++){
    if(r < weights[i]) return i+1;
    r -= weights[i];
  }
  return 6;
}

function baseRandomFace(){
  if(state.weightEnabled){
    return weightedRandomFace(state.weights);
  }
  return 1 + Math.floor(Math.random()*6);
}

function volumeProfileFace(){
  const v = state.volDial;
  if(v < 50){
    return baseRandomFace();
  } else if(v < 100){
    // Lean: 50% chance of midFace, rest split
    return biasedFace(state.midFace, 0.5);
  } else {
    // Locked: ~70%
    return biasedFace(state.highFace, 0.7);
  }
}

function biasedFace(target, strength){
  if(Math.random() < strength) return target;
  // remaining probability split evenly among other faces
  const others = [1,2,3,4,5,6].filter(f=>f!==target);
  return others[Math.floor(Math.random()*others.length)];
}

function playerModeFace(){
  state.turnCounter++;
  const isMyTurn = ((state.turnCounter - 1) % state.totalPlayers) === (state.mySeat - 1);
  if(isMyTurn){
    return biasedFace(state.playerTargetFace, state.boostStrength/100);
  }
  return baseRandomFace();
}

function determineNextFace(){
  // Priority: manual queue > player mode > volume profile > weighted/base
  if(state.queue.length > 0){
    const entry = state.queue.shift();
    renderQueue();
    if(entry.type === 'fixed'){
      return entry.face;
    }
    // 'random' entry falls through to normal logic below
  }
  if(state.playerMode){
    return playerModeFace();
  }
  if(state.volumeMode){
    return volumeProfileFace();
  }
  return baseRandomFace();
}

function updateStatusPill(){
  const pill = document.getElementById('statusPill');
  const rigDot = document.getElementById('rigIndicator');
  const active = state.queue.length>0 || state.playerMode || state.volumeMode || state.weightEnabled;

  if(active && state.showRigDot){
    rigDot.classList.add('active');
  } else {
    rigDot.classList.remove('active');
  }
  // status pill stays hidden always (truly secret) — kept for potential debug, never shown
  pill.classList.remove('show');
}

// =========================================================
// ROLL FLOW
// =========================================================
function doRoll(){
  if(state.isRolling) return;
  ensureAudio();
  const face = determineNextFace();
  rollDieTo(face, ()=>{
    state.lastValue = face;
    state.history.unshift(face);
    if(state.history.length > 20) state.history.pop();
    renderHistory();
    showResult(face);
    updateStatusPill();
  });
}

function showResult(face){
  const readout = document.getElementById('readout');
  const val = document.getElementById('valDisplay');
  val.textContent = face;
  readout.style.opacity = '1';
  readout.style.animation = 'none';
  requestAnimationFrame(()=>{ readout.style.animation = null; });
}

function renderHistory(){
  const wrap = document.getElementById('history');
  wrap.innerHTML = '';
  state.history.forEach((v, i)=>{
    const chip = document.createElement('div');
    chip.className = 'history-chip' + (i===0 ? ' latest' : '');
    chip.style.animationDelay = (i*0.02)+'s';
    chip.textContent = v;
    wrap.appendChild(chip);
  });
}

// =========================================================
// UI WIRING
// =========================================================
function setTheme(t){
  state.theme = t;
  document.body.dataset.theme = t;
  document.querySelectorAll('[data-theme-opt]').forEach(el=>{
    el.classList.toggle('active', el.dataset.themeOpt === t);
  });
  rebuildDieTextures();
}

function setAccent(hex){
  state.accent = hex;
  document.documentElement.style.setProperty('--accent', hex);
  const glow = hex + '66';
  const dim = hex + '33';
  document.documentElement.style.setProperty('--accent-glow', glow);
  document.documentElement.style.setProperty('--accent-dim', dim);
  rebuildDieTextures();
  renderColorRow();
}

function rebuildDieTextures(){
  if(!dieMesh) return;
  dieMesh.material.forEach((m, i)=>{
    m.map = pipTexture(FACE_ORDER[i], state.accent);
    m.needsUpdate = true;
  });
  const glowColor = new THREE.Color(state.accent);
  rimLight.color = glowColor;
}

function renderColorRow(){
  const row = document.getElementById('colorRow');
  row.innerHTML = '';
  ACCENTS.forEach(hex=>{
    const dot = document.createElement('div');
    dot.className = 'color-dot' + (hex===state.accent ? ' active' : '');
    dot.style.background = hex;
    dot.onclick = ()=>{ playUIClick(); setAccent(hex); };
    row.appendChild(dot);
  });
}

function buildFacePicker(container, selected, onSelect){
  container.innerHTML = '';
  for(let f=1; f<=6; f++){
    const btn = document.createElement('button');
    btn.textContent = f;
    if(f === selected) btn.classList.add('sel');
    btn.onclick = ()=>{
      playUIClick();
      [...container.children].forEach(c=>c.classList.remove('sel'));
      btn.classList.add('sel');
      onSelect(f);
    };
    container.appendChild(btn);
  }
}

let selectedQueueFace = 6;

function renderQueue(){
  const list = document.getElementById('queueList');
  document.getElementById('queueCount').textContent = state.queue.length;
  list.innerHTML = '';
  if(state.queue.length === 0){
    list.innerHTML = '<div class="queue-empty">Queue is empty — rolls use normal / weighted odds</div>';
    return;
  }
  state.queue.forEach((entry, idx)=>{
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.style.animationDelay = (idx*0.01)+'s';

    const idxEl = document.createElement('div');
    idxEl.className = 'queue-idx font-mono';
    idxEl.textContent = '#'+(idx+1);

    const face = document.createElement('div');
    if(entry.type === 'fixed'){
      face.className = 'queue-face';
      face.textContent = entry.face;
    } else {
      face.className = 'queue-face random';
      face.textContent = 'RND';
    }

    const rm = document.createElement('div');
    rm.className = 'queue-remove';
    rm.textContent = '✕';
    rm.onclick = ()=>{
      playUIClick();
      state.queue.splice(idx,1);
      renderQueue();
    };

    item.appendChild(idxEl);
    item.appendChild(face);
    item.appendChild(rm);
    list.appendChild(item);
  });
}

function renderWeightSliders(){
  const wrap = document.getElementById('weightSliders');
  wrap.innerHTML = '';
  for(let f=1; f<=6; f++){
    const w = document.createElement('div');
    w.className = 'slider-wrap';
    const total = state.weights.reduce((a,b)=>a+b,0);
    const pct = Math.round((state.weights[f-1]/total)*100);
    w.innerHTML = `
      <div class="slider-top"><span class="row-lbl">Face ${f}</span><span class="slider-val" data-pctlbl="${f}">${pct}%</span></div>
      <input type="range" min="1" max="50" value="${state.weights[f-1]}" data-weight="${f}">
      <div class="prob-bar-track"><div class="prob-bar-fill" style="width:${pct}%" data-bar="${f}"></div></div>
    `;
    wrap.appendChild(w);
  }
  wrap.querySelectorAll('input[data-weight]').forEach(inp=>{
    inp.addEventListener('input', (e)=>{
      const f = parseInt(e.target.dataset.weight);
      state.weights[f-1] = parseInt(e.target.value);
      updateWeightDisplays();
    });
  });
  updateWeightDisplays();
}

function updateWeightDisplays(){
  const total = state.weights.reduce((a,b)=>a+b,0);
  for(let f=1; f<=6; f++){
    const pct = Math.round((state.weights[f-1]/total)*100);
    const lbl = document.querySelector(`[data-pctlbl="${f}"]`);
    const bar = document.querySelector(`[data-bar="${f}"]`);
    if(lbl) lbl.textContent = pct+'%';
    if(bar) bar.style.width = pct+'%';
  }
  document.getElementById('weightSum').textContent = `Total probability normalized to 100%`;
}

// ---------- Panel open/close ----------
const veil = () => document.getElementById('veil');
const panel = () => document.getElementById('panel');

function openPanel(){
  playMenuOpen();
  veil().classList.add('open');
  panel().classList.add('open');
  haptic(30);
}
function closePanel(){
  playUIClick();
  veil().classList.remove('open');
  panel().classList.remove('open');
}

// ---------- Long press detection on die/stage ----------
let pressTimer = null;
let pressMoved = false;
let pressStartXY = [0,0];
const LONG_PRESS_MS = 600;

function attachPressHandlers(){
  const stage = document.getElementById('stage');

  const start = (x,y)=>{
    pressMoved = false;
    pressStartXY = [x,y];
    pressTimer = setTimeout(()=>{
      if(!pressMoved){
        openPanel();
        pressTimer = null;
      }
    }, LONG_PRESS_MS);
  };
  const move = (x,y)=>{
    const dx = x - pressStartXY[0], dy = y - pressStartXY[1];
    if(Math.sqrt(dx*dx+dy*dy) > 12) pressMoved = true;
  };
  const end = ()=>{
    if(pressTimer){
      clearTimeout(pressTimer);
      pressTimer = null;
      if(!pressMoved){
        doRoll();
      }
    }
  };

  stage.addEventListener('touchstart', (e)=>{
    const t = e.touches[0];
    start(t.clientX, t.clientY);
  }, {passive:true});
  stage.addEventListener('touchmove', (e)=>{
    const t = e.touches[0];
    move(t.clientX, t.clientY);
  }, {passive:true});
  stage.addEventListener('touchend', end);

  stage.addEventListener('mousedown', (e)=> start(e.clientX, e.clientY));
  stage.addEventListener('mousemove', (e)=>{ if(pressTimer) move(e.clientX, e.clientY); });
  window.addEventListener('mouseup', end);
}

// ---------- Wire all controls ----------
function wireUI(){
  // tabs
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      playUIClick();
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`[data-pane="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  document.getElementById('panelClose').addEventListener('click', closePanel);
  veil().addEventListener('click', closePanel);

  // theme
  document.querySelectorAll('[data-theme-opt]').forEach(el=>{
    el.addEventListener('click', ()=>{ playUIClick(); setTheme(el.dataset.themeOpt); });
  });

  // font (cosmetic — swaps numeral font on the readout only, dice remain pip-based)
  document.querySelectorAll('#fontSeg .seg-btn').forEach(el=>{
    el.addEventListener('click', ()=>{
      playUIClick();
      document.querySelectorAll('#fontSeg .seg-btn').forEach(b=>b.classList.remove('active'));
      el.classList.add('active');
      state.font = el.dataset.font;
      const val = document.getElementById('valDisplay');
      val.style.fontFamily = state.font === 'mono' ? "'JetBrains Mono', monospace" : "'Chakra Petch', sans-serif";
    });
  });

  // toggles helper
  function wireToggle(id, initial, onChange){
    const el = document.getElementById(id);
    if(initial) el.classList.add('on');
    el.addEventListener('click', ()=>{
      playUIClick();
      el.classList.toggle('on');
      onChange(el.classList.contains('on'));
    });
  }

  wireToggle('toggleSound', true, v=> state.sound = v);
  wireToggle('toggleHaptics', true, v=> state.haptics = v);
  wireToggle('toggleRigDot', true, v=>{ state.showRigDot = v; updateStatusPill(); });

  wireToggle('toggleWeight', false, v=>{
    state.weightEnabled = v;
    document.getElementById('weightSliders').style.opacity = v ? '1' : '.35';
    document.getElementById('weightSliders').style.pointerEvents = v ? 'all' : 'none';
    updateStatusPill();
  });
  document.getElementById('resetWeights').addEventListener('click', ()=>{
    playUIClick();
    state.weights = [1,1,1,1,1,1];
    renderWeightSliders();
    toast('Weights reset to equal');
  });

  wireToggle('togglePlayerMode', false, v=>{
    state.playerMode = v;
    document.getElementById('playerModeBody').style.opacity = v ? '1' : '.35';
    document.getElementById('playerModeBody').style.pointerEvents = v ? 'all' : 'none';
    updateStatusPill();
  });

  wireToggle('toggleVolumeMode', false, v=>{
    state.volumeMode = v;
    document.getElementById('volumeModeBody').style.opacity = v ? '1' : '.35';
    document.getElementById('volumeModeBody').style.pointerEvents = v ? 'all' : 'none';
    updateStatusPill();
  });

  // sliders
  const totalPlayers = document.getElementById('totalPlayers');
  totalPlayers.addEventListener('input', e=>{
    state.totalPlayers = parseInt(e.target.value);
    document.getElementById('totalPlayersVal').textContent = state.totalPlayers;
    const mySeat = document.getElementById('mySeat');
    mySeat.max = state.totalPlayers;
    if(state.mySeat > state.totalPlayers){
      state.mySeat = state.totalPlayers;
      mySeat.value = state.mySeat;
      document.getElementById('mySeatVal').textContent = state.mySeat;
    }
  });
  const mySeat = document.getElementById('mySeat');
  mySeat.addEventListener('input', e=>{
    state.mySeat = parseInt(e.target.value);
    document.getElementById('mySeatVal').textContent = state.mySeat;
  });
  const boostStrength = document.getElementById('boostStrength');
  boostStrength.addEventListener('input', e=>{
    state.boostStrength = parseInt(e.target.value);
    document.getElementById('boostStrengthVal').textContent = state.boostStrength + '%';
  });

  const volDial = document.getElementById('volDial');
  volDial.addEventListener('input', e=>{
    state.volDial = parseInt(e.target.value);
    document.getElementById('volDialVal').textContent = state.volDial + '%';
    updateVolumeProfileCards();
  });

  // face pickers
  buildFacePicker(document.getElementById('facePick'), selectedQueueFace, f=> selectedQueueFace = f);
  buildFacePicker(document.getElementById('playerFacePick'), state.playerTargetFace, f=> state.playerTargetFace = f);
  buildFacePicker(document.getElementById('midFacePick'), state.midFace, f=> state.midFace = f);
  buildFacePicker(document.getElementById('highFacePick'), state.highFace, f=> state.highFace = f);

  document.getElementById('addQueueFace').addEventListener('click', ()=>{
    playUIClick();
    state.queue.push({ type:'fixed', face: selectedQueueFace });
    renderQueue();
    toast(`Added face ${selectedQueueFace} to queue`);
  });
  document.getElementById('addQueueRandom').addEventListener('click', ()=>{
    playUIClick();
    state.queue.push({ type:'random' });
    renderQueue();
    toast('Added random entry to queue');
  });
  document.getElementById('clearQueue').addEventListener('click', ()=>{
    playUIClick();
    state.queue = [];
    renderQueue();
    toast('Queue cleared');
  });

  renderColorRow();
  renderWeightSliders();
  renderQueue();
  updateVolumeProfileCards();
}

function updateVolumeProfileCards(){
  const v = state.volDial;
  document.getElementById('profLow').classList.toggle('sel', v < 50);
  document.getElementById('profMid').classList.toggle('sel', v >= 50 && v < 100);
  document.getElementById('profHigh').classList.toggle('sel', v >= 100);
}

// =========================================================
// INIT
// =========================================================
window.addEventListener('DOMContentLoaded', ()=>{
  initBg();
  initDiceScene();
  attachPressHandlers();
  wireUI();
  updateStatusPill();

  // little entrance nudge
  setTimeout(()=>{ document.getElementById('tapHint').style.opacity = '1'; }, 300);
});
