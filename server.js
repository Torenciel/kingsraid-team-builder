const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Route pour la page principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// API pour tous les héros
app.get('/api/heroes', (req, res) => {
    try {
        // Chemin vers les données locales
        const heroesDataPath = path.join(__dirname, 'public', 'kingsraid-data', 'table-data', 'heroes', 'heroes.json');
        
        let heroes;
        
        if (fs.existsSync(heroesDataPath)) {
            const heroesData = JSON.parse(fs.readFileSync(heroesDataPath, 'utf8'));
            
            // Transformer les données
            heroes = Object.values(heroesData).map(hero => ({
                id: hero.uniqueId || hero.id,
                name: hero.name,
                role: hero.role || 'Unknown',
                rarity: hero.rarity || 5,
                image: `/kingsraid-data/assets/heroes/${hero.name}/ico.png`
            }));
            
            console.log(`✅ ${heroes.length} héros chargés depuis heroes.json`);
            
        } else {
            // Si le fichier n'existe pas, scanner les dossiers
            console.log('ℹ️ heroes.json non trouvé, scan des dossiers...');
            heroes = getHeroesFromFolders();
        }
        
        // === AJOUT ICI ===
        // Vérifier quels héros ont des images
        const missingHeroes = [];
        const heroesWithImages = [];
        
        heroes.forEach(hero => {
            const imagePath = path.join(__dirname, 'public', hero.image);
            if (fs.existsSync(imagePath)) {
                heroesWithImages.push(hero);
            } else {
                missingHeroes.push(hero.name);
            }
        });
        
        // Préparer la réponse
        const response = {
            heroes: heroesWithImages, // Seulement ceux avec images
            missingHeroes: missingHeroes,
            total: heroes.length,
            loaded: heroesWithImages.length,
            missingCount: missingHeroes.length
        };
        
        console.log(`📊 ${response.loaded}/${response.total} héros avec images`);
        if (missingHeroes.length > 0) {
            console.log(`❌ Héros sans images: ${missingHeroes.join(', ')}`);
        }
        
        res.json(response);
        // === FIN AJOUT ===
        
    } catch (error) {
        console.error('Error loading hero data:', error);
        const fallbackHeroes = getHeroesFromFolders();
        
        // Gérer aussi les erreurs pour le fallback
        const missingHeroes = [];
        const heroesWithImages = [];
        
        fallbackHeroes.forEach(hero => {
            const imagePath = path.join(__dirname, 'public', hero.image);
            if (fs.existsSync(imagePath)) {
                heroesWithImages.push(hero);
            } else {
                missingHeroes.push(hero.name);
            }
        });
        
        const response = {
            heroes: heroesWithImages,
            missingHeroes: missingHeroes,
            total: fallbackHeroes.length,
            loaded: heroesWithImages.length,
            missingCount: missingHeroes.length
        };
        
        res.json(response);
    }
});
// Fonction pour scanner les dossiers de héros
function getHeroesFromFolders() {
    const heroesPath = path.join(__dirname, 'public', 'kingsraid-data', 'assets', 'heroes');
    let availableHeroes = [];
    
    try {
        if (fs.existsSync(heroesPath)) {
            availableHeroes = fs.readdirSync(heroesPath).filter(item => {
                const itemPath = path.join(heroesPath, item);
                return fs.statSync(itemPath).isDirectory() && 
                       fs.existsSync(path.join(itemPath, 'ico.png'));
            });
        }
        
        console.log(`📁 ${availableHeroes.length} héros trouvés dans les dossiers`);
        
    } catch (error) {
        console.error('Error scanning hero folders:', error);
        // Fallback vers une liste basique
        availableHeroes = ['Annette', 'Arch', 'Aisha', 'Cleo', 'Frey', 'Kasel', 'Clause', 'Roi'];
    }
    
    return availableHeroes.map((name, index) => ({
        id: index + 1,
        name: name,
        role: getRoleFromName(name),
        rarity: 5,
        image: `/kingsraid-data/assets/heroes/${name}/ico.png`
    }));
}

// Fonction pour vérifier quels héros ont des images
function checkHeroImages(heroes) {
    const missingImages = [];
    
    heroes.forEach(hero => {
        const imagePath = path.join(__dirname, 'public', hero.image);
        if (!fs.existsSync(imagePath)) {
            missingImages.push(hero.name);
        }
    });
    
    return missingImages;
}

// Fonction utilitaire pour déterminer le rôle
function getRoleFromName(name) {
    const roleMap = {
        // Warriors
        'Kasel': 'Warrior', 'Gau': 'Warrior', 'Naila': 'Warrior', 'Ricardo': 'Warrior',
        'Mitra': 'Warrior', 'Gladi': 'Warrior', 'Scarlet': 'Warrior',
        // Wizards
        'Cleo': 'Wizard', 'Maria': 'Wizard', 'Aisha': 'Wizard', 'Pavel': 'Wizard',
        'Arch': 'Wizard', 'Lorraine': 'Wizard', 'Theo': 'Wizard', 'Artemia': 'Wizard',
        // Priests
        'Frey': 'Priest', 'Kaulah': 'Priest', 'Laias': 'Priest', 'Rephy': 'Priest',
        'Annette': 'Priest', 'Baudouin': 'Priest', 'Shea': 'Priest',
        // Knights
        'Clause': 'Knight', 'Phillop': 'Knight', 'Jane': 'Knight', 'Morrah': 'Knight',
        'Sonia': 'Knight', 'Demia': 'Knight', 'Aselica': 'Knight',
        // Assassins
        'Roi': 'Assassin', 'Epis': 'Assassin', 'Tanya': 'Assassin', 'Fluss': 'Assassin',
        'Ezekiel': 'Assassin', 'Mirianne': 'Assassin',
        // Archers
        'Luna': 'Archer', 'Yanne': 'Archer', 'Selene': 'Archer', 'Reina': 'Archer',
        // Mechanics
        'Lakrak': 'Mechanic', 'Rodina': 'Mechanic', 'Miruru': 'Mechanic'
    };
    
    return roleMap[name] || 'Adventurer';
}

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🎮 KingsRaid Team Builder démarré sur http://localhost:${PORT}`);
    console.log(`📁 Utilisation des données locales dans public/kingsraid-data/`);
});

module.exports = app;