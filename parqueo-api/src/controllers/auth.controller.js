const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// REGISTRAR NUEVO USUARIO
const registrar = async (req, res) => {
    try {
        const { nombre, correo, password, rol_id } = req.body;

        // Validar campos requeridos
        if (!nombre || !correo || !password) {
            return res.status(400).json({
                error: 'Campos incompletos',
                mensaje: 'Nombre, correo y password son obligatorios'
            });
        }

        // Verificar si el correo ya existe
        const [usuarios] = await db.query(
            'SELECT id FROM Usuarios WHERE correo = ?',
            [correo]
        );

        if (usuarios.length > 0) {
            return res.status(409).json({
                error: 'Correo ya registrado',
                mensaje: 'Ya existe un usuario con este correo electrónico'
            });
        }

        // Encriptar password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insertar usuario
        const [resultado] = await db.query(
            'INSERT INTO Usuarios (nombre, correo, password, rol_id, activo) VALUES (?, ?, ?, ?, ?)',
            [nombre, correo, passwordHash, rol_id || 1, true]
        );

        // Obtener el usuario creado
        const [nuevoUsuario] = await db.query(
            `SELECT u.id, u.nombre, u.correo, u.activo, r.nombre as rol
             FROM Usuarios u
             LEFT JOIN Roles r ON u.rol_id = r.id
             WHERE u.id = ?`,
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            usuario: nuevoUsuario[0]
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            error: 'Error al registrar usuario',
            mensaje: error.message
        });
    }
};

// LOGIN - INICIAR SESIÓN
const login = async (req, res) => {
    try {
        const { correo, password } = req.body;

        // Validar campos
        if (!correo || !password) {
            return res.status(400).json({
                error: 'Campos incompletos',
                mensaje: 'Correo y password son obligatorios'
            });
        }

        // Buscar usuario por correo
        const [usuarios] = await db.query(
            `SELECT u.id, u.nombre, u.correo, u.password, u.activo, r.nombre as rol
             FROM Usuarios u
             LEFT JOIN Roles r ON u.rol_id = r.id
             WHERE u.correo = ?`,
            [correo]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                error: 'Credenciales inválidas',
                mensaje: 'Correo o contraseña incorrectos'
            });
        }

        const usuario = usuarios[0];

        // Verificar si el usuario está activo
        if (!usuario.activo) {
            return res.status(403).json({
                error: 'Usuario inactivo',
                mensaje: 'Tu cuenta ha sido desactivada. Contacta al administrador'
            });
        }

        // Verificar password
        const passwordValido = await bcrypt.compare(password, usuario.password);

        if (!passwordValido) {
            return res.status(401).json({
                error: 'Credenciales inválidas',
                mensaje: 'Correo o contraseña incorrectos'
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Registrar acceso en historial
        await db.query(
            'INSERT INTO HistorialAccesos (usuario_id, accion) VALUES (?, ?)',
            [usuario.id, 'LOGIN']
        );

        res.json({
            mensaje: 'Login exitoso',
            token: token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            error: 'Error al iniciar sesión',
            mensaje: error.message
        });
    }
};

// OBTENER PERFIL DEL USUARIO AUTENTICADO
const obtenerPerfil = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const [usuarios] = await db.query(
            `SELECT u.id, u.nombre, u.correo, u.activo, u.fecha_creacion, r.nombre as rol
             FROM Usuarios u
             LEFT JOIN Roles r ON u.rol_id = r.id
             WHERE u.id = ?`,
            [usuarioId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            usuario: usuarios[0]
        });

    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({
            error: 'Error al obtener perfil',
            mensaje: error.message
        });
    }
};

// LOGOUT - CERRAR SESIÓN
const logout = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        // Registrar logout en historial
        await db.query(
            'INSERT INTO HistorialAccesos (usuario_id, accion) VALUES (?, ?)',
            [usuarioId, 'LOGOUT']
        );

        res.json({
            mensaje: 'Sesión cerrada exitosamente'
        });

    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({
            error: 'Error al cerrar sesión',
            mensaje: error.message
        });
    }
};

module.exports = {
    registrar,
    login,
    obtenerPerfil,
    logout
};