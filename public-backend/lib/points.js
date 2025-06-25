const { loadUsers } = require('../models/user');

function getTableScores() {
  const users = loadUsers();
  const tableScores = {};
  users.forEach(u => {
    if (!tableScores[u.table]) tableScores[u.table] = 0;
    tableScores[u.table] += u.points;
  });
  // Array ordinato decrescente
  return Object.entries(tableScores)
    .map(([table, points]) => ({ table, points }))
    .sort((a, b) => b.points - a.points);
}

function getUserScores(table) {
  const { loadUsers } = require('../models/user');
  return loadUsers().filter(u => u.table === table)
    .map(u => ({ userId: u.userId, points: u.points }));
}

module.exports = { getTableScores, getUserScores };