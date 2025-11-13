const express = require('express');
const router = express.Router();
const tarifasController = require('../controllers/tarifas.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/tarifas - Listar todas las tarifas
router.get('/', tarifasController.listarTarifas);

// GET /api/tarifas/:id - Obtener una tarifa específica
router.get('/:id', tarifasController.obtenerTarifa);

// POST /api/tarifas - Crear nueva tarifa
router.post('/', tarifasController.crearTarifa);

// PUT /api/tarifas/:id - Actualizar tarifa
router.put('/:id', tarifasController.actualizarTarifa);

// DELETE /api/tarifas/:id - Eliminar tarifa
router.delete('/:id', tarifasController.eliminarTarifa);

module.exports = router;