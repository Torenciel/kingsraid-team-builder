const express = require("express");
const path = require("path");
const fs = require("fs");
const teamDB = require("./db"); // ← Nouvelle importation

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.static("public"));
app.use(express.json());

// Routes principales
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/team/:id/:title", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// API pour sauvegarder une équipe
app.post("/api/teams", async (req, res) => {
  try {
    const teamData = req.body;

    if (!teamData || !teamData.h) {
      return res.status(400).json({ error: "Invalid team data" });
    }

    const title = teamData.t || "Unknown Team";
    let teamId;
    let attempts = 0;

    // Générer un ID unique (gérer les collisions potentielles)
    do {
      teamId = generateShortId();
      attempts++;

      if (attempts > 5) {
        throw new Error("Could not generate unique team ID after 5 attempts");
      }
    } while (!(await teamDB.saveTeam(teamId, teamData, title)));

    // Obtenir les statistiques (optionnel)
    const stats = await teamDB.getStats();
    console.log(
      `📊 Database stats: ${stats.total_teams} total teams, ${stats.total_accesses} total accesses`
    );

    res.json({
      success: true,
      id: teamId,
      message: "Team saved permanently in database",
    });
  } catch (error) {
    console.error("Error saving team:", error);
    res.status(500).json({ error: "Failed to save team: " + error.message });
  }
});

// API pour charger une équipe
app.get("/api/teams/:id", async (req, res) => {
  try {
    const teamId = req.params.id;
    const team = await teamDB.getTeam(teamId);

    if (team) {
      console.log(
        `📂 Team loaded from database: ${teamId} (access #${
          team.accessCount + 1
        })`
      );
      res.json({
        success: true,
        data: team.data,
      });
    } else {
      console.log(`❌ Team not found in database: ${teamId}`);
      res.status(404).json({
        success: false,
        error: "Team not found",
      });
    }
  } catch (error) {
    console.error("Error loading team from database:", error);
    res.status(500).json({ error: "Failed to load team: " + error.message });
  }
});

// API pour les statistiques (optionnel - pour le debug)
app.get("/api/stats", async (req, res) => {
  try {
    const stats = await teamDB.getStats();
    res.json({
      success: true,
      stats: stats,
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// Générer un ID court (6 caractères)
function generateShortId() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// API pour tous les héros
app.get("/api/heroes", (req, res) => {
  try {
    const { sort = "name" } = req.query;
    console.log(`🔍 Requête API reçue - tri: ${sort}`);

    const heroes = getAllHeroesWithDetails();
    console.log(`📦 ${heroes.length} héros chargés avant tri`);

    // Trier les héros
    const sortedHeroes = sortHeroes(heroes, sort);
    console.log(`🔄 ${sortedHeroes.length} héros après tri`);

    // Vérifier quels héros ont des images
    const missingHeroes = [];
    const heroesWithImages = [];

    sortedHeroes.forEach((hero) => {
      const imagePath = path.join(__dirname, "public", hero.image);
      if (fs.existsSync(imagePath)) {
        heroesWithImages.push(hero);
      } else {
        missingHeroes.push(hero.name);
      }
    });

    // Préparer la réponse
    const response = {
      heroes: heroesWithImages,
      missingHeroes: missingHeroes,
      total: heroes.length,
      loaded: heroesWithImages.length,
      missingCount: missingHeroes.length,
      currentSort: sort,
    };

    console.log(
      `✅ Réponse préparée: ${response.heroes.length} héros avec images`
    );

    res.json(response);
  } catch (error) {
    console.error("❌ Error loading hero data:", error);
    res.status(500).json({
      error: "Failed to load heroes",
      message: error.message,
      heroes: [],
    });
  }
});

// Fonction pour charger l'ordre de release
function loadReleaseOrder() {
  try {
    const releaseOrderPath = path.join(
      __dirname,
      "public", // ← CORRIGÉ : chemin vers public
      "kingsraid-data",
      "hero_release_order.json"
    );

    if (fs.existsSync(releaseOrderPath)) {
      const fileContent = fs.readFileSync(releaseOrderPath, "utf8");
      const releaseData = JSON.parse(fileContent);

      if (releaseData && typeof releaseData === "object") {
        const releaseArray = Object.entries(releaseData)
          .sort((a, b) => parseInt(a[1]) - parseInt(b[1]))
          .map((entry) => entry[0]);

        console.log(`📅 Ordre de release chargé: ${releaseArray.length} héros`);
        return releaseArray;
      } else {
        console.log("❌ Format de fichier non reconnu");
        return [];
      }
    } else {
      console.log("❌ Fichier hero_release_order.json non trouvé");
      return [];
    }
  } catch (error) {
    console.error("❌ Erreur lecture ordre de release:", error);
    return [];
  }
}

// Fonction pour trier les héros
function sortHeroes(heroes, sortType) {
  const releaseOrder = loadReleaseOrder();

  switch (sortType) {
    case "release":
      return heroes.sort((a, b) => {
        const indexA = releaseOrder.indexOf(a.name);
        const indexB = releaseOrder.indexOf(b.name);

        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }

        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        return a.name.localeCompare(b.name);
      });

    case "name":
    default:
      return heroes.sort((a, b) => a.name.localeCompare(b.name));
  }
}

// FONCTION CORRIGÉE : Charge tous les héros depuis table-data/heroes
function getAllHeroesWithDetails() {
  const heroesDataPath = path.join(
    __dirname,
    "public", // ← CORRIGÉ : chemin vers public
    "kingsraid-data",
    "table-data",
    "heroes"
  );

  let heroFiles = [];

  try {
    if (fs.existsSync(heroesDataPath)) {
      heroFiles = fs.readdirSync(heroesDataPath).filter((file) => {
        return file.endsWith(".json") && file !== "heroes.json";
      });
    }

    console.log(
      `📁 ${heroFiles.length} fichiers de héros trouvés dans table-data/heroes`
    );
  } catch (error) {
    console.error("Error scanning hero files:", error);
    return [];
  }

  const heroes = [];
  const releaseOrder = loadReleaseOrder();

  heroFiles.forEach((fileName) => {
    try {
      const heroJsonPath = path.join(heroesDataPath, fileName);
      const heroData = JSON.parse(fs.readFileSync(heroJsonPath, "utf8"));
      const heroName = heroData.infos?.name || fileName.replace(".json", "");

      const releaseIndex = releaseOrder.indexOf(heroName);

      heroes.push({
        id: heroName,
        name: heroName,
        role: getRoleFromData(heroData),
        rarity: 5,
        image: `/kingsraid-data/assets/heroes/${heroName}/ico.png`,
        releaseOrder: releaseIndex,
        hasReleaseOrder: releaseIndex !== -1,
      });
    } catch (error) {
      console.error(`❌ Erreur lecture ${fileName}:`, error.message);
    }
  });

  console.log(`📊 ${heroes.length} héros préparés`);
  return heroes;
}

// Fonction pour récupérer le rôle depuis les données du héros
function getRoleFromData(heroData) {
  if (heroData?.infos?.class) {
    return heroData.infos.class;
  }

  if (heroData?.role) {
    return heroData.role;
  }

  return getRoleFromName(heroData.infos?.name);
}

// Mapping de fallback
function getRoleFromName(name) {
  const roleMap = {
    // Warriors
    Kasel: "Warrior",
    // Wizards
    Cleo: "Wizard",
    // Priests
    Frey: "Priest",
    // Knights
    Clause: "Knight",
    // Assassins
    Roi: "Assassin",
    // Archers
    Selene: "Archer",
    // Mechanics
    Lakrak: "Mechanic",
  };

  return roleMap[name] || "Unknown";
}

// Démarrer le serveur après initialisation de la DB
teamDB
  .init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `🎮 KingsRaid Team Builder démarré sur http://localhost:${PORT}`
      );
      console.log(`💾 SQLite database enabled - Permanent links!`);
    });
  })
  .catch((error) => {
    console.error("❌ Failed to initialize database:", error);
    process.exit(1);
  });

// Arrêt propre
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");
  teamDB.close();
  process.exit(0);
});

module.exports = app;
