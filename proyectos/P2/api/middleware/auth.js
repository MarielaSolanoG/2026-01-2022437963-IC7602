const jwt = require("jsonwebtoken");

// Este middleware verifica que el request tenga un token válido
// Se usa en cualquier ruta que requiera estar autenticado
const requireAuth = (req, res, next) => {
    // El token viene en el header: Authorization: Bearer <token>
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token requerido" });
    }

    const token = authHeader.split(" ")[1];

    try {
        // Verifica que el token sea válido y no haya expirado
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Adjunta el usuario al request para usarlo en la ruta
        req.user = decoded;
        
        // Continúa al siguiente middleware o ruta
        next();
    } catch (e) {
        return res.status(401).json({ message: "Token inválido o expirado" });
    }
};

module.exports = { requireAuth };