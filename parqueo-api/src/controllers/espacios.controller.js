const db = require('../config/database');

// ===========================================
// LISTAR TODOS LOS ESPACIOS
// ===========================================
const listarEspacios = async (req, res) => {
    try {
        const [espacios] = await db.query(
            `SELECT e.*, z.nombre as zona_nombre
             FROM Espacios e
             LEFT JOIN Zonas z ON e.zona_id = z.id
             ORDER BY z.nombre, e.codigo ASC`
        );

        res.json({
            total: espacios.length,
            disponibles: espacios.filter(e => e.disponible).length,
            ocupados: espacios.filter(e => !e.disponible).length,
            espacios: espacios
        });

    } catch (error) {
        console.error('Error al listar espacios:', error);
        res.status(500).json({
            error: 'Error al listar espacios',
            mensaje: error.message
        });
    }
};

// ===========================================
// LISTAR ESPACIOS DISPONIBLES
// ===========================================
const listarDisponibles = async (req, res) => {
    try {
        const { zona_id } = req.query;
        
        let query = `SELECT e.*, z.nombre as zona_nombre
                     FROM Espacios e
                     LEFT JOIN Zonas z ON e.zona_id = z.id
                     WHERE e.disponible = 1`;
        
        const params = [];
        
        if (zona_id) {
            query += ' AND e.zona_id = ?';
            params.push(zona_id);
        }
        
        query += ' ORDER BY z.nombre, e.codigo ASC';

        const [espacios] = await db.query(query, params);

        res.json({
            total: espacios.length,
            espacios: espacios
        });

    } catch (error) {
        console.error('Error al listar espacios disponibles:', error);
        res.status(500).json({
            error: 'Error al listar espacios disponibles',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER UN ESPACIO POR ID
// ===========================================
const obtenerEspacio = async (req, res) => {
    try {
        const { id } = req.params;

        const [espacios] = await db.query(
            `SELECT e.*, z.nombre as zona_nombre, z.descripcion as zona_descripcion
             FROM Espacios e
             LEFT JOIN Zonas z ON e.zona_id = z.id
             WHERE e.id = ?`,
            [id]
        );

        if (espacios.length === 0) {
            return res.status(404).json({
                error: 'Espacio no encontrado'
            });
        }

        res.json({
            espacio: espacios[0]
        });

    } catch (error) {
        console.error('Error al obtener espacio:', error);
        res.status(500).json({
            error: 'Error al obtener espacio',
            mensaje: error.message
        });
    }
};

// ===========================================
// CREAR NUEVO ESPACIO
// ===========================================
const crearEspacio = async (req, res) => {
    try {
        const { zona_id, codigo, disponible } = req.body;

        if (!zona_id || !codigo) {
            return res.status(400).json({
                error: 'Campos requeridos',
                mensaje: 'Zona ID y código son obligatorios'
            });
        }

        // Verificar que la zona existe
        const [zona] = await db.query(
            'SELECT id FROM Zonas WHERE id = ?',
            [zona_id]
        );

        if (zona.length === 0) {
            return res.status(404).json({
                error: 'Zona no encontrada'
            });
        }

        // Verificar que el código no existe
        const [codigoExiste] = await db.query(
            'SELECT id FROM Espacios WHERE codigo = ?',
            [codigo]
        );

        if (codigoExiste.length > 0) {
            return res.status(409).json({
                error: 'Código duplicado',
                mensaje: `Ya existe un espacio con el código ${codigo}`
            });
        }

        const [resultado] = await db.query(
            'INSERT INTO Espacios (zona_id, codigo, disponible) VALUES (?, ?, ?)',
            [zona_id, codigo.toUpperCase(), disponible !== undefined ? disponible : true]
        );

        const [nuevoEspacio] = await db.query(
            `SELECT e.*, z.nombre as zona_nombre
             FROM Espacios e
             LEFT JOIN Zonas z ON e.zona_id = z.id
             WHERE e.id = ?`,
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Espacio creado exitosamente',
            espacio: nuevoEspacio[0]
        });

    } catch (error) {
        console.error('Error al crear espacio:', error);
        res.status(500).json({
            error: 'Error al crear espacio',
            mensaje: error.message
        });
    }
};

// ===========================================
// ACTUALIZAR ESPACIO
// ===========================================
const actualizarEspacio = async (req, res) => {
    try {
        const { id } = req.params;
        const { zona_id, codigo, disponible } = req.body;

        const [espacioExiste] = await db.query(
            'SELECT id FROM Espacios WHERE id = ?',
            [id]
        );

        if (espacioExiste.length === 0) {
            return res.status(404).json({
                error: 'Espacio no encontrado'
            });
        }

        await db.query(
            'UPDATE Espacios SET zona_id = ?, codigo = ?, disponible = ? WHERE id = ?',
            [zona_id, codigo?.toUpperCase(), disponible, id]
        );

        const [espacioActualizado] = await db.query(
            `SELECT e.*, z.nombre as zona_nombre
             FROM Espacios e
             LEFT JOIN Zonas z ON e.zona_id = z.id
             WHERE e.id = ?`,
            [id]
        );

        res.json({
            mensaje: 'Espacio actualizado exitosamente',
            espacio: espacioActualizado[0]
        });

    } catch (error) {
        console.error('Error al actualizar espacio:', error);
        res.status(500).json({
            error: 'Error al actualizar espacio',
            mensaje: error.message
        });
    }
};

// ===========================================
// CAMBIAR DISPONIBILIDAD DE ESPACIO
// ===========================================
const cambiarDisponibilidad = async (req, res) => {
    try {
        const { id } = req.params;
        const { disponible } = req.body;

        const [espacioExiste] = await db.query(
            'SELECT id FROM Espacios WHERE id = ?',
            [id]
        );

        if (espacioExiste.length === 0) {
            return res.status(404).json({
                error: 'Espacio no encontrado'
            });
        }

        await db.query(
            'UPDATE Espacios SET disponible = ? WHERE id = ?',
            [disponible, id]
        );

        const [espacioActualizado] = await db.query(
            'SELECT * FROM Espacios WHERE id = ?',
            [id]
        );

        res.json({
            mensaje: 'Disponibilidad actualizada',
            espacio: espacioActualizado[0]
        });

    } catch (error) {
        console.error('Error al cambiar disponibilidad:', error);
        res.status(500).json({
            error: 'Error al cambiar disponibilidad',
            mensaje: error.message
        });
    }
};

// ===========================================
// ELIMINAR ESPACIO
// ===========================================
const eliminarEspacio = async (req, res) => {
    try {
        const { id } = req.params;

        const [espacioExiste] = await db.query(
            'SELECT id FROM Espacios WHERE id = ?',
            [id]
        );

        if (espacioExiste.length === 0) {
            return res.status(404).json({
                error: 'Espacio no encontrado'
            });
        }

        // Verificar si tiene tickets asociados
        const [tickets] = await db.query(
            'SELECT COUNT(*) as total FROM Tickets WHERE espacio_id = ?',
            [id]
        );

        if (tickets[0].total > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar',
                mensaje: 'El espacio tiene tickets asociados'
            });
        }

        await db.query('DELETE FROM Espacios WHERE id = ?', [id]);

        res.json({
            mensaje: 'Espacio eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar espacio:', error);
        res.status(500).json({
            error: 'Error al eliminar espacio',
            mensaje: error.message
        });
    }
};

module.exports = {
    listarEspacios,
    listarDisponibles,
    obtenerEspacio,
    crearEspacio,
    actualizarEspacio,
    cambiarDisponibilidad,
    eliminarEspacio
};