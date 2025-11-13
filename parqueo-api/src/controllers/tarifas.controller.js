const db = require('../config/database');

// ===========================================
// LISTAR TODAS LAS TARIFAS
// ===========================================
const listarTarifas = async (req, res) => {
    try {
        const [tarifas] = await db.query(
            'SELECT * FROM Tarifas ORDER BY descripcion ASC'
        );

        res.json({
            total: tarifas.length,
            tarifas: tarifas
        });

    } catch (error) {
        console.error('Error al listar tarifas:', error);
        res.status(500).json({
            error: 'Error al listar tarifas',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER UNA TARIFA POR ID
// ===========================================
const obtenerTarifa = async (req, res) => {
    try {
        const { id } = req.params;

        const [tarifas] = await db.query(
            'SELECT * FROM Tarifas WHERE id = ?',
            [id]
        );

        if (tarifas.length === 0) {
            return res.status(404).json({
                error: 'Tarifa no encontrada',
                mensaje: `No existe una tarifa con el ID ${id}`
            });
        }

        res.json({
            tarifa: tarifas[0]
        });

    } catch (error) {
        console.error('Error al obtener tarifa:', error);
        res.status(500).json({
            error: 'Error al obtener tarifa',
            mensaje: error.message
        });
    }
};

// ===========================================
// CREAR NUEVA TARIFA
// ===========================================
const crearTarifa = async (req, res) => {
    try {
        const { descripcion, precio_hora } = req.body;

        // Validar campos requeridos
        if (!descripcion || !precio_hora) {
            return res.status(400).json({
                error: 'Campos requeridos',
                mensaje: 'Descripción y precio por hora son obligatorios'
            });
        }

        // Validar que el precio sea un número positivo
        if (precio_hora <= 0) {
            return res.status(400).json({
                error: 'Precio inválido',
                mensaje: 'El precio debe ser un valor positivo'
            });
        }

        // Insertar tarifa
        const [resultado] = await db.query(
            'INSERT INTO Tarifas (descripcion, precio_hora) VALUES (?, ?)',
            [descripcion, precio_hora]
        );

        // Obtener la tarifa creada
        const [nuevaTarifa] = await db.query(
            'SELECT * FROM Tarifas WHERE id = ?',
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Tarifa creada exitosamente',
            tarifa: nuevaTarifa[0]
        });

    } catch (error) {
        console.error('Error al crear tarifa:', error);
        res.status(500).json({
            error: 'Error al crear tarifa',
            mensaje: error.message
        });
    }
};

// ===========================================
// ACTUALIZAR TARIFA
// ===========================================
const actualizarTarifa = async (req, res) => {
    try {
        const { id } = req.params;
        const { descripcion, precio_hora } = req.body;

        // Verificar si la tarifa existe
        const [tarifaExiste] = await db.query(
            'SELECT id FROM Tarifas WHERE id = ?',
            [id]
        );

        if (tarifaExiste.length === 0) {
            return res.status(404).json({
                error: 'Tarifa no encontrada',
                mensaje: `No existe una tarifa con el ID ${id}`
            });
        }

        // Validar que el precio sea un número positivo
        if (precio_hora && precio_hora <= 0) {
            return res.status(400).json({
                error: 'Precio inválido',
                mensaje: 'El precio debe ser un valor positivo'
            });
        }

        // Actualizar tarifa
        await db.query(
            'UPDATE Tarifas SET descripcion = ?, precio_hora = ? WHERE id = ?',
            [descripcion, precio_hora, id]
        );

        // Obtener la tarifa actualizada
        const [tarifaActualizada] = await db.query(
            'SELECT * FROM Tarifas WHERE id = ?',
            [id]
        );

        res.json({
            mensaje: 'Tarifa actualizada exitosamente',
            tarifa: tarifaActualizada[0]
        });

    } catch (error) {
        console.error('Error al actualizar tarifa:', error);
        res.status(500).json({
            error: 'Error al actualizar tarifa',
            mensaje: error.message
        });
    }
};

// ===========================================
// ELIMINAR TARIFA
// ===========================================
const eliminarTarifa = async (req, res) => {
    try {
        const { id } = req.params;

        const [tarifaExiste] = await db.query(
            'SELECT id FROM Tarifas WHERE id = ?',
            [id]
        );

        if (tarifaExiste.length === 0) {
            return res.status(404).json({
                error: 'Tarifa no encontrada'
            });
        }

        // Verificar si tiene tickets asociados
        const [tickets] = await db.query(
            'SELECT COUNT(*) as total FROM Tickets WHERE tarifa_id = ?',
            [id]
        );

        if (tickets[0].total > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar',
                mensaje: 'La tarifa tiene tickets asociados.'
            });
        }

        await db.query('DELETE FROM Tarifas WHERE id = ?', [id]);

        res.json({
            mensaje: 'Tarifa eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar tarifa:', error);
        res.status(500).json({
            error: 'Error al eliminar tarifa',
            mensaje: error.message
        });
    }
};

module.exports = {
    listarTarifas,
    obtenerTarifa,
    crearTarifa,
    actualizarTarifa,
    eliminarTarifa
};