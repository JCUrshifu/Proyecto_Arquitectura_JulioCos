const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ===========================================
// MIDDLEWARES
// ===========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===========================================
// IMPORTAR RUTAS
// ===========================================
const authRoutes = require('./src/routes/auth.routes');
const clientesRoutes = require('./src/routes/clientes.routes');
const vehiculosRoutes = require('./src/routes/vehiculos.routes');
const espaciosRoutes = require('./src/routes/espacios.routes');
const zonasRoutes = require('./src/routes/zonas.routes');
const ticketsRoutes = require('./src/routes/tickets.routes');
const empleadosRoutes = require('./src/routes/empleados.routes');
const tarifasRoutes = require('./src/routes/tarifas.routes');
const turnosRoutes = require('./src/routes/turnos.routes');      
const pagosRoutes = require('./src/routes/pagos.routes');
const multasRoutes = require('./src/routes/multas.routes');
const reservasRoutes = require('./src/routes/reservas.routes');
const rolesRoutes = require('./src/routes/roles.routes');
const tiposPagoRoutes = require('./src/routes/tipospago.routes');
const historialRoutes = require('./src/routes/historialaccesos.routes');

// ===========================================
// RUTA PRINCIPAL
// ===========================================
app.get('/', (req, res) => {
    res.json({
        mensaje: 'API Sistema de Parqueo - Juliocos',
        version: '1.0.0',
        estado: 'Activo',
        fecha: new Date().toLocaleString('es-GT'),
        endpoints: {
            auth: '/api/auth',
            empleados: '/api/empleados',
            clientes: '/api/clientes',
            vehiculos: '/api/vehiculos',
            espacios: '/api/espacios',
            zonas: '/api/zonas',
            tickets: '/api/tickets',
            pagos: '/api/pagos',
            tarifas: '/api/tarifas',
            turnos: '/api/turnos',
            multas: '/api/multas',
            reservas: '/api/reservas',
            roles: '/api/roles',
            tipospago: '/api/tipospago',
            historial: '/api/historial'
        }
    });
});

// ===========================================
// USAR RUTAS
// ===========================================
app.use('/api/auth', authRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/espacios', espaciosRoutes);
app.use('/api/zonas', zonasRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/tarifas', tarifasRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/multas', multasRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/tipospago', tiposPagoRoutes);
app.use('/api/historial', historialRoutes);

// ===========================================
// MANEJO DE RUTAS NO ENCONTRADAS
// ===========================================
app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        ruta: req.originalUrl,
        metodo: req.method
    });
});

// ===========================================
// MANEJO DE ERRORES GLOBAL
// ===========================================
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        mensaje: process.env.NODE_ENV === 'development' ? err.message : 'Ha ocurrido un error'
    });
});

// ===========================================
// INICIAR SERVIDOR
// ===========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
   API PARQUEO JULIOCOS - INICIADA
   Puerto: ${PORT}                    
   Entorno: ${process.env.NODE_ENV || 'development'}       
   URL: http://localhost:${PORT}      

    `);
});

module.exports = app;