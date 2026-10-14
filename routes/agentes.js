import { Router } from "express";
import Joi from "joi";
import Agente from "../models/Agente.js";
import Ticket from "../models/Ticket.js";

const router = Router();

const ESPECIALIDADES = ["redes", "software", "hardware", "general"];

// ----------------------------------------------------------------------
// Validación con Joi
// ----------------------------------------------------------------------
const camposBase = {
  nombre: Joi.string().trim().min(3).max(100).required().messages({
    "string.min": "El nombre debe tener al menos 3 caracteres.",
    "any.required": "El nombre es obligatorio.",
  }),
  email: Joi.string().trim().email().required().messages({
    "string.email": "El correo no tiene un formato válido.",
    "any.required": "El correo es obligatorio.",
  }),
  especialidad: Joi.string().valid(...ESPECIALIDADES).required().messages({
    "any.only": "La especialidad debe ser redes, software, hardware o general.",
    "any.required": "Debes seleccionar una especialidad.",
  }),
  activo: Joi.boolean(),
};

const esquemaCrearAgente = Joi.object(camposBase);
const esquemaActualizarAgente = Joi.object(camposBase);

function esObjectIdValido(id) {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
}

// ----------------------------------------------------------------------
// IMPORTANTE: rutas literales ("/stats") SIEMPRE antes que "/:id",
// porque si no, Express interpretaría "stats" como el valor de :id.
// ----------------------------------------------------------------------

// Bonus (punto 21): GET /api/agentes/stats
// Por cada agente, cuántos tickets tiene actualmente en cada estado.
router.get("/stats", async (req, res) => {
  try {
    const stats = await Ticket.aggregate([
      { $match: { agenteId: { $ne: null } } },
      {
        $group: {
          _id: { agenteId: "$agenteId", estado: "$estado" },
          total: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.agenteId",
          conteos: { $push: { estado: "$_id.estado", total: "$total" } },
        },
      },
      {
        $lookup: {
          from: "agentes",
          localField: "_id",
          foreignField: "_id",
          as: "agente",
        },
      },
      { $unwind: "$agente" },
      {
        $project: {
          _id: 0,
          agenteId: "$agente._id",
          nombre: "$agente.nombre",
          especialidad: "$agente.especialidad",
          conteos: 1,
        },
      },
      { $sort: { nombre: 1 } },
    ]);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Error al calcular las estadísticas de agentes." });
  }
});

// GET /api/agentes?especialidad=&activo=
router.get("/", async (req, res) => {
  try {
    const filtro = {};
    if (req.query.especialidad) filtro.especialidad = req.query.especialidad;
    if (req.query.activo !== undefined) filtro.activo = req.query.activo === "true";

    const agentes = await Agente.find(filtro).sort({ nombre: 1 });
    res.json(agentes);
  } catch (err) {
    res.status(500).json({ error: "Error al listar los agentes." });
  }
});

// GET /api/agentes/:id
router.get("/:id", async (req, res) => {
  if (!esObjectIdValido(req.params.id)) {
    return res.status(400).json({ error: "El id del agente no tiene un formato válido." });
  }

  const agente = await Agente.findById(req.params.id);
  if (!agente) {
    return res.status(404).json({ error: "Agente no encontrado." });
  }

  res.json(agente);
});

// GET /api/agentes/:id/tickets
router.get("/:id/tickets", async (req, res) => {
  if (!esObjectIdValido(req.params.id)) {
    return res.status(400).json({ error: "El id del agente no tiene un formato válido." });
  }

  const agente = await Agente.findById(req.params.id);
  if (!agente) {
    return res.status(404).json({ error: "Agente no encontrado." });
  }

  const tickets = await Ticket.find({ agenteId: req.params.id }).sort({ createdAt: -1 });
  res.json(tickets);
});

// POST /api/agentes
router.post("/", async (req, res) => {
  const { error, value } = esquemaCrearAgente.validate(req.body, { abortEarly: true });

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const nuevoAgente = await Agente.create(value);
    res.status(201).json(nuevoAgente);
  } catch (err) {
    // El índice unique de "email" lanza un error de MongoDB con code 11000,
    // NO un ValidationError de Mongoose. Hay que capturarlo aparte y
    // traducirlo a un 400 legible; si no, el cliente recibiría un 500 con
    // el texto crudo del driver de Mongo.
    if (err.code === 11000) {
      return res.status(400).json({ error: "Ya existe un agente registrado con ese correo." });
    }
    res.status(400).json({ error: "No se pudo crear el agente. Verifica los datos enviados." });
  }
});

// PUT /api/agentes/:id
router.put("/:id", async (req, res) => {
  if (!esObjectIdValido(req.params.id)) {
    return res.status(400).json({ error: "El id del agente no tiene un formato válido." });
  }

  const { error, value } = esquemaActualizarAgente.validate(req.body, { abortEarly: true });

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const agente = await Agente.findByIdAndUpdate(req.params.id, value, {
      new: true,
      runValidators: true,
    });

    if (!agente) {
      return res.status(404).json({ error: "Agente no encontrado." });
    }

    res.json(agente);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Ya existe un agente registrado con ese correo." });
    }
    res.status(400).json({ error: "No se pudo actualizar el agente. Verifica los datos enviados." });
  }
});

// DELETE /api/agentes/:id
router.delete("/:id", async (req, res) => {
  if (!esObjectIdValido(req.params.id)) {
    return res.status(400).json({ error: "El id del agente no tiene un formato válido." });
  }

  const agente = await Agente.findById(req.params.id);
  if (!agente) {
    return res.status(404).json({ error: "Agente no encontrado." });
  }

  const ticketsAbiertos = await Ticket.countDocuments({
    agenteId: agente._id,
    estado: "abierto",
  });

  if (ticketsAbiertos > 0) {
    return res.status(409).json({
      error: `No se puede eliminar: el agente tiene ${ticketsAbiertos} ticket(s) abierto(s) asignado(s). Reasígnalos o resuélvelos primero.`,
    });
  }

  await Agente.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

export default router;
