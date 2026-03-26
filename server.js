const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DATA_DIR = path.join(__dirname, 'data');
const BASES_FILE = path.join(DATA_DIR, 'bases.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(BASES_FILE)) fs.writeFileSync(BASES_FILE, JSON.stringify({}), 'utf8');

function loadBases() {
  try { return JSON.parse(fs.readFileSync(BASES_FILE, 'utf8') || '{}'); } catch (e) { return {}; }
}
function saveBases(b) {
  fs.writeFileSync(BASES_FILE, JSON.stringify(b, null, 2), 'utf8');
}

app.use(express.static('public'));
app.use(express.json());

// simple REST to fetch base by player name
app.get('/base/:player', (req, res) => {
  const bases = loadBases();
  const base = bases[req.params.player] || null;
  res.json({ base });
});

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  socket.data.playerName = null;

  socket.on('setName', (name) => {
    socket.data.playerName = name || socket.id;
  });

  socket.on('saveBase', (base) => {
    const name = socket.data.playerName || 'player_' + socket.id;
    const bases = loadBases();
    bases[name] = base;
    saveBases(bases);
    socket.emit('saveResult', { ok: true });
    console.log('Base saved for', name);
  });

  // matchmaking: attacker requests attack on defenderName
  socket.on('requestAttack', (defenderName) => {
    const bases = loadBases();
    const defenderBase = bases[defenderName];
    if (!defenderBase) {
      socket.emit('attackFailed', 'Defender not found');
      return;
    }
    // create a room for this match
    const roomId = 'match_' + Date.now() + '_' + Math.floor(Math.random()*1000);
    const match = createMatch(roomId, socket.id, defenderBase);
    socket.join(roomId);
    socket.emit('attackAccepted', { roomId });
    // also inform a potential defender client if online (lookup by name not implemented here)
    // start simulation
    startMatch(match);
  });

  socket.on('joinMatch', (roomId) => {
    socket.join(roomId);
    console.log(socket.id, 'joined', roomId);
  });

  socket.on('spawnTroops', ({ roomId, units }) => {
    const match = matches[roomId];
    if (!match) return;
    // add units for this socket
    units.forEach(u => {
      match.units.push({
        id: 'u_' + Date.now() + '_' + Math.floor(Math.random()*1000),
        owner: socket.id,
        x: match.spawn.x,
        y: match.spawn.y,
        hp: 100,
        dmg: 20,
        speed: 1.6,
        target: null
      });
    });
  });

  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
  });
});

const matches = {}; // roomId => match object

function createMatch(roomId, attackerSocketId, defenderBase) {
  const match = {
    id: roomId,
    attacker: attackerSocketId,
    defenderBase, // buildings array
    units: [],
    spawn: { x: 50, y: 50 },
    ticks: 0
  };
  matches[roomId] = match;
  return match;
}

function startMatch(match) {
  // run a server tick for this match
  match.interval = setInterval(() => {
    simulateMatchTick(match);
  }, 1000/20);
}

function simulateMatchTick(match) {
  match.ticks++;
  // for each unit, find nearest building and move towards it
  for (let u of match.units) {
    // remove dead units
    if (u.hp <= 0) continue;
    // find nearest building
    let nearest = null; let nd = Infinity;
    (match.defenderBase.buildings || []).forEach(b => {
      if (b.hp <= 0) return;
      const dx = (b.x + b.w/2) - u.x;
      const dy = (b.y + b.h/2) - u.y;
      const d = Math.sqrt(dx*dx+dy*dy);
      if (d < nd) { nd = d; nearest = b; }
    });
    if (nearest) {
      // move
      const dx = (nearest.x + nearest.w/2) - u.x;
      const dy = (nearest.y + nearest.h/2) - u.y;
      const d = Math.sqrt(dx*dx + dy*dy) || 0.0001;
      if (d > 18) {
        u.x += (dx/d)*u.speed;
        u.y += (dy/d)*u.speed;
      } else {
        // attack
        nearest.hp = (nearest.hp || 100) - u.dmg * 0.1;
      }
    }
  }
  // cleanup destroyed buildings
  (match.defenderBase.buildings || []).forEach(b => { if (b.hp <= 0) b.destroyed = true; });
  // broadcast state
  io.to(match.id).emit('matchState', {
    units: match.units,
    buildings: match.defenderBase.buildings,
    ticks: match.ticks
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server listening on', PORT));

// graceful cleanup of match intervals (not covered here for brevity)