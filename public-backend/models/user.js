const fs = require('fs-extra');
const path = require('path');
const USERS_FILE = path.join(__dirname, '../data/users.json');

function loadUsers() {
  if (fs.existsSync(USERS_FILE)) return fs.readJsonSync(USERS_FILE);
  return [];
}
function saveUsers(users) {
  fs.writeJsonSync(USERS_FILE, users, { spaces: 2 });
}

function createUser({ userId, table }) {
  // userId unico nel tavolo
  const users = loadUsers();
  if (users.find(u => u.userId === userId && u.table === table)) {
    throw new Error('Nickname già usato nel tavolo');
  }
  const user = { userId, table, points: 0, actions: {} };
  users.push(user);
  saveUsers(users);
  return user;
}

function findUser({ userId, table }) {
  const users = loadUsers();
  return users.find(u => u.userId === userId && u.table === table);
}

function addPoints({ userId, table, points }) {
  const users = loadUsers();
  const user = users.find(u => u.userId === userId && u.table === table);
  if (!user) return null;
  user.points += points;
  saveUsers(users);
  return user;
}

module.exports = { loadUsers, saveUsers, createUser, findUser, addPoints };