const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendResetCodeEmail } = require("../utils/mailer");
const { validatePassword } = require("../utils/validation");

/**
 * Generates the token.
 * @param {any} userId - The userId.
 */
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

/**
 * Set the token cookie.
 * @param {Object} res - The Express response object.
 * @param {any} token - The token.
 */
const setTokenCookie = (res, token) => {
    res.cookie("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

exports.register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        if (username && username.length > 50) return res.status(400).json({ success: false, message: "Username too long (max 50 chars)" });
        if (email && email.length > 100) return res.status(400).json({ success: false, message: "Email too long (max 100 chars)" });
        if (password && password.length > 100) return res.status(400).json({ success: false, message: "Password too long (max 100 chars)" });

        if (!username || !email || !password) {
            return res
                .status(400)
                .json({ success: false, message: "All fields are required" });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long, contain at least one number and one special character",
            });
        }

        const existingUserByEmail = await User.findByEmail(email);
        const existingUserByUsername = await User.findByUsername(username);

        if (existingUserByEmail) {
            return res
                .status(409)
                .json({ success: false, message: "Email already registered" });
        }

        if (existingUserByUsername) {
            return res
                .status(409)
                .json({ success: false, message: "Username already taken" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create(username, email, hashedPassword);

        const token = generateToken(user.id);
        setTokenCookie(res, token);

        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                personalPicture: "default.webp",
                is_admin: false,
                settings: user.settings || {}
            },
        });
    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const user = await User.findByEmail(email);

        if (!user) {
            return res
                .status(401)
                .json({ success: false, message: "Invalid email or password" });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password_hash
        );
        if (!isPasswordValid) {
            return res
                .status(401)
                .json({ success: false, message: "Invalid email or password" });
        }

        const token = generateToken(user.id);
        setTokenCookie(res, token);

        res.json({
            success: true,
            user: { id: user.id, username: user.username, email: user.email, personalPicture: user.personal_picture, is_admin: user.is_admin, settings: user.settings || {} },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Handles authentication via Google OAuth2 credential validation.
 * @param {any} req - The req.
 * @param {any} res - The res.
 * @param {any} next - The next.
 * @returns {Promise<void>}
 */
exports.loginWithGoogle = async (req, res, next) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ success: false, message: "Google credential token is required" });
        }

        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (!response.ok) {
            return res.status(401).json({ success: false, message: "Invalid Google credential" });
        }

        const payload = await response.json();

        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (clientId && payload.aud !== clientId) {
            return res.status(401).json({ success: false, message: "Google token audience mismatch" });
        }

        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;
        const picture = payload.picture || "default.webp";

        let user = await User.findByGoogleId(googleId);

        if (!user) {
            const existingUserByEmail = await User.findByEmail(email);
            if (existingUserByEmail) {
                user = await User.linkGoogleAccount(existingUserByEmail.id, googleId, picture);
            } else {
                let baseUsername = (name || email.split("@")[0]).replace(/[^a-zA-Z0-9]/g, "");
                let username = baseUsername.substring(0, 30);
                let uniqueUsernameFound = false;
                let suffix = 0;

                while (!uniqueUsernameFound) {
                    const candidate = suffix === 0 ? username : `${username}${suffix}`;
                    const conflict = await User.findByUsername(candidate);
                    if (!conflict) {
                        username = candidate;
                        uniqueUsernameFound = true;
                    } else {
                        suffix++;
                    }
                }

                user = await User.createGoogleUser(username, email, googleId, picture);
            }
        }

        const token = generateToken(user.id);
        setTokenCookie(res, token);

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                personalPicture: user.personal_picture || "default.webp",
                is_admin: user.is_admin || false,
                settings: user.settings || {}
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.me = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            return res.json({ success: true, user: null });
        }
        res.json({
            success: true,
            user: { id: user.id, username: user.username, email: user.email, personalPicture: user.personal_picture, is_admin: user.is_admin, settings: user.settings || {} },
        });
    } catch (err) {
        next(err);
    }
};

exports.logout = (req, res) => {
    res.clearCookie("jwt");
    res.json({ success: true, message: "Logged out successfully" });
};

exports.uploadAvatar = async (req, res, next) => {
    try {
        const user = req.user;
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }

        const sharp = require("sharp");
        const path = require("path");
        const fs = require("fs");

        const webpFilename = req.file.filename.substring(0, req.file.filename.lastIndexOf('.')) + '.webp';
        const webpPath = path.join(path.dirname(req.file.path), webpFilename);

        await sharp(req.file.path)
            .resize(256, 256, { fit: 'cover', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(webpPath);

        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        await User.updateAvatar(user.id, webpFilename);

        res.json({
            success: true,
            personalPicture: webpFilename,
            message: "Avatar updated successfully"
        });
    } catch (err) {
        next(err);
    }
};

exports.updateUsername = async (req, res, next) => {
    try {
        const user = req.user;
        const { newUsername } = req.body;

        if (!newUsername) {
            return res.status(400).json({ success: false, message: "New username is required" });
        }

        const existingUserByUsername = await User.findByUsername(newUsername);
        if (existingUserByUsername) {
            return res.status(409).json({ success: false, message: "Username already taken" });
        }

        await User.update(user.id, { username: newUsername });
        res.json({ success: true, message: "Username updated successfully" });
    } catch (err) {
        next(err);
    }
};

exports.updateEmail = async (req, res, next) => {
    try {
        const user = req.user;
        const { newEmail } = req.body;

        if (!newEmail) {
            return res.status(400).json({ success: false, message: "New email is required" });
        }

        const existingUserByEmail = await User.findByEmail(newEmail);
        if (existingUserByEmail) {
            return res.status(409).json({ success: false, message: "Email already registered" });
        }

        await User.update(user.id, { email: newEmail });
        res.json({ success: true, message: "Email updated successfully" });
    } catch (err) {
        next(err);
    }
};

exports.requestPasswordReset = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.json({ success: true, message: "Si le compte existe, un lien a été envoyé." });
        }

        const code = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

        await User.saveResetCode(email, code, expiresAt);
        await sendResetCodeEmail(email, code);

        res.json({ success: true, message: "Si le compte existe, un lien a été envoyé." });
    } catch (err) {
        next(err);
    }
};

exports.resetPassword = async (req, res, next) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            return res.status(400).json({ success: false, message: "Email, code, and new password are required" });
        }

        if (!validatePassword(newPassword)) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters long, contain at least one number and one special character" });
        }

        const user = await User.findByResetCode(email, code);
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset code" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updatePassword(user.id, hashedPassword);

        res.json({ success: true, message: "Password has been successfully reset" });
    } catch (err) {
        next(err);
    }
};

exports.changePassword = async (req, res, next) => {
    try {
        const user = req.user;
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Current and new passwords are required" });
        }

        if (!validatePassword(newPassword)) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters long, contain at least one number and one special character" });
        }

        const dbUser = await User.findById(user.id);
        const isPasswordValid = await bcrypt.compare(currentPassword, dbUser.password_hash);
        
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Incorrect current password" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updatePassword(user.id, hashedPassword);

        res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
        next(err);
    }
};
exports.updateSettings = async (req, res, next) => {
    try {
        const user = req.user;
        const newSettings = req.body;
        
        const dbUser = await User.findById(user.id);
        const currentSettings = dbUser.settings || {};
        
        const mergedSettings = { ...currentSettings, ...newSettings };
        
        const updated = await User.updateSettings(user.id, mergedSettings);
        
        res.json({ success: true, settings: updated.settings, message: "Settings updated successfully" });
    } catch (err) {
        next(err);
    }
};

/**
 * Delete the user account (Right to be Forgotten).
 * @param {any} req - The req.
 * @param {any} res - The res.
 * @param {any} next - The next.
 */
exports.deleteAccount = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const db = require('../config/database');

        const { rowCount } = await db.query("DELETE FROM users WHERE id = $1", [userId]);

        if (rowCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.clearCookie("auth_token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });

        res.json({ message: "Account successfully deleted" });
    } catch (error) {
        next(error);
    }
};
