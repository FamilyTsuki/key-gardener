export const fr = {
    // Router / Auth
    auth: {
        loginRequired: "Vous devez être connecté pour accéder à cette page.",
        loginFailed: "Échec de la connexion",
        logoutFailed: "Échec de la déconnexion",
        rateLimit: "Limite de requêtes dépassée. Veuillez patienter un instant."
    },
    
    // Navbar
    nav: {
        login: "Connexion",
        save: "Sauvegarde",
        home: "Accueil",
        communityHub: "Communauté",
        account: "Compte"
    },
    
    // HomeView
    home: {
        title: "Keyboard Survivor",
        description: "Gamifiez vos compétences de frappe. Explorez et combattez en utilisant votre clavier comme contrôleur principal.",
        startGame: "Commencer à jouer",
        whyTitle: "pourquoi",
        whyDesc: "Découvrez une expérience de jeu unique combinant défis de frappe et aventures excitantes.",
        contactUs: "Contactez-nous : ",
        followUs: "Suivez-nous sur les réseaux sociaux : ",
        specialThank: "Remerciements spéciaux",
        thankSupporters: "à tous nos supporters et joueurs qui rendent Keyboard Survivor possible !",
        rights: "\u00A9 2024 Keyboard Survivor. Tous droits réservés."
    },
    
    // HubView
    hub: {
        title: "Centre Communautaire",
        welcome: "Bienvenue dans la communauté ! Partagez votre progression et interagissez avec les autres joueurs.",
        loginPrompt: "Vous devez être connecté pour partager votre progression.",
        login: "Connexion",
        addPostTitle: "Ajouter un post",
        shareProgress: "Partagez votre progression...",
        addImageVideo: "+ Ajouter Image/Vidéo",
        postBtn: "Publier",
        loadingPosts: "Chargement des posts...",
        noPostsYet: "Aucun post pour le moment. Soyez le premier !",
        errorLoading: "Erreur lors du chargement des messages communautaires.",
        loginToVote: "Vous devez être connecté pour voter !",
        voteFailed: "Échec du vote.",
        edit: "Modifier",
        delete: "Supprimer",
        save: "Enregistrer",
        cancel: "Annuler",
        deleteConfirm: "Êtes-vous sûr de vouloir supprimer ce post ? Cette action est irréversible.",
        editExpired: "Vous ne pouvez modifier un post que dans les 5 minutes suivant sa création.",
        comments: "Commentaires",
        addComment: "Ajouter un commentaire...",
        postComment: "Publier",
        noComments: "Aucun commentaire pour le moment."
    },
    
    // LoginView
    login: {
        title: "Connexion",
        emailPlaceholder: "Email",
        passwordPlaceholder: "Mot de passe",
        forgotPasswordLink: "Mot de passe oublié ?",
        loginBtn: "Se connecter",
        noAccount: "Vous n'avez pas de compte ? ",
        signUpLink: "S'inscrire",
        loginSuccess: "Connexion réussie !",
        resetTitle: "Réinitialiser le mot de passe",
        resetInfo: "Entrez votre email pour recevoir un code à 6 chiffres.",
        sendResetCodeBtn: "Envoyer le code",
        resetCodeSent: "Si le compte existe, un code de réinitialisation a été envoyé.",
        requestFailed: "Échec de la requête",
        backToLogin: "Retour à la connexion",
        enterCodeTitle: "Entrer le code",
        codeSentTo: "Code envoyé à ",
        codePlaceholder: "Code à 6 chiffres",
        newPasswordPlaceholder: "Nouveau mot de passe",
        updatePasswordBtn: "Mettre à jour le mot de passe",
        resetSuccess: "Mot de passe réinitialisé avec succès ! Veuillez vous connecter.",
        resetFailed: "Échec de la réinitialisation"
    },
    
    // RegisterView
    register: {
        title: "Inscription",
        usernamePlaceholder: "Nom d'utilisateur",
        emailPlaceholder: "Email",
        passwordPlaceholder: "Mot de passe",
        confirmPasswordPlaceholder: "Confirmer le mot de passe",
        registerBtn: "S'inscrire",
        alreadyHaveAccount: "Vous avez déjà un compte ? ",
        loginLink: "Se connecter",
        passwordsDoNotMatch: "Les mots de passe ne correspondent pas",
        passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères",
        registerSuccess: "Inscription réussie !",
        registerFailed: "Échec de l'inscription"
    },
    
    // SaveView
    save: {
        title: "Emplacements de sauvegarde",
        loadingSaves: "Chargement des sauvegardes...",
        loginRequired: "Veuillez vous connecter pour gérer vos sauvegardes.",
        loginBtn: "Connexion",
        slotPrefix: "Emplacement ",
        emptySlot: "Emplacement vide",
        lastPlayed: "Dernière partie : ",
        playBtn: "Jouer",
        newGameBtn: "Nouvelle Partie",
        renameBtn: "Renommer",
        exportBtn: "Exporter",
        deleteBtn: "Supprimer",
        renameTitle: "Renommer la sauvegarde",
        cancelBtn: "Annuler",
        deleteConfirmTitle: "Supprimer la sauvegarde ?",
        deleteConfirmText: "Êtes-vous sûr de vouloir supprimer l'emplacement {slot} ? Cette action est irréversible."
    },
    
    // GameView
    game: {
        saveQuitBtn: "Sauvegarder & Quitter",
        saveSuccess: "Partie sauvegardée avec succès !",
        saveFailed: "Échec de la sauvegarde sur le serveur.",
        savedLocally: "Sauvegardé localement (hors ligne)."
    },
    
    // AccountView
    account: {
        title: "Profil",
        logout: "Se déconnecter",
        changePasswordTitle: "Changer le mot de passe",
        currentPasswordPlaceholder: "Mot de passe actuel",
        newPasswordPlaceholder: "Nouveau mot de passe",
        updatePasswordBtn: "Mettre à jour",
        passwordFillBoth: "Veuillez remplir les deux champs",
        passwordSuccess: "Mot de passe modifié avec succès",
        passwordFailed: "Échec de la modification du mot de passe",
        uploadFailed: "Échec du téléchargement",
        usernameSuccess: "Nom d'utilisateur mis à jour",
        usernameFailed: "Échec de la mise à jour du nom d'utilisateur",
        emailSuccess: "Email mis à jour",
        emailFailed: "Échec de la mise à jour de l'email",
        languageTitle: "Langue",
        english: "English",
        french: "Français"
    },
    
    // Game Engine (IntroPhase etc.)
    engine: {
        introDialogue1: "...",
        introDialogue2: "Il y a quelqu'un ?"
    }
};
