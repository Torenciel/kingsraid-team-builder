// db.js - Module de base de données SQLite
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

class TeamDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, "teams.db");
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error("❌ Error opening database:", err);
          reject(err);
          return;
        }
        console.log("✅ Connected to SQLite database");
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      this.db.run(
        `
        CREATE TABLE IF NOT EXISTS teams (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          access_count INTEGER DEFAULT 0,
          last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Créer des index pour les performances
          this.db.run(
            `CREATE INDEX IF NOT EXISTS idx_created_at ON teams(created_at)`
          );
          this.db.run(
            `CREATE INDEX IF NOT EXISTS idx_last_accessed ON teams(last_accessed)`
          );

          console.log("✅ Database tables and indexes ready");
          resolve();
        }
      );
    });
  }

  async saveTeam(teamId, teamData, title) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO teams (id, title, data) VALUES (?, ?, ?)`,
        [teamId, title, JSON.stringify(teamData)],
        function (err) {
          if (err) {
            // Si l'ID existe déjà, on retourne null pour regénérer
            if (err.code === "SQLITE_CONSTRAINT") {
              console.log(`🔄 ID ${teamId} already exists, generating new one`);
              resolve(null);
            } else {
              reject(err);
            }
          } else {
            console.log(`💾 Team saved to database: ${teamId}`);
            resolve(teamId);
          }
        }
      );
    });
  }

  async getTeam(teamId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT data, title, access_count FROM teams WHERE id = ?`,
        [teamId],
        async (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            // Mettre à jour les statistiques d'accès
            await this.updateAccessStats(teamId);

            resolve({
              data: JSON.parse(row.data),
              title: row.title,
              accessCount: row.access_count,
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async updateAccessStats(teamId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE teams SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP WHERE id = ?`,
        [teamId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async getStats() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 
          COUNT(*) as total_teams,
          SUM(access_count) as total_accesses,
          MAX(created_at) as latest_creation
         FROM teams`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Fermer la connexion (pour l'arrêt propre du serveur)
  close() {
    if (this.db) {
      this.db.close();
      console.log("📋 Database connection closed");
    }
  }
}

// Singleton pour une seule connexion
const teamDB = new TeamDatabase();

module.exports = teamDB;
