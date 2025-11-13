const db = require('../config/database');

// ===========================================
// LISTAR TODAS LAS RESERVAS
// ===========================================
const listarReservas = async (req, res) => {
    try {
        const { estado, cliente_id, fecha_inicio, fecha_fin } = req.query;
        
        let query = `SELECT r.*,
                            c.nombre as cliente_nombre,
                            c.telefono as cliente_telefono,
                            e.codigo as espacio_codigo,
                            z.nombre as zona_nombre
                     FROM Reservas r
                     LEFT JOIN Clientes c ON r.cliente_id = c.id
                     LEFT JOIN Espacios e ON r.espacio_id = e.id
                     LEFT JOIN Zonas z ON e.zona_id = z.id
                     WHERE 1=1`;
        
        const params = [];
        
        if (estado) {
            query += ' AND r.estado = ?';
            params.push(estado);
        }
        
        if (cliente_id) {
            query += ' AND r.cliente_id = ?';
            params.push(cliente_id);
        }
        
        if (fecha_inicio) {
            query += ' AND DATE(r.fecha_inicio) >= ?';
            params.push(fecha_inicio);
        }
        
        if (fecha_fin) {
            query += ' AND DATE(r.fecha_fin) <= ?';
            params.push(fecha_fin);
        }
        
        query += ' ORDER BY r.fecha_reserva DESC';

        const [reservas] = await db.query(query, params);

        res.json({
            total: reservas.length,
            activas: reservas.filter(r => r.estado === 'ACTIVA').length,
            finalizadas: reservas.filter(r => r.estado === 'FINALIZADA').length,
            canceladas: reservas.filter(r => r.estado === 'CANCELADA').length,
            reservas: reservas
        });

    } catch (error) {
        console.error('Error al listar reservas:', error);
        res.status(500).json({
            error: 'Error al listar reservas',
            mensaje: error.message
        });
    }
};

// ===========================================
// LISTAR RESERVAS ACTIVAS
// ===========================================
const listarReservasActivas = async (req, res) => {
    try {
        const [reservas] = await db.query(
            `SELECT r.*,
                    c.nombre as cliente_nombre,
                    c.telefono as cliente_telefono,
                    e.codigo as espacio_codigo,
                    z.nombre as zona_nombre
             FROM Reservas r
             LEFT JOIN Clientes c ON r.cliente_id = c.id
             LEFT JOIN Espacios e ON r.espacio_id = e.id
             LEFT JOIN Zonas z ON e.zona_id = z.id
             WHERE r.estado = 'ACTIVA'
             ORDER BY r.fecha_inicio ASC`
        );

        res.json({
            total: reservas.length,
            reservas: reservas
        });

    } catch (error) {
        console.error('Error al listar reservas activas:', error);
        res.status(500).json({
            error: 'Error al listar reservas activas',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER UNA RESERVA POR ID
// ===========================================
const obtenerReserva = async (req, res) => {
    try {
        const { id } = req.params;

        const [reservas] = await db.query(
            `SELECT r.*,
                    c.nombre as cliente_nombre,
                    c.telefono as cliente_telefono,
                    c.correo as cliente_correo,
                    e.codigo as espacio_codigo,
                    e.disponible as espacio_disponible,
                    z.nombre as zona_nombre,
                    z.descripcion as zona_descripcion
             FROM Reservas r
             LEFT JOIN Clientes c ON r.cliente_id = c.id
             LEFT JOIN Espacios e ON r.espacio_id = e.id
             LEFT JOIN Zonas z ON e.zona_id = z.id
             WHERE r.id = ?`,
            [id]
        );

        if (reservas.length === 0) {
            return res.status(404).json({
                error: 'Reserva no encontrada',
                mensaje: `No existe una reserva con el ID ${id}`
            });
        }

        res.json({
            reserva: reservas[0]
        });

    } catch (error) {
        console.error('Error al obtener reserva:', error);
        res.status(500).json({
            error: 'Error al obtener reserva',
            mensaje: error.message
        });
    }
};

// ===========================================
// CREAR NUEVA RESERVA
// ===========================================
const crearReserva = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { cliente_id, espacio_id, fecha_inicio, fecha_fin } = req.body;

        // Validar campos requeridos
        if (!cliente_id || !espacio_id || !fecha_inicio || !fecha_fin) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Campos requeridos',
                mensaje: 'Cliente, espacio, fecha de inicio y fecha de fin son obligatorios'
            });
        }

        // Validar que fecha_fin sea posterior a fecha_inicio
        if (new Date(fecha_fin) <= new Date(fecha_inicio)) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Fechas inválidas',
                mensaje: 'La fecha de fin debe ser posterior a la fecha de inicio'
            });
        }

        // Verificar que el cliente existe
        const [cliente] = await connection.query(
            'SELECT id FROM Clientes WHERE id = ?',
            [cliente_id]
        );

        if (cliente.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Cliente no encontrado'
            });
        }

        // Verificar que el espacio existe
        const [espacio] = await connection.query(
            'SELECT id, disponible FROM Espacios WHERE id = ?',
            [espacio_id]
        );

        if (espacio.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Espacio no encontrado'
            });
        }

        // Verificar que no exista una reserva activa para ese espacio en las fechas solicitadas
        const [reservasConflicto] = await connection.query(
            `SELECT id FROM Reservas 
             WHERE espacio_id = ? 
             AND estado = 'ACTIVA'
             AND (
                 (fecha_inicio <= ? AND fecha_fin >= ?) OR
                 (fecha_inicio <= ? AND fecha_fin >= ?) OR
                 (fecha_inicio >= ? AND fecha_fin <= ?)
             )`,
            [espacio_id, fecha_inicio, fecha_inicio, fecha_fin, fecha_fin, fecha_inicio, fecha_fin]
        );

        if (reservasConflicto.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                error: 'Espacio no disponible',
                mensaje: 'El espacio ya tiene una reserva en las fechas solicitadas'
            });
        }

        // Crear la reserva
        const [resultado] = await connection.query(
            `INSERT INTO Reservas (cliente_id, espacio_id, fecha_reserva, fecha_inicio, fecha_fin, estado) 
             VALUES (?, ?, NOW(), ?, ?, 'ACTIVA')`,
            [cliente_id, espacio_id, fecha_inicio, fecha_fin]
        );

        await connection.commit();

        // Obtener la reserva creada
        const [nuevaReserva] = await db.query(
            `SELECT r.*,
                    c.nombre as cliente_nombre,
                    c.telefono as cliente_telefono,
                    e.codigo as espacio_codigo,
                    z.nombre as zona_nombre
             FROM Reservas r
             LEFT JOIN Clientes c ON r.cliente_id = c.id
             LEFT JOIN Espacios e ON r.espacio_id = e.id
             LEFT JOIN Zonas z ON e.zona_id = z.id
             WHERE r.id = ?`,
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Reserva creada exitosamente',
            reserva: nuevaReserva[0]
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al crear reserva:', error);
        res.status(500).json({
            error: 'Error al crear reserva',
            mensaje: error.message
        });
    } finally {
        connection.release();
    }
};

// ===========================================
// ACTUALIZAR RESERVA
// ===========================================
const actualizarReserva = async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha_inicio, fecha_fin, estado } = req.body;

        // Verificar si la reserva existe
        const [reservaExiste] = await db.query(
            'SELECT id, estado FROM Reservas WHERE id = ?',
            [id]
        );

        if (reservaExiste.length === 0) {
            return res.status(404).json({
                error: 'Reserva no encontrada'
            });
        }

        // No se puede actualizar una reserva finalizada o cancelada
        if (reservaExiste[0].estado !== 'ACTIVA') {
            return res.status(400).json({
                error: 'Reserva no modificable',
                mensaje: 'Solo se pueden modificar reservas activas'
            });
        }

        // Validar fechas si se proporcionan
        if (fecha_inicio && fecha_fin && new Date(fecha_fin) <= new Date(fecha_inicio)) {
            return res.status(400).json({
                error: 'Fechas inválidas',
                mensaje: 'La fecha de fin debe ser posterior a la fecha de inicio'
            });
        }

        // Actualizar reserva
        await db.query(
            'UPDATE Reservas SET fecha_inicio = ?, fecha_fin = ?, estado = ? WHERE id = ?',
            [fecha_inicio, fecha_fin, estado, id]
        );

        // Obtener la reserva actualizada
        const [reservaActualizada] = await db.query(
            `SELECT r.*,
                    c.nombre as cliente_nombre,
                    e.codigo as espacio_codigo,
                    z.nombre as zona_nombre
             FROM Reservas r
             LEFT JOIN Clientes c ON r.cliente_id = c.id
             LEFT JOIN Espacios e ON r.espacio_id = e.id
             LEFT JOIN Zonas z ON e.zona_id = z.id
             WHERE r.id = ?`,
            [id]
        );

        res.json({
            mensaje: 'Reserva actualizada exitosamente',
            reserva: reservaActualizada[0]
        });

    } catch (error) {
        console.error('Error al actualizar reserva:', error);
        res.status(500).json({
            error: 'Error al actualizar reserva',
            mensaje: error.message
        });
    }
};

// ===========================================
// CANCELAR RESERVA
// ===========================================
const cancelarReserva = async (req, res) => {
    try {
        const { id } = req.params;

        const [reservaExiste] = await db.query(
            'SELECT id, estado FROM Reservas WHERE id = ?',
            [id]
        );

        if (reservaExiste.length === 0) {
            return res.status(404).json({
                error: 'Reserva no encontrada'
            });
        }

        if (reservaExiste[0].estado !== 'ACTIVA') {
            return res.status(400).json({
                error: 'No se puede cancelar',
                mensaje: 'Solo se pueden cancelar reservas activas'
            });
        }

        await db.query(
            'UPDATE Reservas SET estado = "CANCELADA" WHERE id = ?',
            [id]
        );

        res.json({
            mensaje: 'Reserva cancelada exitosamente'
        });

    } catch (error) {
        console.error('Error al cancelar reserva:', error);
        res.status(500).json({
            error: 'Error al cancelar reserva',
            mensaje: error.message
        });
    }
};

// ===========================================
// FINALIZAR RESERVA
// ===========================================
const finalizarReserva = async (req, res) => {
    try {
        const { id } = req.params;

        const [reservaExiste] = await db.query(
            'SELECT id, estado FROM Reservas WHERE id = ?',
            [id]
        );

        if (reservaExiste.length === 0) {
            return res.status(404).json({
                error: 'Reserva no encontrada'
            });
        }

        if (reservaExiste[0].estado !== 'ACTIVA') {
            return res.status(400).json({
                error: 'No se puede finalizar',
                mensaje: 'Solo se pueden finalizar reservas activas'
            });
        }

        await db.query(
            'UPDATE Reservas SET estado = "FINALIZADA" WHERE id = ?',
            [id]
        );

        res.json({
            mensaje: 'Reserva finalizada exitosamente'
        });

    } catch (error) {
        console.error('Error al finalizar reserva:', error);
        res.status(500).json({
            error: 'Error al finalizar reserva',
            mensaje: error.message
        });
    }
};

// ===========================================
// BUSCAR RESERVAS POR CLIENTE
// ===========================================
const buscarPorCliente = async (req, res) => {
    try {
        const { cliente_id } = req.params;

        const [reservas] = await db.query(
            `SELECT r.*,
                    e.codigo as espacio_codigo,
                    z.nombre as zona_nombre
             FROM Reservas r
             LEFT JOIN Espacios e ON r.espacio_id = e.id
             LEFT JOIN Zonas z ON e.zona_id = z.id
             WHERE r.cliente_id = ?
             ORDER BY r.fecha_reserva DESC`,
            [cliente_id]
        );

        res.json({
            total: reservas.length,
            cliente_id: parseInt(cliente_id),
            reservas: reservas
        });

    } catch (error) {
        console.error('Error al buscar reservas:', error);
        res.status(500).json({
            error: 'Error al buscar reservas',
            mensaje: error.message
        });
    }
};

module.exports = {
    listarReservas,
    listarReservasActivas,
    obtenerReserva,
    crearReserva,
    actualizarReserva,
    cancelarReserva,
    finalizarReserva,
    buscarPorCliente
};