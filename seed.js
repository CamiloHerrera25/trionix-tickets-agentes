import dotenv from "dotenv";
import mongoose from "mongoose";
import { conectarDB } from "./db.js";
import Agente from "./models/Agente.js";
import Ticket from "./models/Ticket.js";

dotenv.config();

async function seed() {
  await conectarDB();

  console.log("Borrando datos existentes...");
  await Promise.all([Agente.deleteMany({}), Ticket.deleteMany({})]);

  console.log("Creando agentes...");
  const agentes = await Agente.insertMany([
    { nombre: "Laura Gómez", email: "laura.gomez@trionixlabs.com", especialidad: "redes" },
    { nombre: "Carlos Pérez", email: "carlos.perez@trionixlabs.com", especialidad: "software" },
    { nombre: "Ana Torres", email: "ana.torres@trionixlabs.com", especialidad: "hardware", activo: false },
    { nombre: "Diego Ríos", email: "diego.rios@trionixlabs.com", especialidad: "general" },
  ]);

  console.log("Creando tickets...");
  await Ticket.insertMany([
    {
      cliente: "Acme Corp",
      asunto: "No carga el dashboard principal",
      prioridad: "alta",
      estado: "abierto",
      agenteId: agentes[0]._id,
      comentarios: [{ autor: "Laura Gómez", texto: "Revisando logs del servidor." }],
    },
    {
      cliente: "Beta SAS",
      asunto: "Solicitud de nuevo usuario en la plataforma",
      prioridad: "media",
      estado: "abierto",
    },
    {
      cliente: "Nova Tech",
      asunto: "Duda sobre el plan de facturación",
      prioridad: "baja",
      estado: "resuelto",
      agenteId: agentes[1]._id,
    },
    {
      cliente: "Delta Inc",
      asunto: "Falla intermitente en el módulo de reportes",
      prioridad: "alta",
      estado: "abierto",
      agenteId: agentes[1]._id,
    },
  ]);

  console.log("Datos de prueba insertados correctamente.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Error al poblar la base de datos:", err.message);
  process.exit(1);
});
