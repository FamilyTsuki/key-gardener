const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const xss = require("xss-clean");
const { apiLimiter } = require("./src/middlewares/rateLimiter.middleware");
const errorHandler = require("./src/middlewares/error.middleware");
const authRoutes = require("./src/routes/auth.routes");
const postsRoutes = require("./src/routes/posts.routes");
const savesRoutes = require("./src/routes/saves.routes");
const levelsRoutes = require("./src/routes/levels.routes");
const statisticsRoutes = require("./src/routes/statistics.routes");

const app = express();
const port = process.env.PORT || 5000;

app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                "script-src": ["'self'", "'unsafe-inline'"],
                "connect-src": ["'self'", "blob:"],
                "worker-src": ["'self'", "blob:"],
                "child-src": ["'self'", "blob:"],
                "img-src": ["'self'", "data:", "blob:"],
                "media-src": ["'self'", "blob:"],
            },
        },
    })
);
app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(xss());

app.use(express.static(path.join(__dirname, "../frontend/public")));
app.use("/src", express.static(path.join(__dirname, "../frontend/src")));
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

app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "API is running securely" });
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/public/index.html"));
});

app.use(errorHandler);

const db = require("./src/config/database");

const startServer = async () => {
    try {
        await db.testConnection();
        console.log("🐘 [DB] PostgreSQL connection successful.");

        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE");
        await db.query(`
            CREATE TABLE IF NOT EXISTS levels_config (
                level_number INTEGER PRIMARY KEY,
                phase_type VARCHAR(50) NOT NULL,
                options JSONB NOT NULL
            )
        `);
        
        await db.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) DEFAULT NULL");
        await db.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0");
        await db.query(`
            CREATE TABLE IF NOT EXISTS votes (
                id SERIAL PRIMARY KEY,
                post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                vote_type INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(post_id, user_id)
            )
        `);

        app.listen(port, () => {
            console.log(
                `🚀 [BACKEND] Secure Server listening on port ${port}.`
            );
            console.log(
                `🌐 [FRONTEND] Static files served from /frontend/public and /frontend/src.`
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
