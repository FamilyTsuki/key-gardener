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
const http = require("http");
const { Server } = require("socket.io");

const app = express();
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
                "img-src": ["'self'", "data:", "blob:", "https://lh3.googleusercontent.com"],
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
        if (origin === "https://tsuki-dev.fr" || origin.endsWith(".tsuki-dev.fr")) {
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

if (!isProd) {
    // Cache is now active even in development mode
}

app.use("/asset/img/users", express.static(path.join(__dirname, "../frontend/public/asset/img/users")));

app.use(express.static(frontendDir, { index: false }));
app.use("/src", express.static(srcDir));
app.use(
    "/node_modules",
    express.static(path.join(__dirname, "../node_modules"))
);

app.use("/api/", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/saves", savesRoutes);
app.use("/api/levels", levelsRoutes);
app.use("/api/stats", statisticsRoutes);
app.use("/api/friends", friendsRoutes);

app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "API is running securely" });
});

const fs = require('fs');

app.get("*", (req, res) => {
    const indexPath = path.join(frontendDir, "index.html");
    fs.readFile(indexPath, 'utf8', (err, htmlData) => {
        if (err) {
            console.error("Error reading index.html", err);
            return res.status(500).send("Error loading application");
        }
        
        const gameName = process.env.GAME_NAME || "Keyboard Survivor";
        let title = gameName;
        let desc = `Your keyboard is your only weapon. Plunge into the abyss, type fast to cast spells, and survive hordes of relentless monsters in this adrenaline-fueled typing RPG.`;
        
        if (req.path === "/hub") {
            title = `Community Hub - ${gameName}`;
            desc = `Share your progress, discuss strategies, and interact with other ${gameName} players.`;
        } else if (req.path === "/login") {
            title = `Login - ${gameName}`;
            desc = `Log in to your ${gameName} account to save your progress and access the community hub.`;
        } else if (req.path === "/register") {
            title = `Register - ${gameName}`;
            desc = `Create a new ${gameName} account to start your typing adventure.`;
        }
        htmlData = htmlData.replace(/<title>.*<\/title>/, `<title>${title}</title>`);
        htmlData = htmlData.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${desc}"`);
        htmlData = htmlData.replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${title}"`);
        htmlData = htmlData.replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${desc}"`);
        htmlData = htmlData.replace(/<meta property="twitter:title" content="[^"]*"/, `<meta property="twitter:title" content="${title}"`);
        htmlData = htmlData.replace(/<meta property="twitter:description" content="[^"]*"/, `<meta property="twitter:description" content="${desc}"`);
        
        const canonicalUrl = `https://keyboardsurvivor.com${req.path === '/' ? '' : req.path}`;
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
