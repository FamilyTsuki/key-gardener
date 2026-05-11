const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

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
            user: { id: user.id, username: user.username, email: user.email },
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
            user: { id: user.id, username: user.username, email: user.email },
        });
    } catch (err) {
        next(err);
    }
};
