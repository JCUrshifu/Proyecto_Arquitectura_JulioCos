const db = require('../config/database');

// ===========================================
// LISTAR TODAS LAS ZONAS
// ===========================================
const listarZonas = async (req, res) => {
    try {
        const [zonas] = await db.query(
            `SELECT z.*, 
             COUNT(e.id) as total_espacios,
             SUM(CASE WHEN e.disponible = 1 THEN 1 ELSE 0 END) as espacios_disponibles
             FROM Zonas z
             LEFT JOIN Espacios e ON z.id = e.zona_id
             GROUP BY z.id
             ORDER BY z.nombre ASC`
        );

        res.json({
            total: zonas.length,
            zonas: zonas
        });

    } catch (error) {
        console.error('Error al listar zonas:', error);
        res.status(500).json({
            error: 'Error al listar zonas',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER UNA ZONA POR ID
// ===========================================
const obtenerZona = async (req, res) => {
    try {
        const { id } = req.params;

        const [zonas] = await db.query(
            `SELECT z.*, 
             COUNT(e.id) as total_espacios,
             SUM(CASE WHEN e.disponible = 1 THEN 1 ELSE 0 END) as espacios_disponibles
             FROM Zonas z
             LEFT JOIN Espacios e ON z.id = e.zona_id
             WHERE z.id = ?
             GROUP BY z.id`,
            [id]
        );

        if (zonas.length === 0) {
            return res.status(404).json({
                error: 'Zona no encontrada'
            });
        }

        // Obtener los espacios de la zona
        const [espacios] = await db.query(
            'SELECT * FROM Espacios WHERE zona_id = ? ORDER BY codigo ASC',
            [id]
        );

        res.json({
            zona: zonas[0],
            espacios: espacios
        });

    } catch (error) {
        console.error('Error al obtener zona:', error);
        res.status(500).json({
            error: 'Error al obtener zona',
            mensaje: error.message
        });
    }
};

// ===========================================
// CREAR NUEVA ZONA
// ===========================================
const crearZona = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;

        if (!nombre) {
            return res.status(400).json({
                error: 'Campo requerido',
                mensaje: 'El nombre es obligatorio'
            });
        }

        const [resultado] = await db.query(
            'INSERT INTO Zonas (nombre, descripcion) VALUES (?, ?)',
            [nombre, descripcion]
        );

        const [nuevaZona] = await db.query(
            'SELECT * FROM Zonas WHERE id = ?',
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Zona creada exitosamente',
            zona: nuevaZona[0]
        });

    } catch (error) {
        console.error('Error al crear zona:', error);
        res.status(500).json({
            error: 'Error al crear zona',
            mensaje: error.message
        });
    }
};

// ===========================================
// ACTUALIZAR ZONA
// ===========================================
const actualizarZona = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;

        const [zonaExiste] = await db.query(
            'SELECT id FROM Zonas WHERE id = ?',
            [id]
        );

        if (zonaExiste.length === 0) {
            return res.status(404).json({
                error: 'Zona no encontrada'
            });
        }

        await db.query(
            'UPDATE Zonas SET nombre = ?, descripcion = ? WHERE id = ?',
            [nombre, descripcion, id]
        );

        const [zonaActualizada] = await db.query(
            'SELECT * FROM Zonas WHERE id = ?',
            [id]
        );

        res.json({
            mensaje: 'Zona actualizada exitosamente',
            zona: zonaActualizada[0]
        });

    } catch (error) {
        console.error('Error al actualizar zona:', error);
        res.status(500).json({
            error: 'Error al actualizar zona',
            mensaje: error.message
        });
    }
};

// ===========================================
// ELIMINAR ZONA
// ===========================================
const eliminarZona = async (req, res) => {
    try {
        const { id } = req.params;

        const [zonaExiste] = await db.query(
            'SELECT id FROM Zonas WHERE id = ?',
            [id]
        );

        if (zonaExiste.length === 0) {
            return res.status(404).json({
                error: 'Zona no encontrada'
            });
        }

        // Verificar si tiene espacios asociados
        const [espacios] = await db.query(
            'SELECT COUNT(*) as total FROM Espacios WHERE zona_id = ?',
            [id]
        );

        if (espacios[0].total > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar',
                mensaje: 'La zona tiene espacios asociados'
            });
        }

        await db.query('DELETE FROM Zonas WHERE id = ?', [id]);

        res.json({
            mensaje: 'Zona eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar zona:', error);
        res.status(500).json({
            error: 'Error al eliminar zona',
            mensaje: error.message
        });
    }
};

module.exports = {
    listarZonas,
    obtenerZona,
    crearZona,
    actualizarZona,
    eliminarZona
};