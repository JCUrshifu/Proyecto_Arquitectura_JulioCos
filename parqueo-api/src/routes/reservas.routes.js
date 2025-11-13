const express = require('express');
const router = express.Router();
const reservasController = require('../controllers/reservas.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/reservas - Listar todas las reservas (con filtros)
router.get('/', reservasController.listarReservas);

// GET /api/reservas/activas - Listar reservas activas
router.get('/activas', reservasController.listarReservasActivas);

// GET /api/reservas/cliente/:cliente_id - Buscar reservas por cliente
router.get('/cliente/:cliente_id', reservasController.buscarPorCliente);

// GET /api/reservas/:id - Obtener una reserva específica
router.get('/:id', reservasController.obtenerReserva);

// POST /api/reservas - Crear nueva reserva
router.post('/', reservasController.crearReserva);

// PUT /api/reservas/:id - Actualizar reserva
router.put('/:id', reservasController.actualizarReserva);

// PATCH /api/reservas/:id/cancelar - Cancelar reserva
router.patch('/:id/cancelar', reservasController.cancelarReserva);

// PATCH /api/reservas/:id/finalizar - Finalizar reserva
router.patch('/:id/finalizar', reservasController.finalizarReserva);

module.exports = router;