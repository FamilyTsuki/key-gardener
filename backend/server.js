const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const xss = require("xss-clean");
const compression = require("compression");
const { apiLimiter } = require("./src/middlewares/rateLimiter.middleware");
const errorHandler = require("./src/middlewares/error.middleware");
const authRoutes = require("./src/routes/auth.routes");
const postsRoutes = require("./src/routes/posts.routes");
const savesRoutes = require("./src/routes/saves.routes");
const levelsRoutes = require("./src/routes/levels.routes");
const statisticsRoutes = require("./src/routes/statistics.routes");
const friendsRoutes = require("./src/routes/friends.routes");
const adminRoutes = require("./src/routes/admin.routes");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.set("trust proxy", 1);
const port = process.env.PORT || 5000;

app.use(
    helmet({
        crossOriginOpenerPolicy: false,
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                "upgrade-insecure-requests": null,
                "script-src": ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
                "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
                "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
                "connect-src": ["'self'", "blob:", "https://accounts.google.com"],
                "worker-src": ["'self'", "blob:"],
                "child-src": ["'self'", "blob:", "https://accounts.google.com"],
                "frame-src": ["'self'", "https://accounts.google.com"],
                "img-src": ["'self'", "data:", "blob:", "https://lh3.googleusercontent.com", "https://media.tenor.com"],
                "media-src": ["'self'", "blob:"],
            },
        },
    })
);
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1")) {
            return callback(null, true);
        }
        if (origin.includes("tsuki-dev.fr")) {
            return callback(null, true);
        }

        const frontendUrl = process.env.FRONTEND_URL || "";
        if (frontendUrl && origin.startsWith(frontendUrl)) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "10kb" }));
app.use(xss());
app.use(compression());

const isProd = process.env.NODE_ENV === "production";
const frontendDir = isProd ? path.join(__dirname, "../dist/public") : path.join(__dirname, "../frontend/public");
const srcDir = isProd ? path.join(__dirname, "../dist/src") : path.join(__dirname, "../frontend/src");

const staticCacheOptions = {
    maxAge: isProd ? "365d" : 0,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html") || !isProd) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
    }
};

app.use("/asset/img/users", express.static(path.join(__dirname, "../frontend/public/asset/img/users"), staticCacheOptions));

app.use(express.static(frontendDir, { ...staticCacheOptions, index: false }));
app.use("/src", express.static(srcDir, staticCacheOptions));
app.use(
    "/node_modules",
    express.static(path.join(__dirname, "../node_modules"), staticCacheOptions)
);

app.use("/api/", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/saves", savesRoutes);
app.use("/api/levels", levelsRoutes);
app.use("/api/stats", statisticsRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "API is running securely" });
});

const fs = require('fs');

app.get("/robots.txt", (req, res) => {
    const baseUrl = process.env.FRONTEND_URL || "https://tsuki-dev.fr";
    res.type("text/plain");
    res.send(`User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml`);
});

app.get("/sitemap.xml", (req, res) => {
    const baseUrl = process.env.FRONTEND_URL || "https://tsuki-dev.fr";
    const routes = [
        { path: "/", freq: "weekly", priority: "1.0" },
        { path: "/hub", freq: "daily", priority: "0.8" },
        { path: "/login", freq: "monthly", priority: "0.5" },
        { path: "/register", freq: "monthly", priority: "0.5" },
        { path: "/faq", freq: "monthly", priority: "0.6" },
        { path: "/donate", freq: "monthly", priority: "0.4" },
        { path: "/legal", freq: "monthly", priority: "0.3" }
    ];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    routes.forEach(r => {
        xml += `  <url>\n    <loc>${baseUrl}${r.path}</loc>\n    <changefreq>${r.freq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>\n`;
    });
    xml += `</urlset>`;
    
    res.type("application/xml");
    res.send(xml);
});

app.get("*", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const indexPath = path.join(frontendDir, "index.html");
    fs.readFile(indexPath, 'utf8', (err, htmlData) => {
        if (err) {
            console.error("Error reading index.html", err);
            return res.status(500).send("Error loading application");
        }
        
        const gameName = process.env.GAME_NAME || "Keyboard Survivor";
        const baseUrl = process.env.FRONTEND_URL || "https://tsuki-dev.fr";
        const canonicalUrl = `${baseUrl}${req.path === '/' ? '' : req.path}`;
        
        let title = gameName;
        let desc = `Plongez dans un monde où votre clavier est votre seule arme. Tapez vite pour lancer des sorts et survivre aux monstres dans ce RPG dactylographique immersif.`;
        let ogImage = "/asset/img/home_battle.webp";
        let schemaType = "VideoGame";
        
        if (req.path === "/hub") {
            title = `Hub Communautaire - ${gameName}`;
            desc = `Partagez votre progression, discutez de stratégies et interagissez avec les autres joueurs de ${gameName}.`;
        } else if (req.path === "/login") {
            title = `Connexion - ${gameName}`;
            desc = `Connectez-vous à votre compte ${gameName} pour sauvegarder votre progression et accéder au hub.`;
        } else if (req.path === "/register") {
            title = `Inscription - ${gameName}`;
            desc = `Créez un nouveau compte ${gameName} pour commencer votre aventure dactylographique.`;
        } else if (req.path === "/faq") {
            title = `FAQ & Astuces - ${gameName}`;
            desc = `Apprenez à améliorer votre vitesse de frappe et maîtrisez ${gameName} grâce à nos astuces.`;
            schemaType = "FAQPage";
        } else if (req.path === "/donate") {
            title = `Soutenir le Projet - ${gameName}`;
            desc = `Soutenez le développement de ${gameName} pour nous aider à améliorer l'infrastructure multijoueur.`;
        } else if (req.path === "/legal") {
            title = `Informations Légales - ${gameName}`;
            desc = `Consultez les informations légales, la politique de confidentialité et les conditions d'utilisation de ${gameName}.`;
        }

        const seoTags = `
        <!-- Primary Meta Tags -->
        <meta name="description" content="${desc}">
        <meta name="keywords" content="jeu de frappe, dactylographie, ${gameName}, roguelite, RPG, apprendre à taper, clavier, action">
        <meta name="author" content="Alban Elie">
        <meta name="theme-color" content="#0d1117">
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="${canonicalUrl}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${desc}">
        <meta property="og:image" content="${baseUrl}${ogImage}">

        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="${canonicalUrl}">
        <meta property="twitter:title" content="${title}">
        <meta property="twitter:description" content="${desc}">
        <meta property="twitter:image" content="${baseUrl}${ogImage}">

        <!-- Schema.org JSON-LD -->
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "${schemaType}",
          "name": "${title}",
          "description": "${desc}",
          "url": "${canonicalUrl}",
          "image": "${baseUrl}${ogImage}"
        }
        </script>
        `;

        htmlData = htmlData.replace(/<html lang="en">/, `<html lang="fr">`);
        htmlData = htmlData.replace(/<title>.*<\/title>/, `<title>${title}</title>`);
        htmlData = htmlData.replace('<!-- SSR Tags Placeholder -->', seoTags);
        htmlData = htmlData.replace('</head>', `  <link rel="canonical" href="${canonicalUrl}" >\n</head>`);
        
        htmlData = htmlData.replace("GOOGLE_CLIENT_ID_PLACEHOLDER", process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com");
        htmlData = htmlData.replace("SUPPORT_EMAIL_PLACEHOLDER", process.env.SUPPORT_EMAIL || "support.tsuki.dev@gmail.com");
        htmlData = htmlData.replaceAll("GAME_NAME_PLACEHOLDER", gameName);
        
        res.send(htmlData);
    });
});

app.use(errorHandler);

const db = require("./src/config/database");

const startServer = async () => {
    try {
        await db.testConnection();
        console.log("🐘 [DB] PostgreSQL connection successful.");

        const server = http.createServer(app);
        const io = new Server(server, {
            cors: corsOptions
        });

        require('./src/sockets/socketManager')(io);

        server.listen(port, () => {
            console.log(
                `🚀 [BACKEND] Secure Server listening on port ${port}.`
            );
            console.log(
                `🌐 [FRONTEND] Static files served from ${isProd ? '/dist' : '/frontend'} (Compression: ON).`
            );
            console.log(
                "✅ [STATUS] All systems operational. No errors detected."
            );
        });
    } catch (error) {
        const cleanMessage = error.message
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        console.error(
            "❌ [ERROR] Failed to start server due to database connection error:",
            cleanMessage
        );
        process.exit(1);
    }
};

startServer();

module.exports = app;
