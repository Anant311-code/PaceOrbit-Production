import jwt from "jsonwebtoken";
export function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            success: false,
            message: "Authentication token is required.",
        });
        return;
    }
    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        res.status(500).json({
            success: false,
            message: "Authentication is not configured.",
        });
        return;
    }
    try {
        const decoded = jwt.verify(token, secret);
        if (typeof decoded !== "object" ||
            !decoded ||
            typeof decoded.userId !== "string") {
            res.status(401).json({
                success: false,
                message: "Invalid authentication token.",
            });
            return;
        }
        req.userId = decoded.userId;
        next();
    }
    catch {
        res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token.",
        });
    }
}
