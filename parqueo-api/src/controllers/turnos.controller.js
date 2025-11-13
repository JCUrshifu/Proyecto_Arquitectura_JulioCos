const db = require('../config/database');

// ===========================================
// LISTAR TODOS LOS TURNOS
// ===========================================
const listarTurnos = async (req, res) => {
    try {
        const [turnos] = await db.query(
            `SELECT t.*,
                    COUNT(e.id) as total_empleados
             FROM Turnos t
             LEFT JOIN Empleados e ON t.id = e.turno_id
             GROUP BY t.id
             ORDER BY t.hora_inicio ASC`
        );

        res.json({
            total: turnos.length,
            turnos: turnos
        });

    } catch (error) {
        console.error('Error al listar turnos:', error);
        res.status(500).json({
            error: 'Error al listar turnos',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER UN TURNO POR ID
// ===========================================
const obtenerTurno = async (req, res) => {
    try {
        const { id } = req.params;

        const [turnos] = await db.query(
            `SELECT t.*,
                    COUNT(e.id) as total_empleados
             FROM Turnos t
             LEFT JOIN Empleados e ON t.id = e.turno_id
             WHERE t.id = ?
             GROUP BY t.id`,
            [id]
        );

        if (turnos.length === 0) {
            return res.status(404).json({
                error: 'Turno no encontrado',
                mensaje: `No existe un turno con el ID ${id}`
            });
        }

        // Obtener empleados del turno
        const [empleados] = await db.query(
            `SELECT e.id, e.dpi, e.telefono,
                    u.nombre, u.correo, u.activo
             FROM Empleados e
             INNER JOIN Usuarios u ON e.usuario_id = u.id
             WHERE e.turno_id = ?
             ORDER BY u.nombre ASC`,
            [id]
        );

        res.json({
            turno: {
                ...turnos[0],
                empleados: empleados
            }
        });

    } catch (error) {
        console.error('Error al obtener turno:', error);
        res.status(500).json({
            error: 'Error al obtener turno',
            mensaje: error.message
        });
    }
};

// ===========================================
// CREAR NUEVO TURNO
// ===========================================
const crearTurno = async (req, res) => {
    try {
        const { descripcion, hora_inicio, hora_fin } = req.body;

        // Validar campos requeridos
        if (!hora_inicio || !hora_fin) {
            return res.status(400).json({
                error: 'Campos requeridos',
                mensaje: 'Hora de inicio y hora de fin son obligatorias'
            });
        }

        // Validar formato de horas (HH:MM:SS)
        const horaRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
        if (!horaRegex.test(hora_inicio) || !horaRegex.test(hora_fin)) {
            return res.status(400).json({
                error: 'Formato de hora inválido',
                mensaje: 'Las horas deben estar en formato HH:MM:SS (ejemplo: 08:00:00)'
            });
        }

        // Insertar turno
        const [resultado] = await db.query(
            'INSERT INTO Turnos (descripcion, hora_inicio, hora_fin) VALUES (?, ?, ?)',
            [descripcion, hora_inicio, hora_fin]
        );

        // Obtener el turno creado
        const [nuevoTurno] = await db.query(
            'SELECT * FROM Turnos WHERE id = ?',
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Turno creado exitosamente',
            turno: nuevoTurno[0]
        });

    } catch (error) {
        console.error('Error al crear turno:', error);
        res.status(500).json({
            error: 'Error al crear turno',
            mensaje: error.message
        });
    }
};

// ===========================================
// ACTUALIZAR TURNO
// ===========================================
const actualizarTurno = async (req, res) => {
    try {
        const { id } = req.params;
        const { descripcion, hora_inicio, hora_fin } = req.body;

        // Verificar si el turno existe
        const [turnoExiste] = await db.query(
            'SELECT id FROM Turnos WHERE id = ?',
            [id]
        );

        if (turnoExiste.length === 0) {
            return res.status(404).json({
                error: 'Turno no encontrado',
                mensaje: `No existe un turno con el ID ${id}`
            });
        }

        // Validar formato de horas si se proporcionan
        if (hora_inicio || hora_fin) {
            const horaRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
            if ((hora_inicio && !horaRegex.test(hora_inicio)) || 
                (hora_fin && !horaRegex.test(hora_fin))) {
                return res.status(400).json({
                    error: 'Formato de hora inválido',
                    mensaje: 'Las horas deben estar en formato HH:MM:SS (ejemplo: 08:00:00)'
                });
            }
        }

        // Actualizar turno
        await db.query(
            'UPDATE Turnos SET descripcion = ?, hora_inicio = ?, hora_fin = ? WHERE id = ?',
            [descripcion, hora_inicio, hora_fin, id]
        );

        // Obtener el turno actualizado
        const [turnoActualizado] = await db.query(
            'SELECT * FROM Turnos WHERE id = ?',
            [id]
        );

        res.json({
            mensaje: 'Turno actualizado exitosamente',
            turno: turnoActualizado[0]
        });

    } catch (error) {
        console.error('Error al actualizar turno:', error);
        res.status(500).json({
            error: 'Error al actualizar turno',
            mensaje: error.message
        });
    }
};

// ===========================================
// ELIMINAR TURNO
// ===========================================
const eliminarTurno = async (req, res) => {
    try {
        const { id } = req.params;

        const [turnoExiste] = await db.query(
            'SELECT id FROM Turnos WHERE id = ?',
            [id]
        );

        if (turnoExiste.length === 0) {
            return res.status(404).json({
                error: 'Turno no encontrado',
                mensaje: `No existe un turno con el ID ${id}`
            });
        }

        // Verificar si tiene empleados asignados
        const [empleados] = await db.query(
            'SELECT COUNT(*) as total FROM Empleados WHERE turno_id = ?',
            [id]
        );

        if (empleados[0].total > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar',
                mensaje: `El turno tiene ${empleados[0].total} empleado(s) asignado(s). Reasigne los empleados antes de eliminar el turno.`
            });
        }

        await db.query('DELETE FROM Turnos WHERE id = ?', [id]);

        res.json({
            mensaje: 'Turno eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar turno:', error);
        res.status(500).json({
            error: 'Error al eliminar turno',
            mensaje: error.message
        });
    }
};

module.exports = {
    listarTurnos,
    obtenerTurno,
    crearTurno,
    actualizarTurno,
    eliminarTurno
};