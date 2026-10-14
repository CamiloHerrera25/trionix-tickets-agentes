# Trionix Tickets: Sistema de Soporte con Agentes

**Estudiante:** Camilo Herrera
**Curso:** Desarrollo Web Backend · Node.js — Parcial Segundo Corte
**Docente:** Rafael Pérez Meriño

API REST en Express para gestionar tickets de soporte técnico de Trionix Labs y los agentes que los atienden. Permite crear, listar, actualizar y eliminar tickets y agentes, agregar comentarios a un ticket, y asignar un agente a un ticket validando que ambos existan y que el agente esté activo. Los datos viven en MongoDB (Atlas en producción), modelados con Mongoose, con los tickets relacionados a los agentes mediante una referencia (`ObjectId` + `populate`). Incluye un frontend estático que consume la API con `fetch`, sin recargar la página.

## Tecnologías

- Node.js + Express
- MongoDB + Mongoose (colecciones `tickets` y `agentes`)
- Joi (validación de entrada)
- HTML + CSS + JavaScript puro (frontend, servido con `express.static`)

## Cómo correrlo localmente

1. Clona el repositorio e instala las dependencias:
   ```bash
   npm install
   ```

2. Crea tu archivo `.env` a partir de `.env.example` y coloca tu propia cadena de conexión de MongoDB:
   ```bash
   cp .env.example .env
   ```
   Edita `.env` y reemplaza `MONGODB_URI` con tu cadena real (local o de MongoDB Atlas).

3. (Opcional pero recomendado) Pobla la base de datos con datos de prueba:
   ```bash
   npm run seed
   ```

4. Levanta el servidor:
   ```bash
   npm start
   ```

5. Abre `http://localhost:8080` en el navegador (o el puerto que hayas definido en `.env`).

## URL pública donde queda desplegado

> _(completar con la URL real una vez desplegado, por ejemplo en Render o Railway)_
> `https://________________.onrender.com`

## Variables de entorno necesarias

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | Cadena de conexión a la base de datos MongoDB (local o Atlas). **Nunca se sube al repositorio.** |
| `PORT` | Puerto en el que corre el servidor Express (por defecto 8080). |

Ver `.env.example` para el formato exacto (sin valores reales).

## Estructura del proyecto

```
trionix-tickets-agentes/
├── public/              # Frontend estático (HTML/CSS/JS)
├── models/
│   ├── Ticket.js         # Esquema y modelo de Mongoose
│   └── Agente.js         # Esquema y modelo de Mongoose
├── routes/
│   ├── tickets.js         # CRUD de tickets + comentarios + asignación
│   └── agentes.js         # CRUD de agentes
├── db.js                # Conexión a MongoDB
├── seed.js               # Datos de prueba (tickets + agentes)
├── app.js                # Arranque de Express
├── .env.example          # Plantilla de variables de entorno (sin valores reales)
└── .gitignore
```

## Endpoints principales

### Tickets
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/tickets` | Lista todos los tickets (filtros `?estado=`, `?prioridad=`, `?q=`) |
| GET | `/api/tickets/:id` | Un ticket por id |
| POST | `/api/tickets` | Crea un ticket (nace siempre en estado `abierto`) |
| PUT | `/api/tickets/:id` | Actualiza un ticket |
| DELETE | `/api/tickets/:id` | Elimina un ticket |
| POST | `/api/tickets/:id/comentarios` | Agrega un comentario al ticket |
| POST | `/api/tickets/:id/asignar` | Asigna un agente al ticket (`{ "agenteId": "<id>" }`) |

### Agentes
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/agentes` | Lista todos los agentes (filtros `?especialidad=`, `?activo=`) |
| GET | `/api/agentes/:id` | Un agente por id |
| GET | `/api/agentes/:id/tickets` | Tickets asignados actualmente a ese agente |
| POST | `/api/agentes` | Crea un agente |
| PUT | `/api/agentes/:id` | Actualiza un agente |
| DELETE | `/api/agentes/:id` | Elimina un agente (409 si tiene tickets abiertos asignados) |

## Partes bonus implementadas

- ✅ **Punto 21** — `GET /api/agentes/stats`: cantidad de tickets abiertos/resueltos por agente, con una agregación `$group` + `$lookup`.
- ✅ **Punto 22** — `GET /api/tickets?q=texto`: búsqueda con `$regex` sobre `asunto` y `cliente`.
- ✅ **Punto 23** — Índice compuesto `{ agenteId: 1, estado: 1 }` en la colección `tickets`. Sirve para dos consultas frecuentes del proyecto: `GET /api/agentes/:id/tickets` (filtra por `agenteId`) y la validación del `DELETE /api/agentes/:id`, que cuenta tickets `{ agenteId, estado: "abierto" }` — al combinar ambos campos en el índice, Mongo resuelve ese filtro combinado sin escanear toda la colección.
