const express = require('express');
const router = express.Router();
const multasController = require('../controllers/multas.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/multas - Listar todas las multas (con filtros opcionales)
router.get('/', multasController.listarMultas);

// GET /api/multas/ticket/:ticket_id - Buscar multas por ticket
router.get('/ticket/:ticket_id', multasController.buscarPorTicket);

// GET /api/multas/:id - Obtener una multa específica
router.get('/:id', multasController.obtenerMulta);

// POST /api/multas - Crear nueva multa
router.post('/', multasController.crearMulta);

// PUT /api/multas/:id - Actualizar multa
router.put('/:id', multasController.actualizarMulta);

// DELETE /api/multas/:id - Eliminar multa
router.delete('/:id', multasController.eliminarMulta);

module.exports = router;