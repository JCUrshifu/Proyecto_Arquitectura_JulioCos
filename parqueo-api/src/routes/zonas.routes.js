const express = require('express');
const router = express.Router();
const zonasController = require('../controllers/zonas.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.use(verificarToken);

router.get('/', zonasController.listarZonas);
router.get('/:id', zonasController.obtenerZona);
router.post('/', zonasController.crearZona);
router.put('/:id', zonasController.actualizarZona);
router.delete('/:id', zonasController.eliminarZona);

module.exports = router;