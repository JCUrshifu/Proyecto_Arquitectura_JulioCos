const express = require('express');
const router = express.Router();
const tiposPagoController = require('../controllers/tipospago.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/tipospago - Listar todos los tipos de pago
router.get('/', tiposPagoController.listarTiposPago);

// GET /api/tipospago/:id - Obtener un tipo de pago específico
router.get('/:id', tiposPagoController.obtenerTipoPago);

// POST /api/tipospago - Crear nuevo tipo de pago
router.post('/', tiposPagoController.crearTipoPago);

// PUT /api/tipospago/:id - Actualizar tipo de pago
router.put('/:id', tiposPagoController.actualizarTipoPago);

// DELETE /api/tipospago/:id - Eliminar tipo de pago
router.delete('/:id', tiposPagoController.eliminarTipoPago);

module.exports = router;