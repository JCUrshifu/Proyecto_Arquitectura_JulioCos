const db = require('../config/database');

// ===========================================
// LISTAR TODOS LOS ROLES
// ===========================================
const listarRoles = async (req, res) => {
    try {
        const [roles] = await db.query(
            `SELECT r.*, 
                    COUNT(u.id) as total_usuarios
             FROM Roles r
             LEFT JOIN Usuarios u ON r.id = u.rol_id
             GROUP BY r.id
             ORDER BY r.nombre ASC`
        );

        res.json({
            total: roles.length,
            roles: roles
        });

    } catch (error) {
        console.error('Error al listar roles:', error);
        res.status(500).json({
            error: 'Error al listar roles',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER UN ROL POR ID
// ===========================================
const obtenerRol = async (req, res) => {
    try {
        const { id } = req.params;

        const [roles] = await db.query(
            `SELECT r.*, 
                    COUNT(u.id) as total_usuarios
             FROM Roles r
             LEFT JOIN Usuarios u ON r.id = u.rol_id
             WHERE r.id = ?
             GROUP BY r.id`,
            [id]
        );

        if (roles.length === 0) {
            return res.status(404).json({
                error: 'Rol no encontrado',
                mensaje: `No existe un rol con el ID ${id}`
            });
        }

        // Obtener usuarios con este rol
        const [usuarios] = await db.query(
            `SELECT id, nombre, correo, activo, fecha_creacion
             FROM Usuarios
             WHERE rol_id = ?
             ORDER BY nombre ASC`,
            [id]
        );

        res.json({
            rol: {
                ...roles[0],
                usuarios: usuarios
            }
        });

    } catch (error) {
        console.error('Error al obtener rol:', error);
        res.status(500).json({
            error: 'Error al obtener rol',
            mensaje: error.message
        });
    }
};

// ===========================================
// CREAR NUEVO ROL
// ===========================================
const crearRol = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;

        // Validar campo requerido
        if (!nombre) {
            return res.status(400).json({
                error: 'Campo requerido',
                mensaje: 'El nombre del rol es obligatorio'
            });
        }

        // Verificar que el nombre no exista
        const [rolExiste] = await db.query(
            'SELECT id FROM Roles WHERE nombre = ?',
            [nombre]
        );

        if (rolExiste.length > 0) {
            return res.status(409).json({
                error: 'Rol ya existe',
                mensaje: `Ya existe un rol con el nombre: ${nombre}`
            });
        }

        // Insertar rol
        const [resultado] = await db.query(
            'INSERT INTO Roles (nombre, descripcion) VALUES (?, ?)',
            [nombre, descripcion]
        );

        // Obtener el rol creado
        const [nuevoRol] = await db.query(
            'SELECT * FROM Roles WHERE id = ?',
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Rol creado exitosamente',
            rol: nuevoRol[0]
        });

    } catch (error) {
        console.error('Error al crear rol:', error);
        res.status(500).json({
            error: 'Error al crear rol',
            mensaje: error.message
        });
    }
};

// ===========================================
// ACTUALIZAR ROL
// ===========================================
const actualizarRol = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;

        // Verificar si el rol existe
        const [rolExiste] = await db.query(
            'SELECT id, nombre FROM Roles WHERE id = ?',
            [id]
        );

        if (rolExiste.length === 0) {
            return res.status(404).json({
                error: 'Rol no encontrado',
                mensaje: `No existe un rol con el ID ${id}`
            });
        }

        // Verificar que no exista otro rol con el mismo nombre
        if (nombre && nombre !== rolExiste[0].nombre) {
            const [nombreExiste] = await db.query(
                'SELECT id FROM Roles WHERE nombre = ? AND id != ?',
                [nombre, id]
            );

            if (nombreExiste.length > 0) {
                return res.status(409).json({
                    error: 'Nombre duplicado',
                    mensaje: `Ya existe otro rol con el nombre: ${nombre}`
                });
            }
        }

        // Actualizar rol
        await db.query(
            'UPDATE Roles SET nombre = ?, descripcion = ? WHERE id = ?',
            [nombre || rolExiste[0].nombre, descripcion, id]
        );

        // Obtener el rol actualizado
        const [rolActualizado] = await db.query(
            'SELECT * FROM Roles WHERE id = ?',
            [id]
        );

        res.json({
            mensaje: 'Rol actualizado exitosamente',
            rol: rolActualizado[0]
        });

    } catch (error) {
        console.error('Error al actualizar rol:', error);
        res.status(500).json({
            error: 'Error al actualizar rol',
            mensaje: error.message
        });
    }
};

// ===========================================
// ELIMINAR ROL
// ===========================================
const eliminarRol = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el rol existe
        const [rolExiste] = await db.query(
            'SELECT id, nombre FROM Roles WHERE id = ?',
            [id]
        );

        if (rolExiste.length === 0) {
            return res.status(404).json({
                error: 'Rol no encontrado',
                mensaje: `No existe un rol con el ID ${id}`
            });
        }

        // No permitir eliminar roles de sistema (Admin, Usuario)
        const rolesSistema = ['ADMIN', 'ADMINISTRADOR', 'USUARIO', 'EMPLEADO'];
        if (rolesSistema.includes(rolExiste[0].nombre.toUpperCase())) {
            return res.status(403).json({
                error: 'No se puede eliminar',
                mensaje: 'No se pueden eliminar roles del sistema'
            });
        }

        // Verificar si tiene usuarios asignados
        const [usuarios] = await db.query(
            'SELECT COUNT(*) as total FROM Usuarios WHERE rol_id = ?',
            [id]
        );

        if (usuarios[0].total > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar',
                mensaje: `El rol tiene ${usuarios[0].total} usuario(s) asignado(s). Reasigne los usuarios antes de eliminar el rol.`
            });
        }

        // Eliminar rol
        await db.query('DELETE FROM Roles WHERE id = ?', [id]);

        res.json({
            mensaje: 'Rol eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar rol:', error);
        res.status(500).json({
            error: 'Error al eliminar rol',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER PERMISOS DE UN ROL (Opcional - para futuras implementaciones)
// ===========================================
const obtenerPermisos = async (req, res) => {
    try {
        const { id } = req.params;

        const [rolExiste] = await db.query(
            'SELECT id, nombre FROM Roles WHERE id = ?',
            [id]
        );

        if (rolExiste.length === 0) {
            return res.status(404).json({
                error: 'Rol no encontrado'
            });
        }

        // Definir permisos según el rol
        const permisos = {
            'ADMIN': {
                clientes: ['crear', 'leer', 'actualizar', 'eliminar'],
                vehiculos: ['crear', 'leer', 'actualizar', 'eliminar'],
                empleados: ['crear', 'leer', 'actualizar', 'eliminar'],
                tickets: ['crear', 'leer', 'actualizar', 'eliminar'],
                pagos: ['crear', 'leer', 'reporte'],
                tarifas: ['crear', 'leer', 'actualizar', 'eliminar'],
                espacios: ['crear', 'leer', 'actualizar', 'eliminar'],
                multas: ['crear', 'leer', 'actualizar', 'eliminar'],
                reservas: ['crear', 'leer', 'actualizar', 'eliminar'],
                reportes: ['acceso_completo']
            },
            'EMPLEADO': {
                clientes: ['crear', 'leer', 'actualizar'],
                vehiculos: ['crear', 'leer', 'actualizar'],
                tickets: ['crear', 'leer', 'actualizar'],
                pagos: ['crear', 'leer'],
                espacios: ['leer'],
                multas: ['crear', 'leer'],
                reservas: ['leer']
            },
            'USUARIO': {
                tickets: ['leer'],
                vehiculos: ['leer'],
                reservas: ['crear', 'leer']
            }
        };

        const nombreRol = rolExiste[0].nombre.toUpperCase();
        const permisosRol = permisos[nombreRol] || {};

        res.json({
            rol: rolExiste[0],
            permisos: permisosRol
        });

    } catch (error) {
        console.error('Error al obtener permisos:', error);
        res.status(500).json({
            error: 'Error al obtener permisos',
            mensaje: error.message
        });
    }
};

module.exports = {
    listarRoles,
    obtenerRol,
    crearRol,
    actualizarRol,
    eliminarRol,
    obtenerPermisos
};