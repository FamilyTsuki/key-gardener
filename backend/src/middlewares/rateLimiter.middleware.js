const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 100, 
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 10, 
    message: 'Too many authentication attempts, please try again after an hour'
});

module.exports = { apiLimiter, authLimiter };
