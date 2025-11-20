const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.static("public"));
app.use(express.json());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Route pour la page principale
app.get("/", (req, res) => {
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
    // Envoyer une réponse d'erreur structurée
    res.status(500).json({
      error: "Failed to load heroes",
      message: error.message,
      heroes: [], // Assure que heroes est toujours un array
    });
  }
});

// Fonction pour charger l'ordre de release - VERSION CORRIGÉE POUR OBJET
function loadReleaseOrder() {
  try {
    const releaseOrderPath = path.join(
      __dirname,
      "public",
      "kingsraid-data",
      "hero_release_order.json"
    );

    if (fs.existsSync(releaseOrderPath)) {
      const fileContent = fs.readFileSync(releaseOrderPath, "utf8");
      const releaseData = JSON.parse(fileContent);

      // Convertir l'objet en array de noms triés par ordre numérique
      if (releaseData && typeof releaseData === "object") {
        const releaseArray = Object.entries(releaseData)
          .sort((a, b) => parseInt(a[1]) - parseInt(b[1]))
          .map((entry) => entry[0]);

        console.log(`📅 Ordre de release chargé: ${releaseArray.length} héros`);
        console.log(`📊 Exemples: ${releaseArray.slice(0, 3).join(", ")}...`);
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

// Fonction pour trier les héros - VERSION CORRIGÉE
function sortHeroes(heroes, sortType) {
  const releaseOrder = loadReleaseOrder();

  switch (sortType) {
    case "release":
      // Trier par ordre de release
      return heroes.sort((a, b) => {
        const indexA = releaseOrder.indexOf(a.name);
        const indexB = releaseOrder.indexOf(b.name);

        // Si les deux sont dans la liste, trier par ordre de release
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }

        // Si un seul est dans la liste, le mettre en premier
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        // Si aucun n'est dans la liste, trier par nom
        return a.name.localeCompare(b.name);
      });

    case "name":
    default:
      // Trier par nom (ordre alphabétique)
      return heroes.sort((a, b) => a.name.localeCompare(b.name));
  }
}

// FONCTION CORRIGÉE : Charge tous les héros depuis table-data/heroes
function getAllHeroesWithDetails() {
  const heroesDataPath = path.join(
    __dirname,
    "public",
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

// Fallback si la lecture des fichiers échoue
function getFallbackHeroes() {
  const heroesPath = path.join(
    __dirname,
    "public",
    "kingsraid-data",
    "assets",
    "heroes"
  );
  let availableHeroes = [];

  try {
    if (fs.existsSync(heroesPath)) {
      availableHeroes = fs.readdirSync(heroesPath).filter((item) => {
        const itemPath = path.join(heroesPath, item);
        return (
          fs.statSync(itemPath).isDirectory() &&
          fs.existsSync(path.join(itemPath, "ico.png"))
        );
      });
    }
  } catch (error) {
    console.error("Error scanning hero folders:", error);
    availableHeroes = [
      "Annette",
      "Arch",
      "Aisha",
      "Cleo",
      "Frey",
      "Kasel",
      "Clause",
      "Roi",
    ];
  }

  const releaseOrder = loadReleaseOrder();

  return availableHeroes.map((name, index) => ({
    id: index + 1,
    name: name,
    role: getRoleFromName(name),
    rarity: 5,
    image: `/kingsraid-data/assets/heroes/${name}/ico.png`,
    releaseOrder: releaseOrder.indexOf(name),
    hasReleaseOrder: releaseOrder.indexOf(name) !== -1,
  }));
}

// Fonction pour récupérer le rôle depuis les données du héros
function getRoleFromData(heroData) {
  // Essayer infos.class d'abord
  if (heroData?.infos?.class) {
    return heroData.infos.class;
  }

  // Essayer role directement
  if (heroData?.role) {
    return heroData.role;
  }

  // Fallback sur le mapping par nom
  return getRoleFromName(heroData.infos?.name);
}

// Mapping de fallback
function getRoleFromName(name) {
  const roleMap = {
    // Warriors
    Bernheim: "Warrior",
    Kasel: "Warrior",
    Gau: "Warrior",
    Naila: "Warrior",
    Ricardo: "Warrior",
    Mitra: "Warrior",
    Gladi: "Warrior",
    Scarlet: "Warrior",
    // Wizards
    Cleo: "Wizard",
    Maria: "Wizard",
    Aisha: "Wizard",
    Pavel: "Wizard",
    Arch: "Wizard",
    Lorraine: "Wizard",
    Theo: "Wizard",
    Artemia: "Wizard",
    // Priests
    Frey: "Priest",
    Kaulah: "Priest",
    Laias: "Priest",
    Rephy: "Priest",
    Annette: "Priest",
    Baudouin: "Priest",
    Shea: "Priest",
    Cassandra: "Priest",
    // Knights
    Clause: "Knight",
    Phillop: "Knight",
    Jane: "Knight",
    Morrah: "Knight",
    Sonia: "Knight",
    Demia: "Knight",
    Aselica: "Knight",
    Cecilia: "Knight",
    // Assassins
    Cain: "Assassin",
    Roi: "Assassin",
    Epis: "Assassin",
    Tanya: "Assassin",
    Fluss: "Assassin",
    Ezekiel: "Assassin",
    Mirianne: "Assassin",
    // Archers
    Luna: "Archer",
    Yanne: "Archer",
    Selene: "Archer",
    Reina: "Archer",
    // Mechanics
    Lakrak: "Mechanic",
    Rodina: "Mechanic",
    Miruru: "Mechanic",
  };

  return roleMap[name] || "Unknown";
}

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🎮 KingsRaid Team Builder démarré sur http://localhost:${PORT}`);
  console.log(`📁 Utilisation des données locales dans public/kingsraid-data/`);
});

module.exports = app;
