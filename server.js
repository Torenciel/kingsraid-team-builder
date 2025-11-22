const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware - SERVIR le dossier public
app.use(express.static("public"));

// Routes principales
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/team/:data/:title", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

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

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🎮 KingsRaid Team Builder démarré sur http://localhost:${PORT}`);
  console.log(`📁 Utilisation des données locales dans public/kingsraid-data/`);
});

module.exports = app;
