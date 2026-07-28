// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

export const verifyToken = (requiredRoles = []) => {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ success: false, message: "Access Denied." });
        }

        try {
            // This pulls the long secure string directly from your .env file
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; 

            if (requiredRoles.length > 0 && !requiredRoles.includes(decoded.role)) {
                return res.status(403).json({ success: false, message: "Forbidden." });
            }

            next(); 
        } catch (error) {
            return res.status(403).json({ success: false, message: "Session expired or invalid." });
        }
    };
};
 