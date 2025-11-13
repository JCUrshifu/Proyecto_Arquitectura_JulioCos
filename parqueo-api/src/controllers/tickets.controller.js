const db = require('../config/database');

// ===========================================
// REGISTRAR ENTRADA (CREAR TICKET)
// ===========================================
const registrarEntrada = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { vehiculo_id, espacio_id, tarifa_id } = req.body;
        const empleado_id = req.usuario.id;

        // Validaciones
        if (!vehiculo_id || !espacio_id || !tarifa_id) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Campos requeridos',
                mensaje: 'Vehículo, espacio y tarifa son obligatorios'
            });
        }

        // Verificar que el vehículo existe
        const [vehiculo] = await connection.query(
            'SELECT id FROM Vehiculos WHERE id = ?',
            [vehiculo_id]
        );

        if (vehiculo.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Vehículo no encontrado'
            });
        }

        // Verificar que el espacio existe y está disponible
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

        if (!espacio[0].disponible) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Espacio no disponible',
                mensaje: 'El espacio seleccionado está ocupado'
            });
        }

        // Verificar que el vehículo no tiene un ticket activo
        const [ticketActivo] = await connection.query(
            'SELECT id FROM Tickets WHERE vehiculo_id = ? AND estado = "ACTIVO"',
            [vehiculo_id]
        );

        if (ticketActivo.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Ticket activo existente',
                mensaje: 'Este vehículo ya tiene un ticket activo'
            });
        }

        // Crear el ticket
        const [resultado] = await connection.query(
            'INSERT INTO Tickets (vehiculo_id, espacio_id, empleado_id, tarifa_id, estado) VALUES (?, ?, ?, ?, "ACTIVO")',
            [vehiculo_id, espacio_id, empleado_id, tarifa_id]
        );

        // Marcar el espacio como ocupado
        await connection.query(
            'UPDATE Espacios SET disponible = FALSE WHERE id = ?',
            [espacio_id]
        );

        await connection.commit();

        // Obtener el ticket creado con toda la información
        const [nuevoTicket] = await db.query(
            `SELECT t.*, 
                    v.placa, v.marca, v.modelo,
                    c.nombre as cliente_nombre,
                    e.codigo as espacio_codigo,
                    z.nombre as zona_nombre,
                    tar.descripcion as tarifa_descripcion, tar.precio_hora,
                    u.nombre as empleado_nombre
             FROM Tickets t
             LEFT JOIN Vehiculos v ON t.vehiculo_id = v.id
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             LEFT JOIN Espacios e ON t.espacio_id = e.id
             LEFT JOIN Zonas z ON e.zona_id = z.id
             LEFT JOIN Tarifas tar ON t.tarifa_id = tar.id
             LEFT JOIN Empleados emp ON t.empleado_id = emp.id
             LEFT JOIN Usuarios u ON emp.usuario_id = u.id
             WHERE t.id = ?`,
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Entrada registrada exitosamente',
            ticket: nuevoTicket[0]
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al registrar entrada:', error);
        res.status(500).json({
            error: 'Error al registrar entrada',
            mensaje: error.message
        });
    } finally {
        connection.release();
    }
};

// ===========================================
// REGISTRAR SALIDA
// ===========================================
const registrarSalida = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Obtener el ticket
        const [tickets] = await connection.query(
            `SELECT t.*, tar.precio_hora
             FROM Tickets t
             LEFT JOIN Tarifas tar ON t.tarifa_id = tar.id
             WHERE t.id = ?`,
            [id]
        );

        if (tickets.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Ticket no encontrado'
            });
        }

        const ticket = tickets[0];

        if (ticket.estado === 'CERRADO') {
            await connection.rollback();
            return res.status(400).json({
                error: 'Ticket ya cerrado',
                mensaje: 'Este ticket ya fue cerrado anteriormente'
            });
        }

        // Actualizar ticket con hora de salida
        await connection.query(
            'UPDATE Tickets SET hora_salida = NOW(), estado = "CERRADO" WHERE id = ?',
            [id]
        );

        // Liberar el espacio
        await connection.query(
            'UPDATE Espacios SET disponible = TRUE WHERE id = ?',
            [ticket.espacio_id]
        );

        await connection.commit();

        // Obtener el ticket actualizado con cálculo de tiempo y monto
        const [ticketActualizado] = await db.query(
            `SELECT t.*,
                    TIMESTAMPDIFF(MINUTE, t.hora_entrada, t.hora_salida) as minutos_totales,
                    CEIL(TIMESTAMPDIFF(MINUTE, t.hora_entrada, t.hora_salida) / 60.0) as horas_cobrar,
                    CEIL(TIMESTAMPDIFF(MINUTE, t.hora_entrada, t.hora_salida) / 60.0) * tar.precio_hora as monto_total,
                    v.placa, v.marca, v.modelo,
                    c.nombre as cliente_nombre,
                    e.codigo as espacio_codigo,
                    z.nombre as zona_nombre,
                    tar.descripcion as tarifa_descripcion, tar.precio_hora
             FROM Tickets t
             LEFT JOIN Vehiculos v ON t.vehiculo_id = v.id
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             LEFT JOIN Espacios e ON t.espacio_id = e.id
             LEFT JOIN Zonas z ON e.zona_id = z.id
             LEFT JOIN Tarifas tar ON t.tarifa_id = tar.id
             WHERE t.id = ?`,
            [id]
        );

        res.json({
            mensaje: 'Salida registrada exitosamente',
            ticket: ticketActualizado[0]
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al registrar salida:', error);
        res.status(500).json({
            error: 'Error al registrar salida',
            mensaje: error.message
        });
    } finally {
        connection.release();
    }
};

// ===========================================
// LISTAR TODOS LOS TICKETS
// ===========================================
const listarTickets = async (req, res) => {
    try {
        const { estado, fecha_inicio, fecha_fin } = req.query;
        
        let query = `SELECT t.*,
                            v.placa, v.marca, v.modelo,
                            c.nombre as cliente_nombre,
                            e.codigo as espacio_codigo,
                            z.nombre as zona_nombre,
                            tar.precio_hora
                     FROM Tickets t
                     LEFT JOIN Vehiculos v ON t.vehiculo_id = v.id
                     LEFT JOIN Clientes c ON v.cliente_id = c.id
                     LEFT JOIN Espacios e ON t.espacio_id = e.id
                     LEFT JOIN Zonas z ON e.zona_id = z.id
                     LEFT JOIN Tarifas tar ON t.tarifa_id = tar.id
                     WHERE 1=1`;
        
        const params = [];
        
        if (estado) {
            query += ' AND t.estado = ?';
            params.push(estado);
        }
        
        if (fecha_inicio) {
            query += ' AND DATE(t.hora_entrada) >= ?';
            params.push(fecha_inicio);
        }
        
        if (fecha_fin) {
            query += ' AND DATE(t.hora_entrada) <= ?';
            params.push(fecha_fin);
        }
        
        query += ' ORDER BY t.hora_entrada DESC';

        const [tickets] = await db.query(query, params);

        res.json({
            total: tickets.length,
            tickets: tickets
        });

    } catch (error) {
        console.error('Error al listar tickets:', error);
        res.status(500).json({
            error: 'Error al listar tickets',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER TICKETS ACTIVOS
// ===========================================
const listarActivos = async (req, res) => {
    try {
        const [tickets] = await db.query(
            `SELECT t.*,
                    TIMESTAMPDIFF(MINUTE, t.hora_entrada, NOW()) as minutos_transcurridos,
                    v.placa, v.marca, v.modelo, v.color,
                    c.nombre as cliente_nombre, c.telefono as cliente_telefono,
                    e.codigo as espacio_codigo,
                    z.nombre as zona_nombre,
                    tar.descripcion as tarifa_descripcion, tar.precio_hora
             FROM Tickets t
             LEFT JOIN Vehiculos v ON t.vehiculo_id = v.id
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             LEFT JOIN Espacios e ON t.espacio_id = e.id
             LEFT JOIN Zonas z ON e.zona_id = z.id
             LEFT JOIN Tarifas tar ON t.tarifa_id = tar.id
             WHERE t.estado = "ACTIVO"
             ORDER BY t.hora_entrada DESC`
        );

        res.json({
            total: tickets.length,
            tickets: tickets
        });

    } catch (error) {
        console.error('Error al listar tickets activos:', error);
        res.status(500).json({
            error: 'Error al listar tickets activos',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER UN TICKET POR ID
// ===========================================
const obtenerTicket = async (req, res) => {
    try {
        const { id } = req.params;

        const [tickets] = await db.query(
            `SELECT t.*,
                    CASE 
                        WHEN t.estado = 'ACTIVO' THEN TIMESTAMPDIFF(MINUTE, t.hora_entrada, NOW())
                        ELSE TIMESTAMPDIFF(MINUTE, t.hora_entrada, t.hora_salida)
                    END as minutos_totales,
                    v.placa, v.marca, v.modelo, v.color,
                    c.nombre as cliente_nombre, c.telefono as cliente_telefono,
                    e.codigo as espacio_codigo,
                    z.nombre as zona_nombre,
                    tar.descripcion as tarifa_descripcion, tar.precio_hora,
                    u.nombre as empleado_nombre
             FROM Tickets t
             LEFT JOIN Vehiculos v ON t.vehiculo_id = v.id
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             LEFT JOIN Espacios e ON t.espacio_id = e.id
             LEFT JOIN Zonas z ON e.zona_id = z.id
             LEFT JOIN Tarifas tar ON t.tarifa_id = tar.id
             LEFT JOIN Empleados emp ON t.empleado_id = emp.id
             LEFT JOIN Usuarios u ON emp.usuario_id = u.id
             WHERE t.id = ?`,
            [id]
        );

        if (tickets.length === 0) {
            return res.status(404).json({
                error: 'Ticket no encontrado'
            });
        }

        res.json({
            ticket: tickets[0]
        });

    } catch (error) {
        console.error('Error al obtener ticket:', error);
        res.status(500).json({
            error: 'Error al obtener ticket',
            mensaje: error.message
        });
    }
};

// ===========================================
// BUSCAR TICKETS POR VEHÍCULO (PLACA)
// ===========================================
const buscarPorVehiculo = async (req, res) => {
    try {
        const { placa } = req.params;

        const [tickets] = await db.query(
            `SELECT t.*,
                    v.placa, v.marca, v.modelo,
                    e.codigo as espacio_codigo,
                    z.nombre as zona_nombre
             FROM Tickets t
             INNER JOIN Vehiculos v ON t.vehiculo_id = v.id
             LEFT JOIN Espacios e ON t.espacio_id = e.id
             LEFT JOIN Zonas z ON e.zona_id = z.id
             WHERE v.placa = ?
             ORDER BY t.hora_entrada DESC`,
            [placa]
        );

        res.json({
            total: tickets.length,
            placa: placa,
            tickets: tickets
        });

    } catch (error) {
        console.error('Error al buscar tickets:', error);
        res.status(500).json({
            error: 'Error al buscar tickets',
            mensaje: error.message
        });
    }
};

module.exports = {
    registrarEntrada,
    registrarSalida,
    listarTickets,
    listarActivos,
    obtenerTicket,
    buscarPorVehiculo
};