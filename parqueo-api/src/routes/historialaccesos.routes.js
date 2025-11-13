const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialaccesos.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/historial - Listar todo el historial (con filtros opcionales)
router.get('/', historialController.listarHistorial);

// GET /api/historial/estadisticas - Obtener estadísticas de accesos
router.get('/estadisticas', historialController.obtenerEstadisticas);

// GET /api/historial/usuario/:usuario_id - Obtener historial por usuario
router.get('/usuario/:usuario_id', historialController.obtenerHistorialPorUsuario);

// GET /api/historial/:id - Obtener un registro específico
router.get('/:id', historialController.obtenerRegistro);

// POST /api/historial - Registrar acceso manual (opcional)
router.post('/', historialController.registrarAcceso);

// DELETE /api/historial/limpiar - Limpiar registros antiguos
router.delete('/limpiar', historialController.limpiarHistorial);

module.exports = router;