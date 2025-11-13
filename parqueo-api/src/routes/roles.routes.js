const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/roles.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/roles - Listar todos los roles
router.get('/', rolesController.listarRoles);

// GET /api/roles/:id - Obtener un rol específico
router.get('/:id', rolesController.obtenerRol);

// POST /api/roles - Crear nuevo rol
router.post('/', rolesController.crearRol);

// PUT /api/roles/:id - Actualizar rol
router.put('/:id', rolesController.actualizarRol);

// DELETE /api/roles/:id - Eliminar rol
router.delete('/:id', rolesController.eliminarRol);

module.exports = router;