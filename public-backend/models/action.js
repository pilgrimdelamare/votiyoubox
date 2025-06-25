const fs = require('fs-extra');
const path = require('path');
const ACTIONS_FILE = path.join(__dirname, '../data/actions.json');

function loadActions() {
  if (fs.existsSync(ACTIONS_FILE)) return fs.readJsonSync(ACTIONS_FILE);
  return [];
}
function saveActions(actions) {
  fs.writeJsonSync(ACTIONS_FILE, actions, { spaces: 2 });
}

function registerAction({ userId, table, type, context }) {
  const actions = loadActions();
  actions.push({ userId, table, type, context, when: Date.now() });
  saveActions(actions);
}

function countActions({ userId, table, type, context }) {
  const actions = loadActions();
  return actions.filter(
    a => a.userId === userId && a.table === table && a.type === type && (!context || a.context === context)
  ).length;
}

function actionExists({ userId, table, type, context }) {
  const actions = loadActions();
  return actions.some(
    a => a.userId === userId && a.table === table && a.type === type && (!context || a.context === context)
  );
}

module.exports = { loadActions, saveActions, registerAction, countActions, actionExists };