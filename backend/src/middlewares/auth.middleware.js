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
        process.env.JWT_SECRET || "super_secret_key",
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

module.exports = verifyToken;
