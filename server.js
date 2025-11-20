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
    const heroes = getAllHeroesWithDetails();

    // Vérifier quels héros ont des images
    const missingHeroes = [];
    const heroesWithImages = [];

    heroes.forEach((hero) => {
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
    };

    console.log(`📊 ${response.loaded}/${response.total} héros avec images`);
    console.log("🔍 Rôles chargés:");
    heroesWithImages.forEach((hero) => {
      console.log(`   ${hero.name}: ${hero.role}`);
    });

    res.json(response);
  } catch (error) {
    console.error("Error loading hero data:", error);
    res.status(500).json({ error: "Failed to load heroes" });
  }
});

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
    return getFallbackHeroes();
  }

  const heroes = [];

  heroFiles.forEach((fileName) => {
    try {
      const heroJsonPath = path.join(heroesDataPath, fileName);
      const heroData = JSON.parse(fs.readFileSync(heroJsonPath, "utf8"));
      const heroName = heroData.infos?.name || fileName.replace(".json", "");

      heroes.push({
        id: heroName,
        name: heroName,
        role: getRoleFromData(heroData),
        rarity: 5,
        image: `/kingsraid-data/assets/heroes/${heroName}/ico.png`,
      });
    } catch (error) {
      console.error(`❌ Erreur lecture ${fileName}:`, error.message);
    }
  });

  // Si aucun héros n'a été chargé, utiliser le fallback
  if (heroes.length === 0) {
    return getFallbackHeroes();
  }

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

  return availableHeroes.map((name, index) => ({
    id: index + 1,
    name: name,
    role: getRoleFromName(name),
    rarity: 5,
    image: `/kingsraid-data/assets/heroes/${name}/ico.png`,
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
