const express = require('express');
const router = express.Router();
const empleadosController = require('../controllers/empleados.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// GET /api/empleados - Listar todos los empleados
router.get('/', empleadosController.listarEmpleados);

// GET /api/empleados/:id - Obtener un empleado específico
router.get('/:id', empleadosController.obtenerEmpleado);

// POST /api/empleados - Crear nuevo empleado
router.post('/', empleadosController.crearEmpleado);

// PUT /api/empleados/:id - Actualizar empleado
router.put('/:id', empleadosController.actualizarEmpleado);

// PATCH /api/empleados/:id/estado - Cambiar estado (activar/desactivar)
router.patch('/:id/estado', empleadosController.cambiarEstado);

// DELETE /api/empleados/:id - Eliminar empleado
router.delete('/:id', empleadosController.eliminarEmpleado);

module.exports = router;