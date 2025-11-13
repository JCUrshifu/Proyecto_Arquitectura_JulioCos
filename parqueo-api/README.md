# API Sistema de Parqueo - Juliocos

API RESTful para la gestión de un sistema de parqueo desarrollada con Node.js, Express y MySQL.

## Descripción

Sistema completo de gestión de parqueo que permite:
- Control de entrada y salida de vehículos
- Gestión de espacios y zonas
- Sistema de pagos y tarifas
- Reservas de espacios
- Autenticación con JWT
- Gestión de usuarios y roles

## Tecnologías Utilizadas

- **Backend:** Node.js + Express
- **Base de Datos:** MySQL
- **Autenticación:** JWT (JSON Web Tokens)
- **Arquitectura:** Por Capas

## Instalación

## Prerrequisitos
- Node.js (v14 o superior)
- MySQL (v8 o superior)
- Git

### Pasos de instalación

1. Clonar el repositorio:
```bash
git clone [URL_DE_TU_REPO]
cd parqueo-api
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
   - Copiar `.env.example` a `.env`
   - Configurar credenciales de MySQL
   - Configurar JWT_SECRET

4. Crear la base de datos:
```bash
mysql -u root -p < database/schema.sql
```

5. Iniciar el servidor:
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🚀 Endpoints Disponibles

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/perfil` - Obtener perfil (requiere token)

### Usuarios
- `GET /api/usuarios` - Listar usuarios
- `POST /api/usuarios` - Crear usuario
- `PUT /api/usuarios/:id` - Actualizar usuario
- `DELETE /api/usuarios/:id` - Eliminar usuario

_(Más endpoints por documentar)_

## Uso con Postman

1. Importar la colección de Postman
2. Configurar variable de entorno `base_url` = `http://localhost:3000`
3. Hacer login y copiar el token
4. Agregar token en headers: `Authorization: Bearer [TOKEN]`

## Autor

- **Nombre:** [Tu Nombre]
- **Universidad:** Mesoamericana
- **Curso:** Arquitectura de Sistemas I
- **Profesor:** Ing. Arturo Monterroso

Este proyecto es parte de un proyecto académico.