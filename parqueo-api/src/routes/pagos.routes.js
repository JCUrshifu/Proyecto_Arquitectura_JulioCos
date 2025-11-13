const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagos.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// POST /api/pagos - Registrar pago de ticket
router.post('/', pagosController.registrarPago);

// GET /api/pagos - Listar todos los pagos (con filtros)
router.get('/', pagosController.listarPagos);

// GET /api/pagos/reporte - Obtener reporte de pagos
router.get('/reporte', pagosController.reportePagos);

// GET /api/pagos/ticket/:ticket_id - Obtener pago por ticket
router.get('/ticket/:ticket_id', pagosController.obtenerPagoPorTicket);

// GET /api/pagos/:id - Obtener un pago específico
router.get('/:id', pagosController.obtenerPago);

module.exports = router;