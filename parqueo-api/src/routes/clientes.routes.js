const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/clientes - Listar todos los clientes
router.get('/', clientesController.listarClientes);

// GET /api/clientes/:id - Obtener un cliente específico
router.get('/:id', clientesController.obtenerCliente);

// POST /api/clientes - Crear nuevo cliente
router.post('/', clientesController.crearCliente);

// PUT /api/clientes/:id - Actualizar cliente
router.put('/:id', clientesController.actualizarCliente);

// DELETE /api/clientes/:id - Eliminar cliente
router.delete('/:id', clientesController.eliminarCliente);

module.exports = router;