const express = require('express');
const router = express.Router();
const turnosController = require('../controllers/turnos.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/turnos - Listar todos los turnos
router.get('/', turnosController.listarTurnos);

// GET /api/turnos/:id - Obtener un turno específico
router.get('/:id', turnosController.obtenerTurno);

// POST /api/turnos - Crear nuevo turno
router.post('/', turnosController.crearTurno);

// PUT /api/turnos/:id - Actualizar turno
router.put('/:id', turnosController.actualizarTurno);

// DELETE /api/turnos/:id - Eliminar turno
router.delete('/:id', turnosController.eliminarTurno);

module.exports = router;