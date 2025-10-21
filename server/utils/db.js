// server/utils/db.js
const fs = require("fs-extra");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "db.json");

const getDB = async () => {
  const data = await fs.readJson(DB_PATH);
  return data;
};

const saveDB = async (data) => {
  await fs.writeJson(DB_PATH, data, { spaces: 2 });
};

module.exports = { getDB, saveDB };