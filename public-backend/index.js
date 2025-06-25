const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const { io } = require('socket.io-client');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
fs.ensureDirSync(dataDir);

// Utility per file JSON persistenti
function loadOrInit(filename, def = []) {
  const file = path.join(dataDir, filename);
  if (fs.existsSync(file)) {
    return fs.readJsonSync(file);
  } else {
    fs.writeJsonSync(file, def);
    return def;
  }
}
function save(filename, content) {
  return fs.writeJsonSync(path.join(dataDir, filename), content, { spaces: 2 });
}

// --- SOCKET.IO: COLLEGA A YOUBOX (porta 4000) ---
const YOUBOX_URL = "http://localhost:4000";
let currentScene = { name: "standby", data: null };
let currentContestant = null;
let currentSong = null; // { file, author, title }
let validContestants = []; // lista concorrenti validi

const socket = io(YOUBOX_URL, { transports: ["websocket"] });

socket.on("connect", () => {
  console.log("Connesso a YOUBOX via websocket");
});

socket.on("scene", (scene) => {
  currentScene = scene;
  console.log("Scena aggiornata:", scene);
});

socket.on("current-contestant", (contestant) => {
  currentContestant = contestant;
  console.log("Concorrente aggiornato:", contestant);
});

socket.on("draw-song", (song) => {
  currentSong = song;
  console.log("Canzone estratta:", song);
});

// AGGIORNA LISTA CONCORRENTI SU EVENTO YOUBOX
socket.on("contestants", (contestants) => {
  if (Array.isArray(contestants)) {
    validContestants = contestants;
    console.log("Lista concorrenti aggiornata:", validContestants);
  }
});

socket.on("disconnect", () => {
  console.log("Disconnesso da YOUBOX");
});

// ---------------------
// SEZIONE AUTENTICAZIONE TAVOLO E UTENTE
// ---------------------

// Tavoli
function loadTables() { return loadOrInit('tables.json', []); }
function saveTables(tables) { save('tables.json', tables); }
function findTable(name) {
  return loadTables().find(t => t.name.toLowerCase() === name.toLowerCase());
}
function createTable({ name, email, pin }) {
  const tables = loadTables();
  if (tables.find(t => t.name.toLowerCase() === name.toLowerCase()))
    throw new Error('Tavolo già esistente');
  tables.push({ name, email, pin });
  saveTables(tables);
}

// Utenti (userId unico per tavolo)
function loadUsers() { return loadOrInit('users.json', []); }
function saveUsers(users) { save('users.json', users); }
function findUser({ userId, table }) {
  return loadUsers().find(u => u.userId === userId && u.table === table);
}
function createUser({ userId, table }) {
  const users = loadUsers();
  if (users.find(u => u.userId === userId && u.table === table))
    throw new Error('Nickname già usato nel tavolo');
  users.push({ userId, table, points: 0 });
  saveUsers(users);
}
function addPoints({ userId, table, points }) {
  const users = loadUsers();
  const user = users.find(u => u.userId === userId && u.table === table);
  if (!user) return null;
  user.points += points;
  saveUsers(users);
  return user;
}

// ---------------------
// REGISTRAZIONE AZIONI (per limiti e log)
// ---------------------
function loadActions() { return loadOrInit('actions.json', []); }
function saveActions(actions) { save('actions.json', actions); }
function registerAction({ userId, table, type, context }) {
  const actions = loadActions();
  actions.push({ userId, table, type, context, when: Date.now() });
  saveActions(actions);
}
function countActions({ userId, table, type, context }) {
  return loadActions().filter(
    a => a.userId === userId && a.table === table && a.type === type && (!context || a.context === context)
  ).length;
}
function actionExists({ userId, table, type, context }) {
  if (typeof context === 'undefined') {
    // Ignora context nella ricerca
    return loadActions().some(
      a => a.userId === userId && a.table === table && a.type === type
    );
  }
  return loadActions().some(
    a => a.userId === userId && a.table === table && a.type === type && a.context === context
  );
}

// ---------------------
// CLASSIFICHE
// ---------------------
function getTableScores() {
  const users = loadUsers();
  const tableScores = {};
  users.forEach(u => {
    if (!tableScores[u.table]) tableScores[u.table] = 0;
    tableScores[u.table] += u.points;
  });
  return Object.entries(tableScores)
    .map(([table, points]) => ({ table, points }))
    .sort((a, b) => b.points - a.points);
}
function getUserScores(table) {
  return loadUsers().filter(u => u.table === table)
    .map(u => ({ userId: u.userId, points: u.points }));
}

// ---------------------
// ENDPOINTS AUTENTICAZIONE
// ---------------------

// Crea tavolo
app.post('/api/auth/register-table', (req, res) => {
  const { name, email, pin } = req.body;
  if (!name || !email || !pin) return res.status(400).json({ error: 'Dati mancanti' });
  try {
    createTable({ name, email, pin });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Login tavolo
app.post('/api/auth/login-table', (req, res) => {
  const { name, pin } = req.body;
  const table = findTable(name);
  if (!table || table.pin !== pin) return res.status(401).json({ error: 'Tavolo o PIN errati' });
  res.json({ ok: true });
});

// Login utente (nickname unico nel tavolo)
app.post('/api/auth/login-user', (req, res) => {
  const { userId, table } = req.body;
  if (!userId || !table) return res.status(400).json({ error: 'Dati mancanti' });
  try {
    createUser({ userId, table });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------------------
// ENDPOINTS AZIONI CON REGOLE, LIMITI E PUNTEGGI
// ---------------------

// ----> FAN: solo una volta per gara, +200 (+400 se vince, gestito dopo)
app.post('/api/fan', (req, res) => {
  if (!currentScene || currentScene.name !== "start")
    return res.status(403).json({ error: "Tifo non abilitato in questa scena" });
  const { userId, table, contestant } = req.body;
  if (!userId || !table || !contestant) return res.status(400).json({ error: 'Missing data' });
  if (!findUser({ userId, table })) return res.status(404).json({ error: 'Utente non trovato' });

  // controllo concorrente valido
  if (validContestants.length && !validContestants.includes(contestant)) {
    return res.status(400).json({ error: "Concorrente non valido" });
  }

  // controllo: già scelto fan, IGNORO context!
  if (actionExists({ userId, table, type: 'fan', context: undefined })) {
    return res.status(403).json({ error: "Hai già scelto un fan" });
  }

  registerAction({ userId, table, type: 'fan', context: contestant });
  addPoints({ userId, table, points: 200 });
  socket.emit("fan", { userId, table, contestant });
  res.json({ ok: true });
});

// ----> SCOMMESSA: 1 per round, +50 solo se indovinata
app.post('/api/bet', (req, res) => {
  if (!currentScene || currentScene.name !== "estrazione")
    return res.status(403).json({ error: "Scommesse non abilitate in questa scena" });
  const { userId, table, round, song, correct } = req.body;
  if (!userId || !table || !round || !song) return res.status(400).json({ error: 'Missing data' });
  if (!findUser({ userId, table })) return res.status(404).json({ error: 'Utente non trovato' });
  if (actionExists({ userId, table, type: 'bet', context: round }))
    return res.status(403).json({ error: "Hai già scommesso per questo round" });
  registerAction({ userId, table, type: 'bet', context: round });
  if (correct) addPoints({ userId, table, points: 50 });
  socket.emit("bet", { userId, table, round, song, correct });
  res.json({ ok: true });
});

// ----> REACTION: max 10 per esibizione, +10 ciascuna
app.post('/api/reaction', (req, res) => {
  if (!currentScene || currentScene.name !== "esibizione")
    return res.status(403).json({ error: "Reaction non abilitata in questa scena" });
  const { userId, table, performance, type } = req.body;
  if (!userId || !table || !performance || !type) return res.status(400).json({ error: 'Missing data' });
  if (!findUser({ userId, table })) return res.status(404).json({ error: 'Utente non trovato' });
  const key = performance;
  const n = countActions({ userId, table, type: 'reaction', context: key });
  if (n >= 10) return res.status(403).json({ error: 'Hai raggiunto il limite di reaction per questa esibizione' });
  registerAction({ userId, table, type: 'reaction', context: key });
  addPoints({ userId, table, points: 10 });
  // Overlay reaction per YOUBOX
  socket.emit("show-reaction", { userId, table, type, performance });
  res.json({ ok: true });
});

// ----> VOTO: 1 per esibizione, +50
app.post('/api/vote', (req, res) => {
  if (!currentScene || currentScene.name !== "votazione")
    return res.status(403).json({ error: "Votazione non abilitata in questa scena" });
  const { userId, table, performance, vote } = req.body;
  if (!userId || !table || !performance || typeof vote !== 'number') return res.status(400).json({ error: 'Missing data' });
  if (!findUser({ userId, table })) return res.status(404).json({ error: 'Utente non trovato' });
  if (actionExists({ userId, table, type: 'vote', context: performance }))
    return res.status(403).json({ error: "Hai già votato per questa esibizione" });
  registerAction({ userId, table, type: 'vote', context: performance });
  addPoints({ userId, table, points: 50 });
  // Registra voto per storico (come prima)
  let votes = loadOrInit('votes.json');
  votes.push({ userId, table, performance, vote, when: Date.now(), contestant: currentContestant, song: currentSong });
  save('votes.json', votes);
  // Totale voti per performance
  const totale = votes.filter(v => v.performance === performance).reduce((sum, v) => sum + v.vote, 0);
  socket.emit("update-score", { performance, totale });
  res.json({ ok: true });
});

// ----> LOGO: solo primi 3, +100 una sola volta per gara
let logoWinners = loadOrInit('logoWinners.json', []);
app.post('/api/logo', (req, res) => {
  if (!currentScene || currentScene.name !== "logo")
    return res.status(403).json({ error: "Logo click non abilitato in questa scena" });
  const { userId, table } = req.body;
  if (!userId || !table) return res.status(400).json({ error: 'Missing data' });
  if (!findUser({ userId, table })) return res.status(404).json({ error: 'Utente non trovato' });
  if (logoWinners.find(lw => lw.userId === userId && lw.table === table))
    return res.status(403).json({ error: 'Hai già cliccato il logo' });
  if (logoWinners.length >= 3)
    return res.status(403).json({ error: 'Troppo tardi!' });
  logoWinners.push({ userId, table });
  save('logoWinners.json', logoWinners);
  registerAction({ userId, table, type: 'logo' });
  addPoints({ userId, table, points: 100 });
  socket.emit("logo", { userId, table });
  res.json({ ok: true });
});

// ----> TEAM FINALISTA: 1 scelta dopo round 1, punti a fine gara
app.post('/api/teamfinalist', (req, res) => {
  if (!currentScene || currentScene.name !== "finalisti")
    return res.status(403).json({ error: "Team finalista non abilitato in questa scena" });
  const { userId, table, team } = req.body;
  if (!userId || !table || !team) return res.status(400).json({ error: 'Missing data' });
  if (!findUser({ userId, table })) return res.status(404).json({ error: 'Utente non trovato' });
  if (actionExists({ userId, table, type: 'teamfinalist', context: undefined }))
    return res.status(403).json({ error: 'Hai già scelto il team' });
  registerAction({ userId, table, type: 'teamfinalist', context: team });
  // I punti vengono assegnati dopo via endpoint admin
  socket.emit("teamfinalist", { userId, table, team });
  res.json({ ok: true });
});

// ----> SOCIAL BONUS: manuale, +50/+100, nessun limite
app.post('/api/socialbonus', (req, res) => {
  const { userId, table, amount } = req.body;
  if (!userId || !table || !amount) return res.status(400).json({ error: 'Missing data' });
  if (!findUser({ userId, table })) return res.status(404).json({ error: 'Utente non trovato' });
  registerAction({ userId, table, type: 'socialbonus', context: amount });
  addPoints({ userId, table, points: Number(amount) });
  socket.emit("socialbonus", { userId, table, amount });
  res.json({ ok: true });
});

// ----> ASSEGNAZIONE PUNTI TEAM FINALISTA (admin, a fine gara)
app.post('/api/teamfinalist/assegna-punti', (req, res) => {
  // Body: { teamClassifica: ["teamA", "teamB", "teamC"] }
  const { teamClassifica } = req.body;
  if (!teamClassifica || !Array.isArray(teamClassifica) || teamClassifica.length < 3)
    return res.status(400).json({ error: 'Devi fornire una classifica di almeno 3 team' });
  const actions = loadActions();
  // 1°: 300, 2°: 200, 3°: 100
  const punti = [300, 200, 100];
  teamClassifica.slice(0, 3).forEach((team, idx) => {
    actions.filter(a => a.type === 'teamfinalist' && a.context === team).forEach(a => {
      addPoints({ userId: a.userId, table: a.table, points: punti[idx] });
    });
  });
  res.json({ ok: true });
});

// ----> RADDOPPIO FAN (admin, a fine gara, per vincitore)
app.post('/api/fan/raddoppio', (req, res) => {
  // Body: { contestant }
  const { contestant } = req.body;
  if (!contestant) return res.status(400).json({ error: 'Serve il nome del vincitore' });
  const actions = loadActions();
  actions.filter(a => a.type === 'fan' && a.context === contestant).forEach(a => {
    addPoints({ userId: a.userId, table: a.table, points: 200 }); // +200 extra (totale 400)
  });
  res.json({ ok: true });
});

// ---------------------
// ENDPOINTS CLASSIFICHE E INFO UTENTE/TAVOLO
// ---------------------

app.get('/api/scores/tables', (req, res) => {
  res.json(getTableScores());
});
app.get('/api/scores/users/:table', (req, res) => {
  res.json(getUserScores(req.params.table));
});
app.get('/api/scores/user/:table/:userId', (req, res) => {
  const user = findUser({ userId: req.params.userId, table: req.params.table });
  if (user) res.json(user);
  else res.status(404).json({ error: 'User not found' });
});

// ---------------------
// ENDPOINTS AGGREGATI, STORICO E STATO ATTUALE (come prima)
// ---------------------
app.get('/api/stats', (req, res) => {
  res.json({
    votes: loadOrInit('votes.json'),
    fan: loadActions().filter(a => a.type === 'fan'),
    bets: loadActions().filter(a => a.type === 'bet'),
    reactions: loadActions().filter(a => a.type === 'reaction'),
    logo: loadActions().filter(a => a.type === 'logo'),
    teamfinalist: loadActions().filter(a => a.type === 'teamfinalist'),
    socialbonus: loadActions().filter(a => a.type === 'socialbonus'),
    tables: loadTables(),
    users: loadUsers(),
    logoWinners
  });
});

app.get('/api/current', (req, res) => {
  res.json({
    scene: currentScene,
    contestant: currentContestant,
    song: currentSong,
    validContestants
  });
});

// ---------------------
// AVVIO SERVER
// ---------------------
app.listen(PORT, () => {
  console.log(`Public backend listening on port ${PORT}`);
});