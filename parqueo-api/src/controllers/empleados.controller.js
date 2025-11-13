const db = require('../config/database');

// ===========================================
// LISTAR TODOS LOS EMPLEADOS
// ===========================================
const listarEmpleados = async (req, res) => {
    try {
        const [empleados] = await db.query(
            `SELECT e.*, 
                    u.nombre as usuario_nombre, 
                    u.correo as usuario_correo,
                    u.activo as usuario_activo,
                    r.nombre as rol_nombre,
                    t.descripcion as turno_descripcion,
                    t.hora_inicio,
                    t.hora_fin
             FROM Empleados e
             LEFT JOIN Usuarios u ON e.usuario_id = u.id
             LEFT JOIN Roles r ON u.rol_id = r.id
             LEFT JOIN Turnos t ON e.turno_id = t.id
             ORDER BY u.nombre ASC`
        );

        res.json({
            total: empleados.length,
            empleados: empleados
        });

    } catch (error) {
        console.error('Error al listar empleados:', error);
        res.status(500).json({
            error: 'Error al listar empleados',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER UN EMPLEADO POR ID
// ===========================================
const obtenerEmpleado = async (req, res) => {
    try {
        const { id } = req.params;

        const [empleados] = await db.query(
            `SELECT e.*, 
                    u.nombre as usuario_nombre, 
                    u.correo as usuario_correo,
                    u.activo as usuario_activo,
                    r.nombre as rol_nombre,
                    t.descripcion as turno_descripcion,
                    t.hora_inicio,
                    t.hora_fin
             FROM Empleados e
             LEFT JOIN Usuarios u ON e.usuario_id = u.id
             LEFT JOIN Roles r ON u.rol_id = r.id
             LEFT JOIN Turnos t ON e.turno_id = t.id
             WHERE e.id = ?`,
            [id]
        );

        if (empleados.length === 0) {
            return res.status(404).json({
                error: 'Empleado no encontrado',
                mensaje: `No existe un empleado con el ID ${id}`
            });
        }

        res.json({
            empleado: empleados[0]
        });

    } catch (error) {
        console.error('Error al obtener empleado:', error);
        res.status(500).json({
            error: 'Error al obtener empleado',
            mensaje: error.message
        });
    }
};

// ===========================================
// CREAR NUEVO EMPLEADO
// ===========================================
const crearEmpleado = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { usuario_id, turno_id, telefono, direccion, dpi } = req.body;

        // Validar campos requeridos
        if (!usuario_id || !dpi) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Campos requeridos',
                mensaje: 'Usuario ID y DPI son obligatorios'
            });
        }

        // Verificar que el usuario existe
        const [usuario] = await connection.query(
            'SELECT id FROM Usuarios WHERE id = ?',
            [usuario_id]
        );

        if (usuario.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Usuario no encontrado',
                mensaje: `No existe un usuario con el ID ${usuario_id}`
            });
        }

        // Verificar que el usuario no está ya asignado como empleado
        const [empleadoExiste] = await connection.query(
            'SELECT id FROM Empleados WHERE usuario_id = ?',
            [usuario_id]
        );

        if (empleadoExiste.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                error: 'Usuario ya es empleado',
                mensaje: 'Este usuario ya tiene un registro de empleado'
            });
        }

        // Verificar que el DPI no existe
        const [dpiExiste] = await connection.query(
            'SELECT id FROM Empleados WHERE dpi = ?',
            [dpi]
        );

        if (dpiExiste.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                error: 'DPI duplicado',
                mensaje: `Ya existe un empleado con el DPI ${dpi}`
            });
        }

        // Si se especifica turno, verificar que existe
        if (turno_id) {
            const [turno] = await connection.query(
                'SELECT id FROM Turnos WHERE id = ?',
                [turno_id]
            );

            if (turno.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    error: 'Turno no encontrado',
                    mensaje: `No existe un turno con el ID ${turno_id}`
                });
            }
        }

        // Insertar empleado (solo campos que existen en la BD)
        const [resultado] = await connection.query(
            `INSERT INTO Empleados (usuario_id, turno_id, telefono, direccion, dpi) 
             VALUES (?, ?, ?, ?, ?)`,
            [usuario_id, turno_id, telefono, direccion, dpi]
        );

        await connection.commit();

        // Obtener el empleado creado
        const [nuevoEmpleado] = await db.query(
            `SELECT e.*, 
                    u.nombre as usuario_nombre, 
                    u.correo as usuario_correo,
                    r.nombre as rol_nombre,
                    t.descripcion as turno_descripcion
             FROM Empleados e
             LEFT JOIN Usuarios u ON e.usuario_id = u.id
             LEFT JOIN Roles r ON u.rol_id = r.id
             LEFT JOIN Turnos t ON e.turno_id = t.id
             WHERE e.id = ?`,
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Empleado creado exitosamente',
            empleado: nuevoEmpleado[0]
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al crear empleado:', error);
        res.status(500).json({
            error: 'Error al crear empleado',
            mensaje: error.message
        });
    } finally {
        connection.release();
    }
};

// ===========================================
// ACTUALIZAR EMPLEADO
// ===========================================
const actualizarEmpleado = async (req, res) => {
    try {
        const { id } = req.params;
        const { turno_id, telefono, direccion, dpi } = req.body;

        // Verificar si el empleado existe
        const [empleadoExiste] = await db.query(
            'SELECT id FROM Empleados WHERE id = ?',
            [id]
        );

        if (empleadoExiste.length === 0) {
            return res.status(404).json({
                error: 'Empleado no encontrado',
                mensaje: `No existe un empleado con el ID ${id}`
            });
        }

        // Actualizar empleado (solo campos que existen)
        await db.query(
            `UPDATE Empleados 
             SET turno_id = ?, telefono = ?, direccion = ?, dpi = ?
             WHERE id = ?`,
            [turno_id, telefono, direccion, dpi, id]
        );

        // Obtener el empleado actualizado
        const [empleadoActualizado] = await db.query(
            `SELECT e.*, 
                    u.nombre as usuario_nombre, 
                    u.correo as usuario_correo,
                    r.nombre as rol_nombre,
                    t.descripcion as turno_descripcion
             FROM Empleados e
             LEFT JOIN Usuarios u ON e.usuario_id = u.id
             LEFT JOIN Roles r ON u.rol_id = r.id
             LEFT JOIN Turnos t ON e.turno_id = t.id
             WHERE e.id = ?`,
            [id]
        );

        res.json({
            mensaje: 'Empleado actualizado exitosamente',
            empleado: empleadoActualizado[0]
        });

    } catch (error) {
        console.error('Error al actualizar empleado:', error);
        res.status(500).json({
            error: 'Error al actualizar empleado',
            mensaje: error.message
        });
    }
};

// ===========================================
// CAMBIAR ESTADO DEL USUARIO (no del empleado)
// ===========================================
const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        // Obtener usuario_id del empleado
        const [empleado] = await db.query(
            'SELECT usuario_id FROM Empleados WHERE id = ?',
            [id]
        );

        if (empleado.length === 0) {
            return res.status(404).json({
                error: 'Empleado no encontrado'
            });
        }

        // Cambiar estado del usuario asociado
        await db.query(
            'UPDATE Usuarios SET activo = ? WHERE id = ?',
            [activo, empleado[0].usuario_id]
        );

        const [empleadoActualizado] = await db.query(
            `SELECT e.*, u.activo as usuario_activo, u.nombre as usuario_nombre
             FROM Empleados e
             LEFT JOIN Usuarios u ON e.usuario_id = u.id
             WHERE e.id = ?`,
            [id]
        );

        res.json({
            mensaje: `Empleado ${activo ? 'activado' : 'desactivado'} exitosamente`,
            empleado: empleadoActualizado[0]
        });

    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(500).json({
            error: 'Error al cambiar estado',
            mensaje: error.message
        });
    }
};

// ===========================================
// ELIMINAR EMPLEADO
// ===========================================
const eliminarEmpleado = async (req, res) => {
    try {
        const { id } = req.params;

        const [empleadoExiste] = await db.query(
            'SELECT id FROM Empleados WHERE id = ?',
            [id]
        );

        if (empleadoExiste.length === 0) {
            return res.status(404).json({
                error: 'Empleado no encontrado'
            });
        }

        // Verificar si tiene tickets asociados
        const [tickets] = await db.query(
            'SELECT COUNT(*) as total FROM Tickets WHERE empleado_id = ?',
            [id]
        );

        if (tickets[0].total > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar',
                mensaje: 'El empleado tiene tickets asociados. Considere desactivar su usuario en lugar de eliminarlo.'
            });
        }

        await db.query('DELETE FROM Empleados WHERE id = ?', [id]);

        res.json({
            mensaje: 'Empleado eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar empleado:', error);
        res.status(500).json({
            error: 'Error al eliminar empleado',
            mensaje: error.message
        });
    }
};

module.exports = {
    listarEmpleados,
    obtenerEmpleado,
    crearEmpleado,
    actualizarEmpleado,
    cambiarEstado,
    eliminarEmpleado
};