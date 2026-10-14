import { Router } from "express";
import Joi from "joi";
import Ticket from "../models/Ticket.js";
import Agente from "../models/Agente.js";

const router = Router();

const PRIORIDADES = ["baja", "media", "alta"];
const ESTADOS = ["abierto", "resuelto"];

// ----------------------------------------------------------------------
// Validación con Joi
// ----------------------------------------------------------------------
const camposBase = {
  cliente: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "El nombre del cliente es obligatorio.",
    "string.min": "El nombre del cliente debe tener al menos 2 caracteres.",
    "any.required": "El nombre del cliente es obligatorio.",
  }),
  asunto: Joi.string().trim().min(5).max(200).required().messages({
    "string.empty": "El asunto es obligatorio.",
    "string.min": "El asunto debe tener al menos 5 caracteres.",
    "any.required": "El asunto es obligatorio.",
  }),
  prioridad: Joi.string().valid(...PRIORIDADES).required().messages({
    "any.only": "La prioridad debe ser baja, media o alta.",
    "any.required": "Debes seleccionar una prioridad.",
  }),
};

const esquemaCrearTicket = Joi.object(camposBase);

const esquemaActualizarTicket = Joi.object({
  ...camposBase,
  estado: Joi.string().valid(...ESTADOS).required().messages({
    "any.only": "El estado debe ser abierto o resuelto.",
    "any.required": "El estado es obligatorio.",
  }),
});

const esquemaComentario = Joi.object({
  autor: Joi.string().trim().min(2).max(100).required().messages({
    "string.min": "El nombre del autor debe tener al menos 2 caracteres.",
    "any.required": "El autor del comentario es obligatorio.",
  }),
  texto: Joi.string().trim().min(3).max(500).required().messages({
    "string.min": "El comentario debe tener al menos 3 caracteres.",
    "any.required": "El texto del comentario es obligatorio.",
  }),
});

const esquemaAsignar = Joi.object({
  agenteId: Joi.string().required().messages({
    "any.required": "Debes indicar el agenteId a asignar.",
  }),
});

// ----------------------------------------------------------------------
// Utilidades
// ----------------------------------------------------------------------

// Mongoose acepta como "ObjectId válido" cualquier string de 12 caracteres
// (no solo 24 hex), lo cual da falsos positivos. Por eso validamos nosotros
// mismos con un formato estricto de 24 caracteres hexadecimales.
function esObjectIdValido(id) {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
}

// Da forma a la respuesta JSON del ticket: renombra "agenteId" poblado a
// "agente" (null si no hay nadie asignado), como pide el enunciado.
function formatearTicket(ticketDoc) {
  const t = ticketDoc.toObject();
  return {
    _id: t._id,
    cliente: t.cliente,
    asunto: t.asunto,
    prioridad: t.prioridad,
    estado: t.estado,
    comentarios: t.comentarios,
    agente: t.agenteId || null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

// ----------------------------------------------------------------------
// NOTA sobre el orden de las rutas:
// Express evalúa las rutas en el orden en que se declaran. Una ruta literal
// como "/stats" DEBE declararse antes que "/:id", porque si no, Express
// interpretaría "stats" como el valor del parámetro :id. En este router no
// hay una ruta /stats para tickets, pero si la agregas, va aquí arriba.
// ----------------------------------------------------------------------

// GET /api/tickets?estado=&prioridad=&q=
router.get("/", async (req, res) => {
  try {
    const filtro = {};
    if (req.query.estado) filtro.estado = req.query.estado;
    if (req.query.prioridad) filtro.prioridad = req.query.prioridad;

    // Bonus (punto 22): búsqueda por texto en asunto o cliente
    if (req.query.q) {
      filtro.$or = [
        { asunto: { $regex: req.query.q, $options: "i" } },
        { cliente: { $regex: req.query.q, $options: "i" } },
      ];
    }

    const tickets = await Ticket.find(filtro)
      .populate("agenteId", "nombre especialidad")
      .sort({ createdAt: -1 });

    res.json(tickets.map(formatearTicket));
  } catch (err) {
    res.status(500).json({ error: "Error al listar los tickets." });
  }
});

// GET /api/tickets/:id
router.get("/:id", async (req, res) => {
  try {
    if (!esObjectIdValido(req.params.id)) {
      return res.status(400).json({ error: "El id del ticket no tiene un formato válido." });
    }

    const ticket = await Ticket.findById(req.params.id).populate("agenteId", "nombre especialidad");

    if (!ticket) {
      return res.status(404).json({ error: "Ticket no encontrado." });
    }

    res.json(formatearTicket(ticket));
  } catch (err) {
    res.status(500).json({ error: "Error al buscar el ticket." });
  }
});

// POST /api/tickets
router.post("/", async (req, res) => {
  const { error, value } = esquemaCrearTicket.validate(req.body, { abortEarly: true });

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const nuevoTicket = await Ticket.create({
      cliente: value.cliente,
      asunto: value.asunto,
      prioridad: value.prioridad,
      estado: "abierto", // siempre nace abierto, sin importar lo que envíe el cliente
    });

    res.status(201).json(formatearTicket(nuevoTicket));
  } catch (err) {
    res.status(400).json({ error: "No se pudo crear el ticket. Verifica los datos enviados." });
  }
});

// PUT /api/tickets/:id
router.put("/:id", async (req, res) => {
  if (!esObjectIdValido(req.params.id)) {
    return res.status(400).json({ error: "El id del ticket no tiene un formato válido." });
  }

  const { error, value } = esquemaActualizarTicket.validate(req.body, { abortEarly: true });

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        cliente: value.cliente,
        asunto: value.asunto,
        prioridad: value.prioridad,
        estado: value.estado,
      },
      { new: true, runValidators: true }
    ).populate("agenteId", "nombre especialidad");

    if (!ticket) {
      return res.status(404).json({ error: "Ticket no encontrado." });
    }

    res.json(formatearTicket(ticket));
  } catch (err) {
    res.status(400).json({ error: "No se pudo actualizar el ticket. Verifica los datos enviados." });
  }
});

// DELETE /api/tickets/:id
router.delete("/:id", async (req, res) => {
  if (!esObjectIdValido(req.params.id)) {
    return res.status(400).json({ error: "El id del ticket no tiene un formato válido." });
  }

  const ticket = await Ticket.findByIdAndDelete(req.params.id);

  if (!ticket) {
    return res.status(404).json({ error: "Ticket no encontrado." });
  }

  res.status(204).send();
});

// POST /api/tickets/:id/comentarios
router.post("/:id/comentarios", async (req, res) => {
  if (!esObjectIdValido(req.params.id)) {
    return res.status(400).json({ error: "El id del ticket no tiene un formato válido." });
  }

  const { error, value } = esquemaComentario.validate(req.body, { abortEarly: true });

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({ error: "Ticket no encontrado." });
  }

  ticket.comentarios.push({ autor: value.autor, texto: value.texto });
  await ticket.save();
  await ticket.populate("agenteId", "nombre especialidad");

  res.status(201).json(formatearTicket(ticket));
});

// POST /api/tickets/:id/asignar
router.post("/:id/asignar", async (req, res) => {
  if (!esObjectIdValido(req.params.id)) {
    return res.status(400).json({ error: "El id del ticket no tiene un formato válido." });
  }

  const { error, value } = esquemaAsignar.validate(req.body, { abortEarly: true });

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  if (!esObjectIdValido(value.agenteId)) {
    return res.status(400).json({ error: "El agenteId no tiene un formato válido." });
  }

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket no encontrado." });
  }

  const agente = await Agente.findById(value.agenteId);
  if (!agente) {
    return res.status(404).json({ error: "El agente indicado no existe." });
  }
  if (!agente.activo) {
    return res.status(400).json({ error: "No se puede asignar: el agente no está activo." });
  }

  ticket.agenteId = agente._id;
  await ticket.save();
  await ticket.populate("agenteId", "nombre especialidad");

  res.status(200).json(formatearTicket(ticket));
});

export default router;
