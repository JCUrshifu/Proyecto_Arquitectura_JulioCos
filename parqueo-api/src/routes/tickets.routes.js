const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/tickets.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.use(verificarToken);

// POST /api/tickets/entrada - Registrar entrada de vehículo
router.post('/entrada', ticketsController.registrarEntrada);

// PUT /api/tickets/:id/salida - Registrar salida de vehículo
router.put('/:id/salida', ticketsController.registrarSalida);

// GET /api/tickets - Listar todos los tickets (con filtros opcionales)
router.get('/', ticketsController.listarTickets);

// GET /api/tickets/activos - Listar tickets activos
router.get('/activos', ticketsController.listarActivos);

// GET /api/tickets/vehiculo/:placa - Buscar tickets por placa
router.get('/vehiculo/:placa', ticketsController.buscarPorVehiculo);

// GET /api/tickets/:id - Obtener un ticket específico
router.get('/:id', ticketsController.obtenerTicket);

module.exports = router;