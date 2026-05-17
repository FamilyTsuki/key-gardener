const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendResetCodeEmail } = require("../utils/mailer");


exports.register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res
                .status(400)
                .json({ success: false, message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters",
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

        res.status(201).json({ success: true, user });
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

        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET || "super_secret_key",
            { expiresIn: "7d" }
        );

        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, email: user.email, personalPicture: user.personal_picture },
        });
    } catch (err) {
        next(err);
    }
};

exports.me = async (req, res, next) => {
    try {
        const user = req.user;
        res.json({
            success: true,
            user: { id: user.id, username: user.username, email: user.email, personalPicture: user.personal_picture },
        });
    } catch (err) {
        next(err);
    }
};

exports.uploadAvatar = async (req, res, next) => {
    try {
        const user = req.user;
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }

        const filename = req.file.filename;
        await User.updateAvatar(user.id, filename);

        res.json({
            success: true,
            personalPicture: filename,
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
            return res.json({ success: true, message: "If that email exists, a reset code has been sent." });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

        await User.saveResetCode(email, code, expiresAt);
        await sendResetCodeEmail(email, code);

        res.json({ success: true, message: "If that email exists, a reset code has been sent." });
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

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
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

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
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

