const db = require('../config/database');

// ===========================================
// LISTAR TODO EL HISTORIAL DE ACCESOS
// ===========================================
const listarHistorial = async (req, res) => {
    try {
        const { usuario_id, accion, fecha_inicio, fecha_fin, limit } = req.query;
        
        let query = `SELECT h.*,
                            u.nombre as usuario_nombre,
                            u.correo as usuario_correo,
                            r.nombre as rol_nombre
                     FROM HistorialAccesos h
                     LEFT JOIN Usuarios u ON h.usuario_id = u.id
                     LEFT JOIN Roles r ON u.rol_id = r.id
                     WHERE 1=1`;
        
        const params = [];
        
        if (usuario_id) {
            query += ' AND h.usuario_id = ?';
            params.push(usuario_id);
        }
        
        if (accion) {
            query += ' AND h.accion = ?';
            params.push(accion);
        }
        
        if (fecha_inicio) {
            query += ' AND DATE(h.fecha) >= ?';
            params.push(fecha_inicio);
        }
        
        if (fecha_fin) {
            query += ' AND DATE(h.fecha) <= ?';
            params.push(fecha_fin);
        }
        
        query += ' ORDER BY h.fecha DESC';
        
        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        }

        const [historial] = await db.query(query, params);

        res.json({
            total: historial.length,
            historial: historial
        });

    } catch (error) {
        console.error('Error al listar historial:', error);
        res.status(500).json({
            error: 'Error al listar historial',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER HISTORIAL POR USUARIO
// ===========================================
const obtenerHistorialPorUsuario = async (req, res) => {
    try {
        const { usuario_id } = req.params;
        const { limit } = req.query;

        // Verificar que el usuario existe
        const [usuario] = await db.query(
            'SELECT id, nombre, correo FROM Usuarios WHERE id = ?',
            [usuario_id]
        );

        if (usuario.length === 0) {
            return res.status(404).json({
                error: 'Usuario no encontrado',
                mensaje: `No existe un usuario con el ID ${usuario_id}`
            });
        }

        let query = `SELECT h.*
                     FROM HistorialAccesos h
                     WHERE h.usuario_id = ?
                     ORDER BY h.fecha DESC`;
        
        const params = [usuario_id];
        
        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        }

        const [historial] = await db.query(query, params);

        res.json({
            usuario: usuario[0],
            total_accesos: historial.length,
            historial: historial
        });

    } catch (error) {
        console.error('Error al obtener historial por usuario:', error);
        res.status(500).json({
            error: 'Error al obtener historial por usuario',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER UN REGISTRO DE HISTORIAL POR ID
// ===========================================
const obtenerRegistro = async (req, res) => {
    try {
        const { id } = req.params;

        const [registros] = await db.query(
            `SELECT h.*,
                    u.nombre as usuario_nombre,
                    u.correo as usuario_correo,
                    r.nombre as rol_nombre
             FROM HistorialAccesos h
             LEFT JOIN Usuarios u ON h.usuario_id = u.id
             LEFT JOIN Roles r ON u.rol_id = r.id
             WHERE h.id = ?`,
            [id]
        );

        if (registros.length === 0) {
            return res.status(404).json({
                error: 'Registro no encontrado',
                mensaje: `No existe un registro con el ID ${id}`
            });
        }

        res.json({
            registro: registros[0]
        });

    } catch (error) {
        console.error('Error al obtener registro:', error);
        res.status(500).json({
            error: 'Error al obtener registro',
            mensaje: error.message
        });
    }
};

// ===========================================
// REGISTRAR ACCESO MANUAL (OPCIONAL)
// ===========================================
const registrarAcceso = async (req, res) => {
    try {
        const { usuario_id, accion } = req.body;

        // Validar campos requeridos
        if (!usuario_id || !accion) {
            return res.status(400).json({
                error: 'Campos requeridos',
                mensaje: 'Usuario ID y acción son obligatorios'
            });
        }

        // Verificar que el usuario existe
        const [usuario] = await db.query(
            'SELECT id FROM Usuarios WHERE id = ?',
            [usuario_id]
        );

        if (usuario.length === 0) {
            return res.status(404).json({
                error: 'Usuario no encontrado',
                mensaje: `No existe un usuario con el ID ${usuario_id}`
            });
        }

        // Insertar registro
        const [resultado] = await db.query(
            'INSERT INTO HistorialAccesos (usuario_id, accion) VALUES (?, ?)',
            [usuario_id, accion]
        );

        // Obtener el registro creado
        const [nuevoRegistro] = await db.query(
            `SELECT h.*,
                    u.nombre as usuario_nombre,
                    u.correo as usuario_correo
             FROM HistorialAccesos h
             LEFT JOIN Usuarios u ON h.usuario_id = u.id
             WHERE h.id = ?`,
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Acceso registrado exitosamente',
            registro: nuevoRegistro[0]
        });

    } catch (error) {
        console.error('Error al registrar acceso:', error);
        res.status(500).json({
            error: 'Error al registrar acceso',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER ESTADÍSTICAS DE ACCESOS
// ===========================================
const obtenerEstadisticas = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;
        
        let whereClause = '1=1';
        const params = [];
        
        if (fecha_inicio) {
            whereClause += ' AND DATE(h.fecha) >= ?';
            params.push(fecha_inicio);
        }
        
        if (fecha_fin) {
            whereClause += ' AND DATE(h.fecha) <= ?';
            params.push(fecha_fin);
        }

        // Total de accesos
        const [totales] = await db.query(
            `SELECT 
                COUNT(*) as total_accesos,
                COUNT(DISTINCT usuario_id) as usuarios_unicos,
                COUNT(CASE WHEN accion = 'LOGIN' THEN 1 END) as total_logins,
                COUNT(CASE WHEN accion = 'LOGOUT' THEN 1 END) as total_logouts
             FROM HistorialAccesos h
             WHERE ${whereClause}`,
            params
        );

        // Accesos por usuario
        const [porUsuario] = await db.query(
            `SELECT 
                u.nombre as usuario,
                u.correo,
                COUNT(*) as total_accesos,
                MAX(h.fecha) as ultimo_acceso
             FROM HistorialAccesos h
             LEFT JOIN Usuarios u ON h.usuario_id = u.id
             WHERE ${whereClause}
             GROUP BY h.usuario_id, u.nombre, u.correo
             ORDER BY total_accesos DESC
             LIMIT 10`,
            params
        );

        // Accesos por acción
        const [porAccion] = await db.query(
            `SELECT 
                accion,
                COUNT(*) as cantidad
             FROM HistorialAccesos h
             WHERE ${whereClause}
             GROUP BY accion
             ORDER BY cantidad DESC`,
            params
        );

        // Accesos por día
        const [porDia] = await db.query(
            `SELECT 
                DATE(fecha) as fecha,
                COUNT(*) as cantidad
             FROM HistorialAccesos h
             WHERE ${whereClause}
             GROUP BY DATE(fecha)
             ORDER BY fecha DESC
             LIMIT 30`,
            params
        );

        res.json({
            resumen: totales[0],
            top_usuarios: porUsuario,
            por_accion: porAccion,
            por_dia: porDia
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            error: 'Error al obtener estadísticas',
            mensaje: error.message
        });
    }
};

// ===========================================
// ELIMINAR REGISTROS ANTIGUOS (LIMPIEZA)
// ===========================================
const limpiarHistorial = async (req, res) => {
    try {
        const { dias } = req.body;

        if (!dias || dias < 30) {
            return res.status(400).json({
                error: 'Parámetro inválido',
                mensaje: 'Debe especificar un mínimo de 30 días'
            });
        }

        // Eliminar registros más antiguos que X días
        const [resultado] = await db.query(
            'DELETE FROM HistorialAccesos WHERE fecha < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [dias]
        );

        res.json({
            mensaje: `Limpieza completada. Se eliminaron ${resultado.affectedRows} registro(s)`,
            registros_eliminados: resultado.affectedRows
        });

    } catch (error) {
        console.error('Error al limpiar historial:', error);
        res.status(500).json({
            error: 'Error al limpiar historial',
            mensaje: error.message
        });
    }
};

module.exports = {
    listarHistorial,
    obtenerHistorialPorUsuario,
    obtenerRegistro,
    registrarAcceso,
    obtenerEstadisticas,
    limpiarHistorial
};