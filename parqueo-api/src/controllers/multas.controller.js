const db = require('../config/database');

// ===========================================
// LISTAR TODAS LAS MULTAS
// ===========================================
const listarMultas = async (req, res) => {
    try {
        const { ticket_id, fecha_inicio, fecha_fin } = req.query;
        
        let query = `SELECT m.*,
                            t.id as ticket_numero,
                            v.placa,
                            c.nombre as cliente_nombre,
                            c.telefono as cliente_telefono
                     FROM Multas m
                     LEFT JOIN Tickets t ON m.ticket_id = t.id
                     LEFT JOIN Vehiculos v ON t.vehiculo_id = v.id
                     LEFT JOIN Clientes c ON v.cliente_id = c.id
                     WHERE 1=1`;
        
        const params = [];
        
        if (ticket_id) {
            query += ' AND m.ticket_id = ?';
            params.push(ticket_id);
        }
        
        if (fecha_inicio) {
            query += ' AND DATE(m.fecha) >= ?';
            params.push(fecha_inicio);
        }
        
        if (fecha_fin) {
            query += ' AND DATE(m.fecha) <= ?';
            params.push(fecha_fin);
        }
        
        query += ' ORDER BY m.fecha DESC';

        const [multas] = await db.query(query, params);

        // Calcular totales
        const totalMonto = multas.reduce((sum, m) => sum + parseFloat(m.monto), 0);

        res.json({
            total: multas.length,
            total_monto: totalMonto.toFixed(2),
            multas: multas
        });

    } catch (error) {
        console.error('Error al listar multas:', error);
        res.status(500).json({
            error: 'Error al listar multas',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER UNA MULTA POR ID
// ===========================================
const obtenerMulta = async (req, res) => {
    try {
        const { id } = req.params;

        const [multas] = await db.query(
            `SELECT m.*,
                    t.id as ticket_numero,
                    t.hora_entrada,
                    t.hora_salida,
                    v.placa,
                    v.marca,
                    v.modelo,
                    c.nombre as cliente_nombre,
                    c.telefono as cliente_telefono,
                    c.correo as cliente_correo
             FROM Multas m
             LEFT JOIN Tickets t ON m.ticket_id = t.id
             LEFT JOIN Vehiculos v ON t.vehiculo_id = v.id
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             WHERE m.id = ?`,
            [id]
        );

        if (multas.length === 0) {
            return res.status(404).json({
                error: 'Multa no encontrada',
                mensaje: `No existe una multa con el ID ${id}`
            });
        }

        res.json({
            multa: multas[0]
        });

    } catch (error) {
        console.error('Error al obtener multa:', error);
        res.status(500).json({
            error: 'Error al obtener multa',
            mensaje: error.message
        });
    }
};

// ===========================================
// CREAR NUEVA MULTA
// ===========================================
const crearMulta = async (req, res) => {
    try {
        const { ticket_id, motivo, monto } = req.body;

        // Validar campos requeridos
        if (!ticket_id || !motivo || !monto) {
            return res.status(400).json({
                error: 'Campos requeridos',
                mensaje: 'Ticket, motivo y monto son obligatorios'
            });
        }

        // Validar que el monto sea positivo
        if (monto <= 0) {
            return res.status(400).json({
                error: 'Monto inválido',
                mensaje: 'El monto debe ser mayor a 0'
            });
        }

        // Verificar que el ticket existe
        const [ticket] = await db.query(
            'SELECT id FROM Tickets WHERE id = ?',
            [ticket_id]
        );

        if (ticket.length === 0) {
            return res.status(404).json({
                error: 'Ticket no encontrado',
                mensaje: `No existe un ticket con el ID ${ticket_id}`
            });
        }

        // Crear la multa (solo campos que existen en la BD)
        const [resultado] = await db.query(
            'INSERT INTO Multas (ticket_id, motivo, monto) VALUES (?, ?, ?)',
            [ticket_id, motivo, monto]
        );

        // Obtener la multa creada
        const [nuevaMulta] = await db.query(
            `SELECT m.*,
                    t.id as ticket_numero,
                    v.placa,
                    c.nombre as cliente_nombre
             FROM Multas m
             LEFT JOIN Tickets t ON m.ticket_id = t.id
             LEFT JOIN Vehiculos v ON t.vehiculo_id = v.id
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             WHERE m.id = ?`,
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Multa creada exitosamente',
            multa: nuevaMulta[0]
        });

    } catch (error) {
        console.error('Error al crear multa:', error);
        res.status(500).json({
            error: 'Error al crear multa',
            mensaje: error.message
        });
    }
};

// ===========================================
// ACTUALIZAR MULTA
// ===========================================
const actualizarMulta = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo, monto } = req.body;

        // Verificar si la multa existe
        const [multaExiste] = await db.query(
            'SELECT id FROM Multas WHERE id = ?',
            [id]
        );

        if (multaExiste.length === 0) {
            return res.status(404).json({
                error: 'Multa no encontrada'
            });
        }

        // Validar monto si se proporciona
        if (monto && monto <= 0) {
            return res.status(400).json({
                error: 'Monto inválido',
                mensaje: 'El monto debe ser mayor a 0'
            });
        }

        // Actualizar multa
        await db.query(
            'UPDATE Multas SET motivo = ?, monto = ? WHERE id = ?',
            [motivo, monto, id]
        );

        // Obtener la multa actualizada
        const [multaActualizada] = await db.query(
            `SELECT m.*,
                    t.id as ticket_numero,
                    v.placa,
                    c.nombre as cliente_nombre
             FROM Multas m
             LEFT JOIN Tickets t ON m.ticket_id = t.id
             LEFT JOIN Vehiculos v ON t.vehiculo_id = v.id
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             WHERE m.id = ?`,
            [id]
        );

        res.json({
            mensaje: 'Multa actualizada exitosamente',
            multa: multaActualizada[0]
        });

    } catch (error) {
        console.error('Error al actualizar multa:', error);
        res.status(500).json({
            error: 'Error al actualizar multa',
            mensaje: error.message
        });
    }
};

// ===========================================
// ELIMINAR MULTA
// ===========================================
const eliminarMulta = async (req, res) => {
    try {
        const { id } = req.params;

        const [multaExiste] = await db.query(
            'SELECT id FROM Multas WHERE id = ?',
            [id]
        );

        if (multaExiste.length === 0) {
            return res.status(404).json({
                error: 'Multa no encontrada'
            });
        }

        await db.query('DELETE FROM Multas WHERE id = ?', [id]);

        res.json({
            mensaje: 'Multa eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar multa:', error);
        res.status(500).json({
            error: 'Error al eliminar multa',
            mensaje: error.message
        });
    }
};

// ===========================================
// BUSCAR MULTAS POR TICKET
// ===========================================
const buscarPorTicket = async (req, res) => {
    try {
        const { ticket_id } = req.params;

        const [multas] = await db.query(
            `SELECT m.*,
                    v.placa,
                    c.nombre as cliente_nombre
             FROM Multas m
             LEFT JOIN Tickets t ON m.ticket_id = t.id
             LEFT JOIN Vehiculos v ON t.vehiculo_id = v.id
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             WHERE m.ticket_id = ?
             ORDER BY m.fecha DESC`,
            [ticket_id]
        );

        res.json({
            total: multas.length,
            ticket_id: parseInt(ticket_id),
            multas: multas
        });

    } catch (error) {
        console.error('Error al buscar multas:', error);
        res.status(500).json({
            error: 'Error al buscar multas',
            mensaje: error.message
        });
    }
};

module.exports = {
    listarMultas,
    obtenerMulta,
    crearMulta,
    actualizarMulta,
    eliminarMulta,
    buscarPorTicket
};