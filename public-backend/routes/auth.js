const express = require('express');
const router = express.Router();
const { createTable, findTable } = require('../models/table');
const { createUser, findUser } = require('../models/user');

// Crea tavolo
router.post('/register-table', (req, res) => {
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
router.post('/login-table', (req, res) => {
  const { name, pin } = req.body;
  const table = findTable(name);
  if (!table || table.pin !== pin) return res.status(401).json({ error: 'Tavolo o PIN errati' });
  res.json({ ok: true });
});

// Login utente in tavolo
router.post('/login-user', (req, res) => {
  const { userId, table } = req.body;
  if (!userId || !table) return res.status(400).json({ error: 'Dati mancanti' });
  try {
    createUser({ userId, table });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;