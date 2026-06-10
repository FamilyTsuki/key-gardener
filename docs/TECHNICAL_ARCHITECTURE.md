# 🏗️ Architecture Technique : Keyboard Survivor

Bienvenue dans la documentation technique du projet. Ce fichier s'adresse aux développeurs et détaille l'ensemble de la stack, des choix architecturaux et de l'organisation du code.

L'application repose sur une **architecture Client-Serveur découplée**, garantissant flexibilité et performances maximales. Le choix principal a été de ne pas utiliser de gros frameworks front-end (comme React) pour garder un contrôle absolu sur la boucle de rendu 3D.

---

## 💻 1. Le Backend (Node.js & Express)
Le backend sert d'API REST pour le site et le jeu. Il gère l'authentification, les sauvegardes et la communauté (Hub). Il respecte scrupuleusement le motif **MVC (Modèle-Vue-Contrôleur)**.

### Structure des dossiers (`/backend/src/`)
- **`controllers/`** : Logique métier (ex: vérification des identifiants, création d'un post).
- **`models/`** : Couche d'accès à la base de données PostgreSQL (utilisation directe du module `pg` pour des requêtes optimisées).
- **`routes/`** : Fichiers d'aiguillage des requêtes HTTP vers les contrôleurs.
- **`middlewares/`** : Fonctions d'interception critiques pour la sécurité (`auth.middleware.js` pour valider les tokens, limiteurs de requêtes).
- **`utils/`** : Outils transverses (ex: `mailer.js` pour l'envoi d'emails SMTP de récupération de mot de passe).

### Sécurité & Optimisations 🔒
- **Authentification Stateless** : Gérée via **JSON Web Tokens (JWT)**.
- **Mots de passe** : Hachés avec **bcrypt**. Les tokens de récupération de compte sont des clés hexadécimales de 64 caractères très sécurisées.
- **Boucliers (Middlewares)** : 
  - `helmet` (Headers HTTP sécurisés)
  - `xss-clean` (Protection contre les injections XSS)
  - `express-rate-limit` (Prévention contre le spam et les attaques DDoS)
  - `cors` (Contrôle d'accès)
  - `compression` (Compression Gzip des réponses pour réduire la bande passante).

---

## 🎨 2. Le Frontend Web (Vanilla JavaScript)
La structure web (Navigation, Hub, Connexion) est construite en pur JavaScript Orienté Objet (Vanilla JS).

### Le Routeur Maison (`core/Router.js`)
L'application fonctionne comme une **Single Page Application (SPA)** grâce à un routeur développé sur-mesure utilisant l'API `History` (pushState).
- **Chargement dynamique** : Le routeur injecte automatiquement les fichiers CSS spécifiques à la vue chargée.
- **Anti-clignotement** : Un système de temporisation (debounce de 250ms) empêche l'écran de chargement de clignoter inutilement sur les requêtes très rapides.

### Architecture UI
- **DOMBuilder (`core/utils/DOMBuilder.js`)** : Fonction utilitaire `el()` permettant de construire l'arbre DOM via du JavaScript de façon lisible et imbriquée (façon React `createElement`).
- **Vues (`website/views/`)** : Chaque page (Home, Hub, Login) est une classe héritant de `AbstractView`.
- **Services (`core/services/`)** : Classes Singleton abstraient les appels API (ex: `AuthService`, `PostsService`). Un intercepteur global sur `window.fetch` (dans `main.js`) détecte automatiquement toute requête pour afficher un mini-loader en bas à droite de l'écran.

### CSS & Design
- **Vanilla CSS** : Aucun framework externe (pas de Tailwind/Bootstrap).
- **Design System** : Utilisation massive des variables CSS (Custom Properties) dans `global.css` pour gérer les couleurs, les ombres néon et l'effet "Glassmorphism" .

---

## 🕹️ 3. Le Moteur de Jeu (`frontend/src/game/`)
C'est le cœur interactif de Keyboard Survivor. Totalement indépendant des vues web, il est structuré pour gérer les entités 3D et les frappes clavier.

### L'Écosystème 3D
- **Three.js** : Librairie WebGL utilisée pour le rendu du monde (Lumières, Modèles GLTF, Animations procédurales).
- **GSAP (GreenSock)** : Utilisé pour fluidifier les animations complexes et les effets de scroll hors de la boucle de jeu principale.

### La Structure du Code de Jeu
- **`engine/` (GameEngine)** : Gère l'initialisation de Three.js et la boucle de rendu infinie via `requestAnimationFrame` à 60 FPS.
- **`phases/`** : Séparation stricte des états de jeu via des classes dédiées :
  - `ExplorePhase` (Courir dans le couloir hexagonal).
  - `EventPhase` (Typing game pour franchir les obstacles ou événements aléatoires).
  - `ArenaPhase` (Combat de boss et survie sur la grille du clavier physique).
- **`managers/` (ex: KeyboardManager)** : Module vital qui écoute passivement les frappes clavier, valide les mots saisis et déclenche les Events ou les sorts (`FIRE`, `HEAL`).
- **`events/` & `models/`** : Contiennent la logique des entités (le Joueur, les Bugs, les Mots à taper comme `BridgeWordEvent.js`).

---

## 📖 4. Standards de Développement ("Clean Code")
- **Naming & Langue** : L'intégralité du code (noms de fichiers, variables, classes, commentaires techniques) est rédigée en **Anglais**, pour respecter les standards professionnels.
- **Lisibilité** : Le code doit être auto-porteur. La logique lourde est fragmentée en petites fonctions aux noms explicites plutôt que d'être noyée sous des commentaires.
- **Asynchronisme** : Utilisation généralisée de `async/await` pour éviter les callbacks hell, notamment lors du chargement des textures Three.js et des requêtes réseau.
