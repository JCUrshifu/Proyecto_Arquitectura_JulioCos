const db = require('../config/database');

// ===========================================
// REGISTRAR PAGO (PROCESAR PAGO DE TICKET)
// ===========================================
const registrarPago = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { ticket_id, tipo_pago_id, monto } = req.body;

        // Validaciones
        if (!ticket_id || !tipo_pago_id || !monto) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Campos requeridos',
                mensaje: 'Ticket, tipo de pago y monto son obligatorios'
            });
        }

        // Verificar que el ticket existe y está cerrado
        const [tickets] = await connection.query(
            `SELECT t.*, 
                    TIMESTAMPDIFF(MINUTE, t.hora_entrada, t.hora_salida) as minutos_totales,
                    CEIL(TIMESTAMPDIFF(MINUTE, t.hora_entrada, t.hora_salida) / 60.0) as horas_cobrar,
                    tar.precio_hora
             FROM Tickets t
             LEFT JOIN Tarifas tar ON t.tarifa_id = tar.id
             WHERE t.id = ?`,
            [ticket_id]
        );

        if (tickets.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Ticket no encontrado'
            });
        }

        const ticket = tickets[0];

        if (ticket.estado !== 'CERRADO') {
            await connection.rollback();
            return res.status(400).json({
                error: 'Ticket no cerrado',
                mensaje: 'El ticket debe estar cerrado antes de procesar el pago'
            });
        }

        // Verificar si ya se realizó un pago para este ticket
        const [pagoExiste] = await connection.query(
            'SELECT id FROM Pagos WHERE ticket_id = ?',
            [ticket_id]
        );

        if (pagoExiste.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                error: 'Pago ya registrado',
                mensaje: 'Este ticket ya tiene un pago registrado'
            });
        }

        // Calcular monto esperado
        const montoEsperado = ticket.horas_cobrar * ticket.precio_hora;

        // Verificar que el tipo de pago existe
        const [tipoPago] = await connection.query(
            'SELECT id, nombre FROM TiposPago WHERE id = ?',
            [tipo_pago_id]
        );

        if (tipoPago.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Tipo de pago no encontrado'
            });
        }

        // Registrar el pago (solo campos que existen en la BD)
        const [resultado] = await connection.query(
            `INSERT INTO Pagos (ticket_id, tipo_pago_id, monto) 
             VALUES (?, ?, ?)`,
            [ticket_id, tipo_pago_id, monto]
        );

        await connection.commit();

        // Obtener el pago registrado con toda la información
        const [nuevoPago] = await db.query(
            `SELECT p.*,
                    tp.nombre as tipo_pago_nombre,
                    t.id as ticket_numero,
                    v.placa,
                    c.nombre as cliente_nombre
             FROM Pagos p
             LEFT JOIN TiposPago tp ON p.tipo_pago_id = tp.id
             LEFT JOIN Tickets t ON p.ticket_id = t.id
             LEFT JOIN Vehiculos v ON t.vehiculo_id = v.id
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             WHERE p.id = ?`,
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Pago registrado exitosamente',
            pago: nuevoPago[0],
            monto_esperado: montoEsperado.toFixed(2),
            cambio: monto > montoEsperado ? (monto - montoEsperado).toFixed(2) : 0
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al registrar pago:', error);
        res.status(500).json({
            error: 'Error al registrar pago',
            mensaje: error.message
        });
    } finally {
        connection.release();
    }
};

// ===========================================
// LISTAR TODOS LOS PAGOS
// ===========================================
const listarPagos = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, tipo_pago_id } = req.query;
        
        let query = `SELECT p.*,
                            tp.nombre as tipo_pago_nombre,
                            t.id as ticket_numero,
                            v.placa,
                            c.nombre as cliente_nombre
                     FROM Pagos p
                     LEFT JOIN TiposPago tp ON p.tipo_pago_id = tp.id
                     LEFT JOIN Tickets t ON p.ticket_id = t.id
                     LEFT JOIN Vehiculos v ON t.vehiculo_id = v.id
                     LEFT JOIN Clientes c ON v.cliente_id = c.id
                     WHERE 1=1`;
        
        const params = [];
        
        if (tipo_pago_id) {
            query += ' AND p.tipo_pago_id = ?';
            params.push(tipo_pago_id);
        }
        
        if (fecha_inicio) {
            query += ' AND DATE(p.fecha_pago) >= ?';
            params.push(fecha_inicio);
        }
        
        if (fecha_fin) {
            query += ' AND DATE(p.fecha_pago) <= ?';
            params.push(fecha_fin);
        }
        
        query += ' ORDER BY p.fecha_pago DESC';

        const [pagos] = await db.query(query, params);

        // Calcular totales
        const totalMonto = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);

        res.json({
            total: pagos.length,
            total_monto: totalMonto.toFixed(2),
            pagos: pagos
        });

    } catch (error) {
        console.error('Error al listar pagos:', error);
        res.status(500).json({
            error: 'Error al listar pagos',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER UN PAGO POR ID
// ===========================================
const obtenerPago = async (req, res) => {
    try {
        const { id } = req.params;

        const [pagos] = await db.query(
            `SELECT p.*,
                    tp.nombre as tipo_pago_nombre,
                    t.id as ticket_numero,
                    t.hora_entrada,
                    t.hora_salida,
                    v.placa,
                    v.marca,
                    v.modelo,
                    c.nombre as cliente_nombre,
                    c.telefono as cliente_telefono,
                    tar.descripcion as tarifa_descripcion,
                    tar.precio_hora
             FROM Pagos p
             LEFT JOIN TiposPago tp ON p.tipo_pago_id = tp.id
             LEFT JOIN Tickets t ON p.ticket_id = t.id
             LEFT JOIN Vehiculos v ON t.vehiculo_id = v.id
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             LEFT JOIN Tarifas tar ON t.tarifa_id = tar.id
             WHERE p.id = ?`,
            [id]
        );

        if (pagos.length === 0) {
            return res.status(404).json({
                error: 'Pago no encontrado',
                mensaje: `No existe un pago con el ID ${id}`
            });
        }

        res.json({
            pago: pagos[0]
        });

    } catch (error) {
        console.error('Error al obtener pago:', error);
        res.status(500).json({
            error: 'Error al obtener pago',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER PAGO POR TICKET
// ===========================================
const obtenerPagoPorTicket = async (req, res) => {
    try {
        const { ticket_id } = req.params;

        const [pagos] = await db.query(
            `SELECT p.*,
                    tp.nombre as tipo_pago_nombre
             FROM Pagos p
             LEFT JOIN TiposPago tp ON p.tipo_pago_id = tp.id
             WHERE p.ticket_id = ?`,
            [ticket_id]
        );

        if (pagos.length === 0) {
            return res.status(404).json({
                error: 'Pago no encontrado',
                mensaje: `No existe un pago para el ticket ${ticket_id}`
            });
        }

        res.json({
            pago: pagos[0]
        });

    } catch (error) {
        console.error('Error al obtener pago:', error);
        res.status(500).json({
            error: 'Error al obtener pago',
            mensaje: error.message
        });
    }
};

// ===========================================
// REPORTE DE PAGOS (ESTADÍSTICAS)
// ===========================================
const reportePagos = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;
        
        let whereClause = '1=1';
        const params = [];
        
        if (fecha_inicio) {
            whereClause += ' AND DATE(p.fecha_pago) >= ?';
            params.push(fecha_inicio);
        }
        
        if (fecha_fin) {
            whereClause += ' AND DATE(p.fecha_pago) <= ?';
            params.push(fecha_fin);
        }

        // Total de pagos
        const [totales] = await db.query(
            `SELECT 
                COUNT(*) as total_pagos,
                SUM(monto) as total_recaudado,
                AVG(monto) as promedio_pago,
                MIN(monto) as pago_minimo,
                MAX(monto) as pago_maximo
             FROM Pagos p
             WHERE ${whereClause}`,
            params
        );

        // Pagos por tipo
        const [porTipo] = await db.query(
            `SELECT 
                tp.nombre as tipo_pago,
                COUNT(*) as cantidad,
                SUM(p.monto) as total
             FROM Pagos p
             LEFT JOIN TiposPago tp ON p.tipo_pago_id = tp.id
             WHERE ${whereClause}
             GROUP BY tp.id, tp.nombre
             ORDER BY total DESC`,
            params
        );

        // Pagos por día
        const [porDia] = await db.query(
            `SELECT 
                DATE(fecha_pago) as fecha,
                COUNT(*) as cantidad,
                SUM(monto) as total
             FROM Pagos p
             WHERE ${whereClause}
             GROUP BY DATE(fecha_pago)
             ORDER BY fecha DESC
             LIMIT 30`,
            params
        );

        res.json({
            resumen: totales[0],
            por_tipo_pago: porTipo,
            por_dia: porDia
        });

    } catch (error) {
        console.error('Error al generar reporte:', error);
        res.status(500).json({
            error: 'Error al generar reporte',
            mensaje: error.message
        });
    }
};

module.exports = {
    registrarPago,
    listarPagos,
    obtenerPago,
    obtenerPagoPorTicket,
    reportePagos
};