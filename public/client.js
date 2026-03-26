// Minimal Phaser client: Builder + Attack modes
const socket = io();
let playerName = '';
const ui = {
  nameInput: document.getElementById('name'),
  btnBuilder: document.getElementById('btnBuilder'),
  btnAttack: document.getElementById('btnAttack'),
  status: document.getElementById('status')
};

ui.nameInput.addEventListener('change', () => {
  playerName = ui.nameInput.value || ('player_' + Math.floor(Math.random()*1000));
  socket.emit('setName', playerName);
});

ui.btnBuilder.addEventListener('click', () => startMode('builder'));
ui.btnAttack.addEventListener('click', () => startMode('attack'));

ui.nameInput.value = 'Player' + Math.floor(Math.random()*1000);
playerName = ui.nameInput.value;
socket.emit('setName', playerName);

ui.status.textContent = 'connected';

// Phaser config
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#132033',
  scene: { preload, create, update }
};
let mode = 'builder';
let phaserGame = new Phaser.Game(config);
let currentScene;

function preload() {
}

function create() {
  currentScene = this;
  this.cameras.main.setBackgroundColor('#132033');
  // simple grid
  const graphics = this.add.graphics();
  graphics.lineStyle(1, 0x204b6b, 0.4);
  const gridSize = 40;
  for (let x=0;x<config.width;x+=gridSize) graphics.moveTo(x,0), graphics.lineTo(x,config.height);
  for (let y=0;y<config.height;y+=gridSize) graphics.moveTo(0,y), graphics.lineTo(config.width,y);
  graphics.strokePath();

  this.base = { buildings: [] };
  this.buildPreview = null;

  // UI text
  this.modeText = this.add.text(12, 12, 'Mode: builder', { font: '16px Arial', fill: '#fff' }).setDepth(20);

  // input
  this.input.on('pointerdown', (p) => {
    const worldX = p.x;
    const worldY = p.y;
    if (mode === 'builder') {
      // place building
      const b = { type: 'tower', x: Math.floor(worldX/40)*40, y: Math.floor(worldY/40)*40, w:40, h:40, hp:100 };
      this.base.buildings.push(b);
      drawBuildings(this);
      // auto-save
      socket.emit('saveBase', this.base);
    } else if (mode === 'attack') {
      // spawn troops command
      socket.emit('spawnTroops', { roomId: currentRoomId, units: [{ type: 'melee' }, { type: 'melee' }] });
    }
  });

  // draw buildings
  drawBuildings(this);
}

function update() {
  // nothing here; match state handled by socket events
}

function drawBuildings(scene) {
  if (scene.buildingsGroup) scene.buildingsGroup.clear(true, true);
  scene.buildingsGroup = scene.add.group();
  for (let b of scene.base.buildings) {
    const rect = scene.add.rectangle(b.x + b.w/2, b.y + b.h/2, b.w, b.h, 0xcf9f6b).setStrokeStyle(2, 0x8c6b45);
    const txt = scene.add.text(b.x + 4, b.y + 4, Math.max(0,Math.floor(b.hp)), { font: '12px Arial', fill: '#000' });
    scene.buildingsGroup.addMultiple([rect, txt]);
  }
}

// Attack flow
let currentRoomId = null;

function startMode(m) {
  mode = m;
  if (currentScene) currentScene.modeText.setText('Mode: ' + m);
  if (m === 'attack') {
    const defenderName = prompt('Name des Verteidigers (genauer Spielername)');
    if (!defenderName) return;
    socket.emit('requestAttack', defenderName);
  }
}

socket.on('saveResult', (r) => {
  console.log('save result', r);
});

socket.on('attackAccepted', ({ roomId }) => {
  currentRoomId = roomId;
  socket.emit('joinMatch', roomId);
  ui.status.textContent = 'In Match: ' + roomId;
});

socket.on('matchState', (state) => {
  // render units/buildings update
  if (!currentScene) return;
  // update building hp
  currentScene.base.buildings = state.buildings || currentScene.base.buildings;
  drawBuildings(currentScene);
  // units rendering
  if (currentScene.unitsGroup) currentScene.unitsGroup.clear(true, true);
  currentScene.unitsGroup = currentScene.add.group();
  for (let u of state.units || []) {
    const circ = currentScene.add.circle(u.x, u.y, 8, 0x66ccff);
    currentScene.unitsGroup.add(circ);
  }
});

socket.on('attackFailed', (msg) => alert('Attack failed: ' + msg));

window.addEventListener('resize', () => {
  phaserGame.scale.resize(window.innerWidth, window.innerHeight);
});