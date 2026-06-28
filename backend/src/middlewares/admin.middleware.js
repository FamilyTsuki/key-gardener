const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Express middleware to verify that the request contains a valid JWT token (via cookies or Authorization header)
 * and verify that the authenticated user possesses administrator privileges.
 * @param {import("express").Request} req - The Express request object.
 * @param {import("express").Response} res - The Express response object.
 * @param {import("express").NextFunction} next - The next middleware function in the stack.
 */
const requireAdmin = async (req, res, next) => {
    try {
        let token = req.cookies ? req.cookies.jwt : null;
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            }
        }

        if (!token) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        if (!user.is_admin) {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Token expired" });
        }
        res.status(401).json({ success: false, message: "Invalid token" });
    }
};

module.exports = requireAdmin;
