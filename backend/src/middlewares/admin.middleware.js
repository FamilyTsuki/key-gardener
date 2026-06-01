const jwt = require("jsonwebtoken");
const User = require("../models/User");

const requireAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "super_secret_key"
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
