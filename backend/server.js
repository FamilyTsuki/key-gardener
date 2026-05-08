const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean');
const { apiLimiter } = require('./src/middlewares/rateLimiter.middleware');
const errorHandler = require('./src/middlewares/error.middleware');
const authRoutes = require('./src/routes/auth.routes');

const app = express();
const port = process.env.PORT || 5000;

app.use(helmet()); 
app.use(cors()); 
app.use(express.json({ limit: '10kb' })); 
app.use(xss()); 

app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/src', express.static(path.join(__dirname, '../frontend/src')));

app.use('/api/', apiLimiter);
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'API is running securely' });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.use(errorHandler);

const db = require('./src/config/database');

const startServer = async () => {
    try {
        await db.testConnection();
        console.log('🐘 [DB] PostgreSQL connection successful.');

        app.listen(port, () => {
            console.log(`🚀 [BACKEND] Secure Server listening on port ${port}.`);
            console.log(`🌐 [FRONTEND] Static files served from /frontend/public and /frontend/src.`);
            console.log('✅ [STATUS] All systems operational. No errors detected.');
        });
    } catch (error) {
        const cleanMessage = error.message.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        console.error('❌ [ERROR] Failed to start server due to database connection error:', cleanMessage);
        process.exit(1);
    }
};

startServer();

module.exports = app;
