const express = require('express');
const router = express.Router();
const espaciosController = require('../controllers/espacios.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.use(verificarToken);

router.get('/', espaciosController.listarEspacios);
router.get('/disponibles', espaciosController.listarDisponibles);
router.get('/:id', espaciosController.obtenerEspacio);
router.post('/', espaciosController.crearEspacio);
router.put('/:id', espaciosController.actualizarEspacio);
router.patch('/:id/disponibilidad', espaciosController.cambiarDisponibilidad);
router.delete('/:id', espaciosController.eliminarEspacio);

module.exports = router;