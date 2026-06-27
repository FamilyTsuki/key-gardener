# ⌨️ Cahier des Charges : Projet "[GAME_NAME]"

## 1. Présentation du Projet
**[GAME_NAME]** est un projet hybride innovant combinant un site web interactif et un jeu d'action/survie en 3D. L'objectif est de **ludifier l'apprentissage de la frappe au clavier** via des mécaniques de jeu intenses où le périphérique d'entrée devient le terrain de jeu.

---

## 2. Le Jeu (Core Gameplay & Lore)

### 2.1. Synopsis et Introduction (Rupture du 4ème mur)
Le jeu débute sous une apparence classique (style Minecraft/Undertale).
> **L'Élément Déclencheur :** Un "bug" survient, l'image freeze, une faille visuelle apparaît. Au clic, le joueur est "aspiré" virtuellement dans sa machine.
> **L'Objectif :** Traquer le Virus responsable de la corruption en descendant dans les méandres du système.

### 2.2. La Boucle de Gameplay (Les 3 Phases)

#### 🛡️ Phase 1 : L'Exploration (Le Couloir)
* **Concept :** Transition entre les niveaux en style *Low-Poly*.
* **Environnements :** Grotte, Manoir, Repaire, Vieux château.
* **Mécanique :** Le sol est composé de dalles hexagonales (touches).
* **Règles :** Taper la touche correspondant à la dalle blanche pour avancer. Erreur = Dégâts ou recul.
* **Pression :** Une "corruption" (glitch destructeur) poursuit le joueur.

#### 🔓 Phase 2 : Les Obstacles (Le Piratage)
* **Concept :** *Typing Game* pur face à un blocage.
* **Interface :** Vue adaptée montrant le personnage et le clavier.
* **Variantes :**
    * **Le Gouffre :** Taper des chaînes de mots pour construire un pont.
    * **L'Éboulement :** Détruire des pierres (mots) avant qu'elles ne tombent.

#### ⚔️ Phase 3 : Le Combat (Arène de Survie / Boss)
* **L'Arène :** Reproduction fidèle de la grille du clavier physique du joueur.
* **Déplacement :** Appuyer sur une touche téléporte le héros (effet *Squash & Stretch*).
* **Ennemis :** Bugs traqueurs et Boss avec barres de vie.
* **Système de Sorts (Spellcasting) :**
    * `FIRE` : Projectile offensif.
    * `HEAL` : Restaure 15 HP.
    * `CIRCLE` : Zone de flammes circulaire.

---

## 3. Architecture du Site Web

### 3.1. Page d'Accueil (Landing Page)
* **Hero Section :** Pitch accrocheur + Bouton "Lancer la démo".
* **Header Dynamique :** Navigation fluide (Connexion, Inscription, Sauvegardes).
* **Storytelling :** Scroll immersif avec effet de "descente" en 3D.
* **Footer :** Crédits et remerciements.

### 3.2. Espace Utilisateur
* **Gestion des Sauvegardes :** 3 slots disponibles avec menu contextuel (Lancer, Exporter, Supprimer, Renommer).
* **Profil :** Avatar, Statistiques (temps de jeu, achievements), Sécurité.

### 3.3. Hub Communautaire (Social)
* **Feed :** Partage de captures et commentaires (style Reddit).
* **Ranking :** Système d'étoiles (Upvotes).
* **Modération :** Signalement et mise en quarantaine automatique après 3 reports.

---

## 4. Stack Technique & Architecture

| Composant | Technologie | Rôle / Justification |
| :--- | :--- | :--- |
| **Moteur 3D** | `Three.js` | Rendu, lumières et modélisation du clavier (Front-end). |
| **Logique Jeu** | `JavaScript (OOP)` | Architecture Objet pour la scalabilité des entités (Player, Enemy). |
| **Algorithmique** | `A* (A-Star)` | Pathfinding pour l'IA des ennemis. |
| **Site Web** | `HTML / CSS / JS` | Structure et interactivité (Vanilla ou Framework léger). |
| **Serveur** | `Node.js` | Environnement d'exécution Backend. |
| **Sécurité** | `JWT` & `Bcrypt` | Sessions stateless et hashage des mots de passe. |
| **Base de Données** | `MongoDB / PostgreSQL` | Stockage profils, posts et sauvegardes. |
| **Audio** | `Howler.js` | Gestion de l'environnement sonore. |

