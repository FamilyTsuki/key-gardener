const path = require("path");
const fs = require("fs");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const xss = require("xss-clean");
const compression = require("compression");
const http = require("http");
const { Server } = require("socket.io");

const { apiLimiter } = require("./src/middlewares/rateLimiter.middleware");
const errorHandler = require("./src/middlewares/error.middleware");
const authRoutes = require("./src/routes/auth.routes");
const postsRoutes = require("./src/routes/posts.routes");
const savesRoutes = require("./src/routes/saves.routes");
const levelsRoutes = require("./src/routes/levels.routes");
const statisticsRoutes = require("./src/routes/statistics.routes");
const friendsRoutes = require("./src/routes/friends.routes");
const adminRoutes = require("./src/routes/admin.routes");
const db = require("./src/config/database");

const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === "production";
const BASE_URL = process.env.FRONTEND_URL || "https://tsuki-dev.fr";
const GAME_NAME = process.env.GAME_NAME || "Key Gardener";
const FRONTEND_DIR = IS_PROD
    ? path.join(__dirname, "../dist/public")
    : path.join(__dirname, "../frontend/public");
const SRC_DIR = IS_PROD
    ? path.join(__dirname, "../dist/src")
    : path.join(__dirname, "../frontend/src");

const corsOptions = {
    origin: (origin, callback) => {
        const isLocal = !origin || origin.includes("localhost") || origin.includes("127.0.0.1");
        const isTsuki = origin && origin.includes("tsuki-dev.fr");
        const frontendUrl = process.env.FRONTEND_URL || "";
        const isAllowedFrontend = frontendUrl && origin && origin.startsWith(frontendUrl);

        if (isLocal || isTsuki || isAllowedFrontend) {
            return callback(null, true);
        }

        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
};

const staticCacheOptions = {
    maxAge: IS_PROD ? "365d" : 0,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html") || !IS_PROD) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
    },
};

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

app.use(cors(corsOptions));
app.use(express.json({ limit: "10kb" }));
app.use(xss());
app.use(compression());

app.use("/asset/img/users", express.static(
    path.join(__dirname, "../frontend/public/asset/img/users"),
    staticCacheOptions
));
app.use(express.static(FRONTEND_DIR, { ...staticCacheOptions, index: false }));
app.use("/src", express.static(SRC_DIR, staticCacheOptions));
app.use("/node_modules", express.static(
    path.join(__dirname, "../node_modules"),
    staticCacheOptions
));

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

app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send(`User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml`);
});

const SITEMAP_ROUTES = [
    { path: "/", freq: "weekly", priority: "1.0" },
    { path: "/hub", freq: "daily", priority: "0.8" },
    { path: "/login", freq: "monthly", priority: "0.5" },
    { path: "/register", freq: "monthly", priority: "0.5" },
    { path: "/faq", freq: "monthly", priority: "0.6" },
    { path: "/donate", freq: "monthly", priority: "0.4" },
    { path: "/legal", freq: "monthly", priority: "0.3" },
];

app.get("/sitemap.xml", (req, res) => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    SITEMAP_ROUTES.forEach(({ path: routePath, freq, priority }) => {
        xml += `  <url>\n    <loc>${BASE_URL}${routePath}</loc>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
    });
    xml += `</urlset>`;

    res.type("application/xml");
    res.send(xml);
});

const PAGE_META = {
    "/hub": {
        titleSuffix: "Hub Communautaire",
        descFr: (game) => `Partagez votre progression, discutez de stratégies et interagissez avec les autres joueurs de ${game}.`,
        descEn: (game) => `Share your progress, discuss strategies and connect with other ${game} players on the community hub.`,
    },
    "/login": {
        titleSuffix: "Connexion",
        descFr: (game) => `Connectez-vous à votre compte ${game} pour sauvegarder votre progression et accéder au hub communautaire.`,
        descEn: (game) => `Log in to your ${game} account to save your progress and access the community hub.`,
    },
    "/register": {
        titleSuffix: "Inscription",
        descFr: (game) => `Créez un nouveau compte ${game} et commencez votre aventure dactylographique dès maintenant.`,
        descEn: (game) => `Create a free ${game} account and start your typing adventure right now.`,
    },
    "/faq": {
        titleSuffix: "FAQ & Astuces",
        descFr: (game) => `Apprenez à améliorer votre vitesse de frappe et maîtrisez ${game} grâce à nos conseils et astuces.`,
        descEn: (game) => `Learn how to improve your typing speed and master ${game} with our tips and tricks.`,
        schemaType: "FAQPage",
    },
    "/donate": {
        titleSuffix: "Soutenir le Projet",
        descFr: (game) => `Soutenez le développement de ${game} et aidez-nous à améliorer l'expérience de jeu pour tous.`,
        descEn: (game) => `Support the development of ${game} and help us improve the gaming experience for everyone.`,
    },
    "/legal": {
        titleSuffix: "Informations Légales",
        descFr: (game) => `Consultez les mentions légales, la politique de confidentialité et les conditions d'utilisation de ${game}.`,
        descEn: (game) => `Read the legal notices, privacy policy and terms of service for ${game}.`,
    },
};

const buildPageMeta = (routePath, gameName) => {
    const pageMeta = PAGE_META[routePath];
    const defaultDescFr = `Plongez dans un monde où votre clavier est votre seule arme. Tapez vite pour lancer des sorts et survivre aux monstres dans ce RPG de frappe immersif.`;
    const defaultDescEn = `Dive into a world where your keyboard is your only weapon. Type fast to cast spells and survive monsters in this immersive typing RPG.`;

    return {
        title: pageMeta ? `${pageMeta.titleSuffix} - ${gameName}` : gameName,
        descFr: pageMeta ? pageMeta.descFr(gameName) : defaultDescFr,
        descEn: pageMeta ? pageMeta.descEn(gameName) : defaultDescEn,
        schemaType: pageMeta?.schemaType || "VideoGame",
    };
};

const buildSeoTags = ({ title, descFr, descEn, schemaType, canonicalUrl, baseUrl, ogImage, gameName }) => `
        <!-- Primary Meta Tags -->
        <meta name="description" content="${descFr}">
        <meta name="keywords" content="jeu de frappe, typing game, dactylographie, ${gameName}, roguelite, RPG, keyboard game, clavier, action">
        <meta name="author" content="Tsuki">
        <meta name="theme-color" content="#0d1117">

        <!-- Hreflang: French & English -->
        <link rel="alternate" hreflang="fr" href="${canonicalUrl}">
        <link rel="alternate" hreflang="en" href="${canonicalUrl}">
        <link rel="alternate" hreflang="x-default" href="${baseUrl}">
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="${canonicalUrl}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${descFr}">
        <meta property="og:image" content="${ogImage}">
        <meta property="og:locale" content="fr_FR">
        <meta property="og:locale:alternate" content="en_US">

        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="${canonicalUrl}">
        <meta property="twitter:title" content="${title}">
        <meta property="twitter:description" content="${descEn}">
        <meta property="twitter:image" content="${ogImage}">

        <!-- Schema.org JSON-LD -->
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "${schemaType}",
          "name": "${title}",
          "description": "${descEn}",
          "url": "${canonicalUrl}",
          "image": "${ogImage}"
        }
        </script>
        `;

const injectHtmlPlaceholders = (html, { title, seoTags, canonicalUrl, gameName }) => {
    return html
        .replace(/<html lang="en">/, `<html lang="fr">`)
        .replace(/<title>.*<\/title>/, `<title>${title}</title>`)
        .replace("<!-- SSR Tags Placeholder -->", seoTags)
        .replace("</head>", `  <link rel="canonical" href="${canonicalUrl}" >\n</head>`)
        .replace("GOOGLE_CLIENT_ID_PLACEHOLDER", process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com")
        .replace("SUPPORT_EMAIL_PLACEHOLDER", process.env.SUPPORT_EMAIL || "support.tsuki.dev@gmail.com")
        .replaceAll("GAME_NAME_PLACEHOLDER", gameName);
};

app.get("*", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    const indexPath = path.join(FRONTEND_DIR, "index.html");

    fs.readFile(indexPath, "utf8", (err, htmlData) => {
        if (err) {
            console.error("Error reading index.html", err);
            return res.status(500).send("Error loading application");
        }

        const canonicalUrl = `${BASE_URL}${req.path === "/" ? "" : req.path}`;
        const ogImage = `${BASE_URL}/asset/img/boykisser.gif`;

        const { title, descFr, descEn, schemaType } = buildPageMeta(req.path, GAME_NAME);
        const seoTags = buildSeoTags({ title, descFr, descEn, schemaType, canonicalUrl, baseUrl: BASE_URL, ogImage, gameName: GAME_NAME });

        const finalHtml = injectHtmlPlaceholders(htmlData, { title, seoTags, canonicalUrl, gameName: GAME_NAME });
        res.send(finalHtml);
    });
});

app.use(errorHandler);

const startServer = async () => {
    try {
        await db.testConnection();
        console.log("🐘 [DB] PostgreSQL connection successful.");

        const server = http.createServer(app);
        const io = new Server(server, { cors: corsOptions });

        require("./src/sockets/socketManager")(io);

        server.listen(PORT, () => {
            console.log(`🚀 [BACKEND] Secure Server listening on port ${PORT}.`);
            console.log(`🌐 [FRONTEND] Static files served from ${IS_PROD ? "/dist" : "/frontend"} (Compression: ON).`);
            console.log("✅ [STATUS] All systems operational. No errors detected.");
        });
    } catch (error) {
        const cleanMessage = error.message
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        console.error("❌ [ERROR] Failed to start server due to database connection error:", cleanMessage);
        process.exit(1);
    }
};

startServer();

module.exports = app;
