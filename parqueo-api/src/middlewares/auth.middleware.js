const jwt = require('jsonwebtoken');

// MIDDLEWARE: Verificar Token JWT
const verificarToken = (req, res, next) => {
    try {
        // Obtener token del header Authorization
        const authHeader = req.headers['authorization'];
        
        if (!authHeader) {
            return res.status(403).json({
                error: 'Token no proporcionado',
                mensaje: 'Debes incluir el header Authorization con el token'
            });
        }

        // El formato es: "Bearer TOKEN"
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(403).json({
                error: 'Formato de token inválido',
                mensaje: 'El formato debe ser: Bearer [TOKEN]'
            });
        }

        // Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Agregar la información del usuario al request
        req.usuario = decoded;
        
        // Continuar con la siguiente función
        next();
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expirado',
                mensaje: 'Tu sesión ha expirado, inicia sesión nuevamente'
            });
        }
        
        return res.status(401).json({
            error: 'Token inválido',
            mensaje: 'El token proporcionado no es válido'
        });
    }
};

// MIDDLEWARE: Verificar Rol
const verificarRol = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({
                error: 'No autenticado',
                mensaje: 'Debes estar autenticado para acceder a este recurso'
            });
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                error: 'Acceso denegado',
                mensaje: `Esta acción requiere uno de estos roles: ${rolesPermitidos.join(', ')}`
            });
        }

        next();
    };
};

module.exports = {
    verificarToken,
    verificarRol
};