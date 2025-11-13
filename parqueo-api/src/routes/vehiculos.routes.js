const express = require('express');
const router = express.Router();
const vehiculosController = require('../controllers/vehiculos.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/vehiculos - Listar todos los vehículos
router.get('/', vehiculosController.listarVehiculos);

// GET /api/vehiculos/placa/:placa - Buscar por placa
router.get('/placa/:placa', vehiculosController.buscarPorPlaca);

// GET /api/vehiculos/:id - Obtener un vehículo específico
router.get('/:id', vehiculosController.obtenerVehiculo);

// POST /api/vehiculos - Crear nuevo vehículo
router.post('/', vehiculosController.crearVehiculo);

// PUT /api/vehiculos/:id - Actualizar vehículo
router.put('/:id', vehiculosController.actualizarVehiculo);

// DELETE /api/vehiculos/:id - Eliminar vehículo
router.delete('/:id', vehiculosController.eliminarVehiculo);

module.exports = router;