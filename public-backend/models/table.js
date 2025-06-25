const fs = require('fs-extra');
const path = require('path');
const TABLES_FILE = path.join(__dirname, '../data/tables.json');

function loadTables() {
  if (fs.existsSync(TABLES_FILE)) return fs.readJsonSync(TABLES_FILE);
  return [];
}

function saveTables(tables) {
  fs.writeJsonSync(TABLES_FILE, tables, { spaces: 2 });
}

function createTable({ name, email, pin }) {
  const tables = loadTables();
  if (tables.find(t => t.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('Tavolo già esistente');
  }
  const newTable = { name, email, pin, users: [] };
  tables.push(newTable);
  saveTables(tables);
  return newTable;
}

function findTable(name) {
  const tables = loadTables();
  return tables.find(t => t.name.toLowerCase() === name.toLowerCase());
}

module.exports = { loadTables, saveTables, createTable, findTable };