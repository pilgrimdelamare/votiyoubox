const express = require('express');
const router = express.Router();
const { findUser, addPoints } = require('../models/user');
const { registerAction, countActions, actionExists } = require('../models/action');
const { getTableScores } = require('../lib/points');

// Helper per limiti
const limits = {
  vote: 1,              // per esibizione
  reaction: 10,         // per esibizione
  fan: 1,               // per gara
  bet: 1,               // per round
  logo: 1,              // primi 3 e una sola volta per gara
  teamfinalist: 1,      // per gara
  socialbonus: null     // manuale
};

// Voto esibizione
router.post('/vote', (req, res) => {
  const { userId, table, performance } = req.body;
  if (!userId || !table || !performance) return res.status(400).json({ error: 'Missing data' });
  const user = findUser({ userId, table });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const key = `${performance}`;
  const alreadyVoted = actionExists({ userId, table, type: 'vote', context: key });
  if (alreadyVoted) return res.status(403).json({ error: 'Hai già votato per questa esibizione' });

  registerAction({ userId, table, type: 'vote', context: key });
  addPoints({ userId, table, points: 50 });

  // TODO: socket.emit a YOUBOX
  res.json({ ok: true });
});

// Reaction
router.post('/reaction', (req, res) => {
  const { userId, table, performance, type } = req.body;
  if (!userId || !table || !performance || !type) return res.status(400).json({ error: 'Missing data' });
  const user = findUser({ userId, table });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const key = `${performance}`;
  const n = countActions({ userId, table, type: 'reaction', context: key });
  if (n >= 10) return res.status(403).json({ error: 'Hai raggiunto il limite di reaction per questa esibizione' });

  registerAction({ userId, table, type: 'reaction', context: key });
  addPoints({ userId, table, points: 10 });

  // TODO: socket.emit a YOUBOX con { type, table }
  res.json({ ok: true });
});

// Fan
router.post('/fan', (req, res) => {
  const { userId, table, contestant } = req.body;
  if (!userId || !table || !contestant) return res.status(400).json({ error: 'Missing data' });
  const user = findUser({ userId, table });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const already = actionExists({ userId, table, type: 'fan' });
  if (already) return res.status(403).json({ error: 'Hai già scelto il concorrente fan' });

  registerAction({ userId, table, type: 'fan', context: contestant });
  addPoints({ userId, table, points: 200 });

  // TODO: socket.emit a YOUBOX
  res.json({ ok: true });
});

// Bet
router.post('/bet', (req, res) => {
  const { userId, table, round, song, correct } = req.body;
  if (!userId || !table || !round || !song) return res.status(400).json({ error: 'Missing data' });
  const user = findUser({ userId, table });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const key = `${round}`;
  const already = actionExists({ userId, table, type: 'bet', context: key });
  if (already) return res.status(403).json({ error: 'Hai già scommesso per questo round' });

  registerAction({ userId, table, type: 'bet', context: key });
  if (correct) addPoints({ userId, table, points: 50 });

  // TODO: socket.emit a YOUBOX
  res.json({ ok: true });
});

// Logo (solo primi 3)
let logoWinners = [];
router.post('/logo', (req, res) => {
  const { userId, table } = req.body;
  if (!userId || !table) return res.status(400).json({ error: 'Missing data' });
  const user = findUser({ userId, table });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (logoWinners.length >= 3) return res.status(403).json({ error: 'Troppo tardi!' });
  if (logoWinners.find(lw => lw.userId === userId && lw.table === table))
    return res.status(403).json({ error: 'Hai già cliccato il logo' });

  logoWinners.push({ userId, table });
  registerAction({ userId, table, type: 'logo' });
  addPoints({ userId, table, points: 100 });

  // TODO: socket.emit a YOUBOX
  res.json({ ok: true });
});

// Team finalista
router.post('/teamfinalist', (req, res) => {
  const { userId, table, team } = req.body;
  if (!userId || !table || !team) return res.status(400).json({ error: 'Missing data' });
  const user = findUser({ userId, table });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const already = actionExists({ userId, table, type: 'teamfinalist' });
  if (already) return res.status(403).json({ error: 'Hai già scelto il team' });

  registerAction({ userId, table, type: 'teamfinalist', context: team });
  // I punti vengono assegnati a fine gara, vedere API apposita

  // TODO: socket.emit a YOUBOX
  res.json({ ok: true });
});

// Social bonus (admin/manuale)
router.post('/socialbonus', (req, res) => {
  const { userId, table, amount } = req.body;
  if (!userId || !table || !amount) return res.status(400).json({ error: 'Missing data' });
  const user = findUser({ userId, table });
  if (!user) return res.status(404).json({ error: 'User not found' });

  registerAction({ userId, table, type: 'socialbonus', context: amount });
  addPoints({ userId, table, points: Number(amount) });

  // TODO: socket.emit a YOUBOX
  res.json({ ok: true });
});

module.exports = router;