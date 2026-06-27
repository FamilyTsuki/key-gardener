const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Verifies the token.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 */
const verifyToken = async (req, res, next) => {
    const token = req.cookies.jwt;

    if (!token) {
        return res
            .status(403)
            .json({ success: false, message: "No token provided." });
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET,
        async (err, decoded) => {
            if (err) {
                return res
                    .status(401)
                    .json({ success: false, message: "Unauthorized." });
            }

            try {
                const user = await User.findById(decoded.id);
                if (!user) {
                    return res
                        .status(401)
                        .json({ success: false, message: "User not found." });
                }
                req.user = user;
                next();
            } catch (error) {
                return res
                    .status(500)
                    .json({ success: false, message: "Server error." });
            }
        }
    );
};

/**
 * Optionals the verify token.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 */
const optionalVerifyToken = async (req, res, next) => {
    const token = req.cookies.jwt;

    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET,
        async (err, decoded) => {
            if (err) {
                req.user = null;
                return next();
            }

            try {
                const user = await User.findById(decoded.id);
                req.user = user || null;
                next();
            } catch (error) {
                req.user = null;
                next();
            }
        }
    );
};

verifyToken.optional = optionalVerifyToken;

module.exports = verifyToken;
