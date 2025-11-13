const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// RUTAS PÚBLICAS (sin autenticación)
// POST /api/auth/register - Registrar nuevo usuario
router.post('/register', authController.registrar);

// POST /api/auth/login - Iniciar sesión
router.post('/login', authController.login);

// RUTAS PROTEGIDAS (requieren autenticación)
// GET /api/auth/perfil - Obtener perfil del usuario autenticado
router.get('/perfil', verificarToken, authController.obtenerPerfil);

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', verificarToken, authController.logout);

module.exports = router;