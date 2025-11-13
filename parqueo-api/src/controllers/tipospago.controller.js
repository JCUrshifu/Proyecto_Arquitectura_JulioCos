const db = require('../config/database');

// ===========================================
// LISTAR TODOS LOS TIPOS DE PAGO
// ===========================================
const listarTiposPago = async (req, res) => {
    try {
        const [tiposPago] = await db.query(
            `SELECT tp.*,
                    COUNT(p.id) as total_pagos,
                    COALESCE(SUM(p.monto), 0) as monto_total
             FROM TiposPago tp
             LEFT JOIN Pagos p ON tp.id = p.tipo_pago_id
             GROUP BY tp.id
             ORDER BY tp.nombre ASC`
        );

        res.json({
            total: tiposPago.length,
            tiposPago: tiposPago
        });

    } catch (error) {
        console.error('Error al listar tipos de pago:', error);
        res.status(500).json({
            error: 'Error al listar tipos de pago',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER UN TIPO DE PAGO POR ID
// ===========================================
const obtenerTipoPago = async (req, res) => {
    try {
        const { id } = req.params;

        const [tiposPago] = await db.query(
            `SELECT tp.*,
                    COUNT(p.id) as total_pagos,
                    COALESCE(SUM(p.monto), 0) as monto_total
             FROM TiposPago tp
             LEFT JOIN Pagos p ON tp.id = p.tipo_pago_id
             WHERE tp.id = ?
             GROUP BY tp.id`,
            [id]
        );

        if (tiposPago.length === 0) {
            return res.status(404).json({
                error: 'Tipo de pago no encontrado',
                mensaje: `No existe un tipo de pago con el ID ${id}`
            });
        }

        res.json({
            tipoPago: tiposPago[0]
        });

    } catch (error) {
        console.error('Error al obtener tipo de pago:', error);
        res.status(500).json({
            error: 'Error al obtener tipo de pago',
            mensaje: error.message
        });
    }
};

// ===========================================
// CREAR NUEVO TIPO DE PAGO
// ===========================================
const crearTipoPago = async (req, res) => {
    try {
        const { nombre } = req.body;

        // Validar campos requeridos
        if (!nombre) {
            return res.status(400).json({
                error: 'Campo requerido',
                mensaje: 'El nombre del tipo de pago es obligatorio'
            });
        }

        // Verificar que no exista un tipo de pago con el mismo nombre
        const [tipoPagoExiste] = await db.query(
            'SELECT id FROM TiposPago WHERE nombre = ?',
            [nombre]
        );

        if (tipoPagoExiste.length > 0) {
            return res.status(409).json({
                error: 'Tipo de pago ya existe',
                mensaje: `Ya existe un tipo de pago con el nombre: ${nombre}`
            });
        }

        // Insertar tipo de pago
        const [resultado] = await db.query(
            'INSERT INTO TiposPago (nombre) VALUES (?)',
            [nombre]
        );

        // Obtener el tipo de pago creado
        const [nuevoTipoPago] = await db.query(
            'SELECT * FROM TiposPago WHERE id = ?',
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Tipo de pago creado exitosamente',
            tipoPago: nuevoTipoPago[0]
        });

    } catch (error) {
        console.error('Error al crear tipo de pago:', error);
        res.status(500).json({
            error: 'Error al crear tipo de pago',
            mensaje: error.message
        });
    }
};

// ===========================================
// ACTUALIZAR TIPO DE PAGO
// ===========================================
const actualizarTipoPago = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;

        // Verificar si el tipo de pago existe
        const [tipoPagoExiste] = await db.query(
            'SELECT id FROM TiposPago WHERE id = ?',
            [id]
        );

        if (tipoPagoExiste.length === 0) {
            return res.status(404).json({
                error: 'Tipo de pago no encontrado',
                mensaje: `No existe un tipo de pago con el ID ${id}`
            });
        }

        // Verificar que el nombre no esté duplicado (excepto el mismo tipo de pago)
        if (nombre) {
            const [nombreDuplicado] = await db.query(
                'SELECT id FROM TiposPago WHERE nombre = ? AND id != ?',
                [nombre, id]
            );

            if (nombreDuplicado.length > 0) {
                return res.status(409).json({
                    error: 'Nombre duplicado',
                    mensaje: `Ya existe otro tipo de pago con el nombre: ${nombre}`
                });
            }
        }

        // Actualizar tipo de pago
        await db.query(
            'UPDATE TiposPago SET nombre = ? WHERE id = ?',
            [nombre, id]
        );

        // Obtener el tipo de pago actualizado
        const [tipoPagoActualizado] = await db.query(
            'SELECT * FROM TiposPago WHERE id = ?',
            [id]
        );

        res.json({
            mensaje: 'Tipo de pago actualizado exitosamente',
            tipoPago: tipoPagoActualizado[0]
        });

    } catch (error) {
        console.error('Error al actualizar tipo de pago:', error);
        res.status(500).json({
            error: 'Error al actualizar tipo de pago',
            mensaje: error.message
        });
    }
};

// ===========================================
// ELIMINAR TIPO DE PAGO
// ===========================================
const eliminarTipoPago = async (req, res) => {
    try {
        const { id } = req.params;

        const [tipoPagoExiste] = await db.query(
            'SELECT id FROM TiposPago WHERE id = ?',
            [id]
        );

        if (tipoPagoExiste.length === 0) {
            return res.status(404).json({
                error: 'Tipo de pago no encontrado'
            });
        }

        // Verificar si tiene pagos asociados
        const [pagos] = await db.query(
            'SELECT COUNT(*) as total FROM Pagos WHERE tipo_pago_id = ?',
            [id]
        );

        if (pagos[0].total > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar',
                mensaje: `El tipo de pago tiene ${pagos[0].total} pago(s) asociado(s).`
            });
        }

        await db.query('DELETE FROM TiposPago WHERE id = ?', [id]);

        res.json({
            mensaje: 'Tipo de pago eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar tipo de pago:', error);
        res.status(500).json({
            error: 'Error al eliminar tipo de pago',
            mensaje: error.message
        });
    }
};

module.exports = {
    listarTiposPago,
    obtenerTipoPago,
    crearTipoPago,
    actualizarTipoPago,
    eliminarTipoPago
};