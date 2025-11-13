const db = require('../config/database');

// ===========================================
// LISTAR TODOS LOS CLIENTES
// ===========================================
const listarClientes = async (req, res) => {
    try {
        const [clientes] = await db.query(
            'SELECT * FROM Clientes ORDER BY nombre ASC'
        );

        res.json({
            total: clientes.length,
            clientes: clientes
        });

    } catch (error) {
        console.error('Error al listar clientes:', error);
        res.status(500).json({
            error: 'Error al listar clientes',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER UN CLIENTE POR ID
// ===========================================
const obtenerCliente = async (req, res) => {
    try {
        const { id } = req.params;

        const [clientes] = await db.query(
            'SELECT * FROM Clientes WHERE id = ?',
            [id]
        );

        if (clientes.length === 0) {
            return res.status(404).json({
                error: 'Cliente no encontrado',
                mensaje: `No existe un cliente con el ID ${id}`
            });
        }

        res.json({
            cliente: clientes[0]
        });

    } catch (error) {
        console.error('Error al obtener cliente:', error);
        res.status(500).json({
            error: 'Error al obtener cliente',
            mensaje: error.message
        });
    }
};

// ===========================================
// CREAR NUEVO CLIENTE
// ===========================================
const crearCliente = async (req, res) => {
    try {
        const { nombre, telefono, correo, nit } = req.body;

        // Validar campos requeridos
        if (!nombre) {
            return res.status(400).json({
                error: 'Campo requerido',
                mensaje: 'El nombre es obligatorio'
            });
        }

        // Insertar cliente
        const [resultado] = await db.query(
            'INSERT INTO Clientes (nombre, telefono, correo, nit) VALUES (?, ?, ?, ?)',
            [nombre, telefono, correo, nit]
        );

        // Obtener el cliente creado
        const [nuevoCliente] = await db.query(
            'SELECT * FROM Clientes WHERE id = ?',
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Cliente creado exitosamente',
            cliente: nuevoCliente[0]
        });

    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).json({
            error: 'Error al crear cliente',
            mensaje: error.message
        });
    }
};

// ===========================================
// ACTUALIZAR CLIENTE
// ===========================================
const actualizarCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, telefono, correo, nit } = req.body;

        // Verificar si el cliente existe
        const [clienteExiste] = await db.query(
            'SELECT id FROM Clientes WHERE id = ?',
            [id]
        );

        if (clienteExiste.length === 0) {
            return res.status(404).json({
                error: 'Cliente no encontrado',
                mensaje: `No existe un cliente con el ID ${id}`
            });
        }

        // Actualizar cliente
        await db.query(
            'UPDATE Clientes SET nombre = ?, telefono = ?, correo = ?, nit = ? WHERE id = ?',
            [nombre, telefono, correo, nit, id]
        );

        // Obtener el cliente actualizado
        const [clienteActualizado] = await db.query(
            'SELECT * FROM Clientes WHERE id = ?',
            [id]
        );

        res.json({
            mensaje: 'Cliente actualizado exitosamente',
            cliente: clienteActualizado[0]
        });

    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({
            error: 'Error al actualizar cliente',
            mensaje: error.message
        });
    }
};

// ===========================================
// ELIMINAR CLIENTE
// ===========================================
const eliminarCliente = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el cliente existe
        const [clienteExiste] = await db.query(
            'SELECT id FROM Clientes WHERE id = ?',
            [id]
        );

        if (clienteExiste.length === 0) {
            return res.status(404).json({
                error: 'Cliente no encontrado',
                mensaje: `No existe un cliente con el ID ${id}`
            });
        }

        // Verificar si tiene vehículos asociados
        const [vehiculos] = await db.query(
            'SELECT COUNT(*) as total FROM Vehiculos WHERE cliente_id = ?',
            [id]
        );

        if (vehiculos[0].total > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar',
                mensaje: 'El cliente tiene vehículos asociados. Elimina primero los vehículos.'
            });
        }

        // Eliminar cliente
        await db.query('DELETE FROM Clientes WHERE id = ?', [id]);

        res.json({
            mensaje: 'Cliente eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        res.status(500).json({
            error: 'Error al eliminar cliente',
            mensaje: error.message
        });
    }
};

module.exports = {
    listarClientes,
    obtenerCliente,
    crearCliente,
    actualizarCliente,
    eliminarCliente
};