const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

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

const optionalVerifyToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

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
