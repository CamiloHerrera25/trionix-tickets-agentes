import mongoose from "mongoose";

const comentarioSchema = new mongoose.Schema(
  {
    autor: String,
    texto: String,
    fecha: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ticketSchema = new mongoose.Schema(
  {
    cliente: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    asunto: { type: String, required: true, trim: true, minlength: 5, maxlength: 200 },
    prioridad: { type: String, enum: ["baja", "media", "alta"], required: true },
    estado: { type: String, enum: ["abierto", "resuelto"], default: "abierto" },
    comentarios: [comentarioSchema],
    agenteId: { type: mongoose.Schema.Types.ObjectId, ref: "Agente", default: null },
  },
  { timestamps: true }
);

// Bonus (punto 23): índice compuesto sobre agenteId + estado.
// Sirve para dos consultas frecuentes del proyecto:
//   1) GET /api/agentes/:id/tickets -> busca por agenteId
//   2) DELETE /api/agentes/:id -> cuenta tickets { agenteId, estado: "abierto" }
// al combinar ambos campos en un solo índice, Mongo puede resolver esa
// segunda consulta (filtro por agenteId Y estado) sin escanear toda la colección.
ticketSchema.index({ agenteId: 1, estado: 1 });

export default mongoose.model("Ticket", ticketSchema);
