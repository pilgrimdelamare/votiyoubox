const express = require('express');
const router = express.Router();
const { getTableScores, getUserScores } = require('../lib/points');
const { findUser } = require('../models/user');

// Classifica tavoli
router.get('/tables', (req, res) => {
  res.json(getTableScores());
});

// Punteggi utenti di un tavolo
router.get('/users/:table', (req, res) => {
  res.json(getUserScores(req.params.table));
});

// Info personale utente
router.get('/user/:table/:userId', (req, res) => {
  const user = findUser({ userId: req.params.userId, table: req.params.table });
  if (user) res.json(user);
  else res.status(404).json({ error: 'User not found' });
});

module.exports = router;