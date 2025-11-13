const db = require('../config/database');

// ===========================================
// LISTAR TODOS LOS VEHÍCULOS
// ===========================================
const listarVehiculos = async (req, res) => {
    try {
        const [vehiculos] = await db.query(
            `SELECT v.*, c.nombre as cliente_nombre
             FROM Vehiculos v
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             ORDER BY v.placa ASC`
        );

        res.json({
            total: vehiculos.length,
            vehiculos: vehiculos
        });

    } catch (error) {
        console.error('Error al listar vehículos:', error);
        res.status(500).json({
            error: 'Error al listar vehículos',
            mensaje: error.message
        });
    }
};

// ===========================================
// OBTENER UN VEHÍCULO POR ID
// ===========================================
const obtenerVehiculo = async (req, res) => {
    try {
        const { id } = req.params;

        const [vehiculos] = await db.query(
            `SELECT v.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono
             FROM Vehiculos v
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             WHERE v.id = ?`,
            [id]
        );

        if (vehiculos.length === 0) {
            return res.status(404).json({
                error: 'Vehículo no encontrado'
            });
        }

        res.json({
            vehiculo: vehiculos[0]
        });

    } catch (error) {
        console.error('Error al obtener vehículo:', error);
        res.status(500).json({
            error: 'Error al obtener vehículo',
            mensaje: error.message
        });
    }
};

// ===========================================
// BUSCAR VEHÍCULO POR PLACA
// ===========================================
const buscarPorPlaca = async (req, res) => {
    try {
        const { placa } = req.params;

        const [vehiculos] = await db.query(
            `SELECT v.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono
             FROM Vehiculos v
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             WHERE v.placa = ?`,
            [placa]
        );

        if (vehiculos.length === 0) {
            return res.status(404).json({
                error: 'Vehículo no encontrado',
                mensaje: `No existe un vehículo con la placa ${placa}`
            });
        }

        res.json({
            vehiculo: vehiculos[0]
        });

    } catch (error) {
        console.error('Error al buscar vehículo:', error);
        res.status(500).json({
            error: 'Error al buscar vehículo',
            mensaje: error.message
        });
    }
};

// ===========================================
// CREAR NUEVO VEHÍCULO
// ===========================================
const crearVehiculo = async (req, res) => {
    try {
        const { cliente_id, placa, marca, modelo, color } = req.body;

        // Validar campos requeridos
        if (!cliente_id || !placa) {
            return res.status(400).json({
                error: 'Campos requeridos',
                mensaje: 'Cliente ID y placa son obligatorios'
            });
        }

        // Verificar que el cliente existe
        const [cliente] = await db.query(
            'SELECT id FROM Clientes WHERE id = ?',
            [cliente_id]
        );

        if (cliente.length === 0) {
            return res.status(404).json({
                error: 'Cliente no encontrado',
                mensaje: `No existe un cliente con el ID ${cliente_id}`
            });
        }

        // Verificar que la placa no existe
        const [placaExiste] = await db.query(
            'SELECT id FROM Vehiculos WHERE placa = ?',
            [placa]
        );

        if (placaExiste.length > 0) {
            return res.status(409).json({
                error: 'Placa duplicada',
                mensaje: `Ya existe un vehículo con la placa ${placa}`
            });
        }

        // Insertar vehículo
        const [resultado] = await db.query(
            'INSERT INTO Vehiculos (cliente_id, placa, marca, modelo, color) VALUES (?, ?, ?, ?, ?)',
            [cliente_id, placa.toUpperCase(), marca, modelo, color]
        );

        // Obtener el vehículo creado
        const [nuevoVehiculo] = await db.query(
            `SELECT v.*, c.nombre as cliente_nombre
             FROM Vehiculos v
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             WHERE v.id = ?`,
            [resultado.insertId]
        );

        res.status(201).json({
            mensaje: 'Vehículo creado exitosamente',
            vehiculo: nuevoVehiculo[0]
        });

    } catch (error) {
        console.error('Error al crear vehículo:', error);
        res.status(500).json({
            error: 'Error al crear vehículo',
            mensaje: error.message
        });
    }
};

// ===========================================
// ACTUALIZAR VEHÍCULO
// ===========================================
const actualizarVehiculo = async (req, res) => {
    try {
        const { id } = req.params;
        const { cliente_id, placa, marca, modelo, color } = req.body;

        // Verificar si el vehículo existe
        const [vehiculoExiste] = await db.query(
            'SELECT id FROM Vehiculos WHERE id = ?',
            [id]
        );

        if (vehiculoExiste.length === 0) {
            return res.status(404).json({
                error: 'Vehículo no encontrado'
            });
        }

        // Actualizar vehículo
        await db.query(
            'UPDATE Vehiculos SET cliente_id = ?, placa = ?, marca = ?, modelo = ?, color = ? WHERE id = ?',
            [cliente_id, placa?.toUpperCase(), marca, modelo, color, id]
        );

        // Obtener el vehículo actualizado
        const [vehiculoActualizado] = await db.query(
            `SELECT v.*, c.nombre as cliente_nombre
             FROM Vehiculos v
             LEFT JOIN Clientes c ON v.cliente_id = c.id
             WHERE v.id = ?`,
            [id]
        );

        res.json({
            mensaje: 'Vehículo actualizado exitosamente',
            vehiculo: vehiculoActualizado[0]
        });

    } catch (error) {
        console.error('Error al actualizar vehículo:', error);
        res.status(500).json({
            error: 'Error al actualizar vehículo',
            mensaje: error.message
        });
    }
};

// ===========================================
// ELIMINAR VEHÍCULO
// ===========================================
const eliminarVehiculo = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el vehículo existe
        const [vehiculoExiste] = await db.query(
            'SELECT id FROM Vehiculos WHERE id = ?',
            [id]
        );

        if (vehiculoExiste.length === 0) {
            return res.status(404).json({
                error: 'Vehículo no encontrado'
            });
        }

        // Verificar si tiene tickets asociados
        const [tickets] = await db.query(
            'SELECT COUNT(*) as total FROM Tickets WHERE vehiculo_id = ?',
            [id]
        );

        if (tickets[0].total > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar',
                mensaje: 'El vehículo tiene tickets asociados'
            });
        }

        // Eliminar vehículo
        await db.query('DELETE FROM Vehiculos WHERE id = ?', [id]);

        res.json({
            mensaje: 'Vehículo eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar vehículo:', error);
        res.status(500).json({
            error: 'Error al eliminar vehículo',
            mensaje: error.message
        });
    }
};

module.exports = {
    listarVehiculos,
    obtenerVehiculo,
    buscarPorPlaca,
    crearVehiculo,
    actualizarVehiculo,
    eliminarVehiculo
};