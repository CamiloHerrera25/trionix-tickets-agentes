// ------------------------------------------------------------------
// Referencias al DOM
// ------------------------------------------------------------------
const tabs = document.getElementById("tabs");
const vistaTickets = document.getElementById("vistaTickets");
const vistaAgentes = document.getElementById("vistaAgentes");

const listaTickets = document.getElementById("listaTickets");
const emptyState = document.getElementById("emptyState");
const ticketTemplate = document.getElementById("ticketTemplate");

const listaAgentes = document.getElementById("listaAgentes");
const emptyStateAgentes = document.getElementById("emptyStateAgentes");
const agenteTemplate = document.getElementById("agenteTemplate");

const formularioTicket = document.getElementById("formularioTicket");
const inputCliente = document.getElementById("cliente");
const inputAsunto = document.getElementById("asunto");
const selectPrioridad = document.getElementById("prioridad");
const formErrorTicket = document.getElementById("formErrorTicket");
const btnSubmitTicket = document.getElementById("btnSubmitTicket");

const formularioAgente = document.getElementById("formularioAgente");
const inputAgenteNombre = document.getElementById("agenteNombre");
const inputAgenteEmail = document.getElementById("agenteEmail");
const selectAgenteEspecialidad = document.getElementById("agenteEspecialidad");
const formErrorAgente = document.getElementById("formErrorAgente");
const btnSubmitAgente = document.getElementById("btnSubmitAgente");

const toast = document.getElementById("toast");
const toastAgentes = document.getElementById("toastAgentes");
const filtersBar = document.getElementById("filters");

const statTotal = document.getElementById("statTotal");
const statAbiertos = document.getElementById("statAbiertos");
const statResueltos = document.getElementById("statResueltos");
const statAgentes = document.getElementById("statAgentes");

// ------------------------------------------------------------------
// Estado local
// ------------------------------------------------------------------
let ticketsCache = [];
let agentesCache = [];
let filtroEstado = "todos";
let filtroPrioridad = null;

// ------------------------------------------------------------------
// Utilidades de UI
// ------------------------------------------------------------------
function mostrarToast(elemento, mensaje, tipo = "error") {
  elemento.textContent = mensaje;
  elemento.classList.remove("is-success");
  if (tipo === "success") elemento.classList.add("is-success");
  elemento.classList.add("is-visible");
  clearTimeout(elemento._t);
  elemento._t = setTimeout(() => elemento.classList.remove("is-visible"), 3800);
}

function mostrarErrorFormulario(elemento, mensaje) {
  elemento.textContent = mensaje;
  elemento.classList.add("is-visible");
}

function limpiarErrorFormulario(elemento, campos) {
  elemento.textContent = "";
  elemento.classList.remove("is-visible");
  campos.forEach((el) => el.classList.remove("is-invalid"));
}

function actualizarStats() {
  statTotal.textContent = ticketsCache.length;
  statAbiertos.textContent = ticketsCache.filter((t) => t.estado === "abierto").length;
  statResueltos.textContent = ticketsCache.filter((t) => t.estado === "resuelto").length;
  statAgentes.textContent = agentesCache.length;
}

// Lee el mensaje de error de la API de forma segura, sin mostrar nunca
// el JSON crudo o un error genérico del navegador al usuario.
async function leerError(respuesta, mensajePorDefecto) {
  const cuerpo = await respuesta.json().catch(() => ({}));
  return cuerpo.error || mensajePorDefecto;
}

// ------------------------------------------------------------------
// Pestañas
// ------------------------------------------------------------------
tabs.addEventListener("click", (evento) => {
  const btn = evento.target.closest(".tab-btn");
  if (!btn) return;

  tabs.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");

  const esAgentes = btn.dataset.tab === "agentes";
  vistaTickets.hidden = esAgentes;
  vistaAgentes.hidden = !esAgentes;
});

// ------------------------------------------------------------------
// TICKETS — filtros y render
// ------------------------------------------------------------------
function ticketsFiltrados() {
  return ticketsCache.filter((t) => {
    const pasaEstado = filtroEstado === "todos" || t.estado === filtroEstado;
    const pasaPrioridad = !filtroPrioridad || t.prioridad === filtroPrioridad;
    return pasaEstado && pasaPrioridad;
  });
}

function opcionesDeAgentes(seleccionadoId) {
  const activos = agentesCache.filter((a) => a.activo);
  let html = `<option value="">Sin asignar</option>`;
  activos.forEach((a) => {
    const selected = seleccionadoId === a._id ? "selected" : "";
    html += `<option value="${a._id}" ${selected}>${a.nombre}</option>`;
  });
  return html;
}

function renderTickets() {
  const tickets = ticketsFiltrados();
  listaTickets.innerHTML = "";
  emptyState.hidden = tickets.length !== 0;

  tickets.forEach((ticket) => {
    const nodo = ticketTemplate.content.cloneNode(true);
    const articulo = nodo.querySelector(".stub");

    articulo.dataset.id = ticket._id;
    if (ticket.estado === "resuelto") articulo.classList.add("is-resuelto");

    const tab = nodo.querySelector(".stub__tab");
    tab.classList.add(ticket.prioridad);
    tab.title = `Prioridad ${ticket.prioridad}`;

    const numero = nodo.querySelector(".stub__number");
    numero.textContent = `#${ticket._id.slice(-6)}`;

    const estado = nodo.querySelector(".stub__estado");
    estado.textContent = ticket.estado === "resuelto" ? "Resuelto" : "En curso";
    estado.classList.add(ticket.estado);

    nodo.querySelector(".stub__cliente").textContent = ticket.cliente;
    nodo.querySelector(".stub__asunto").textContent = ticket.asunto;

    const labelAgente = nodo.querySelector(".stub__agente-label");
    labelAgente.textContent = ticket.agente ? `Asignado: ${ticket.agente.nombre}` : "Sin asignar";

    const selectAgente = nodo.querySelector(".stub__select-agente");
    selectAgente.innerHTML = opcionesDeAgentes(ticket.agente ? ticket.agente._id : null);
    selectAgente.addEventListener("change", () => asignarAgente(ticket._id, selectAgente.value));

    const btnResolver = nodo.querySelector(".btn--resolver");
    if (ticket.estado === "resuelto") {
      btnResolver.remove();
    } else {
      btnResolver.addEventListener("click", () => marcarResuelto(ticket));
    }

    nodo.querySelector(".btn--eliminar").addEventListener("click", () => eliminarTicket(ticket._id));

    listaTickets.appendChild(nodo);
  });

  actualizarStats();
}

// ------------------------------------------------------------------
// AGENTES — render
// ------------------------------------------------------------------
function renderAgentes() {
  listaAgentes.innerHTML = "";
  emptyStateAgentes.hidden = agentesCache.length !== 0;

  agentesCache.forEach((agente) => {
    const nodo = agenteTemplate.content.cloneNode(true);
    const articulo = nodo.querySelector(".agent-card");
    articulo.dataset.id = agente._id;

    const badgeEsp = nodo.querySelector(".badge--especialidad");
    badgeEsp.textContent = agente.especialidad;

    const badgeActivo = nodo.querySelector(".badge--activo");
    badgeActivo.textContent = agente.activo ? "Activo" : "Inactivo";
    badgeActivo.classList.add(agente.activo ? "si" : "no");

    nodo.querySelector(".agent-card__nombre").textContent = agente.nombre;
    nodo.querySelector(".agent-card__email").textContent = agente.email;

    nodo.querySelector(".btn--eliminar-agente").addEventListener("click", () => eliminarAgente(agente._id));

    listaAgentes.appendChild(nodo);
  });

  actualizarStats();
}

// ------------------------------------------------------------------
// Llamadas a la API — Tickets
// ------------------------------------------------------------------
async function cargarTickets() {
  try {
    const respuesta = await fetch("/api/tickets");
    if (!respuesta.ok) throw new Error("No se pudo cargar la lista de tickets.");
    ticketsCache = await respuesta.json();
    renderTickets();
  } catch (err) {
    mostrarToast(toast, err.message || "Error al cargar los tickets.");
  }
}

async function crearTicket(datos) {
  const respuesta = await fetch("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });

  if (!respuesta.ok) {
    throw new Error(await leerError(respuesta, "No se pudo crear el ticket."));
  }
  return respuesta.json();
}

async function marcarResuelto(ticket) {
  try {
    const respuesta = await fetch(`/api/tickets/${ticket._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente: ticket.cliente,
        asunto: ticket.asunto,
        prioridad: ticket.prioridad,
        estado: "resuelto",
      }),
    });

    if (!respuesta.ok) {
      throw new Error(await leerError(respuesta, "No se pudo actualizar el ticket."));
    }

    mostrarToast(toast, "Ticket marcado como resuelto.", "success");
    await cargarTickets();
  } catch (err) {
    mostrarToast(toast, err.message || "Error al actualizar el ticket.");
  }
}

async function eliminarTicket(id) {
  const confirmar = confirm("¿Seguro que quieres eliminar este ticket? Esta acción no se puede deshacer.");
  if (!confirmar) return;

  try {
    const respuesta = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    if (!respuesta.ok && respuesta.status !== 204) {
      throw new Error(await leerError(respuesta, "No se pudo eliminar el ticket."));
    }
    mostrarToast(toast, "Ticket eliminado.", "success");
    await cargarTickets();
  } catch (err) {
    mostrarToast(toast, err.message || "Error al eliminar el ticket.");
  }
}

async function asignarAgente(ticketId, agenteId) {
  // El endpoint POST /api/tickets/:id/asignar del backend siempre exige un
  // agenteId válido, existente y activo — no contempla "desasignar". Si el
  // usuario elige "Sin asignar" en un ticket que ya tenía agente, no hay
  // nada que pedirle a la API: solo avisamos y recargamos para mostrar el
  // estado real.
  if (!agenteId) {
    mostrarToast(toast, "Para reasignar, elige directamente otro agente de la lista.");
    await cargarTickets();
    return;
  }

  try {
    const respuesta = await fetch(`/api/tickets/${ticketId}/asignar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agenteId }),
    });

    if (!respuesta.ok) {
      throw new Error(await leerError(respuesta, "No se pudo asignar el agente."));
    }

    mostrarToast(toast, "Agente asignado correctamente.", "success");
    await cargarTickets();
  } catch (err) {
    mostrarToast(toast, err.message || "Error al asignar el agente.");
    await cargarTickets(); // revierte el <select> a su estado real
  }
}

// ------------------------------------------------------------------
// Llamadas a la API — Agentes
// ------------------------------------------------------------------
async function cargarAgentes() {
  try {
    const respuesta = await fetch("/api/agentes");
    if (!respuesta.ok) throw new Error("No se pudo cargar la lista de agentes.");
    agentesCache = await respuesta.json();
    renderAgentes();
  } catch (err) {
    mostrarToast(toastAgentes, err.message || "Error al cargar los agentes.");
  }
}

async function crearAgente(datos) {
  const respuesta = await fetch("/api/agentes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });

  if (!respuesta.ok) {
    throw new Error(await leerError(respuesta, "No se pudo crear el agente."));
  }
  return respuesta.json();
}

async function eliminarAgente(id) {
  const confirmar = confirm("¿Seguro que quieres eliminar este agente?");
  if (!confirmar) return;

  try {
    const respuesta = await fetch(`/api/agentes/${id}`, { method: "DELETE" });
    if (!respuesta.ok && respuesta.status !== 204) {
      // Aquí es donde se evidencia el 409: el agente tiene tickets abiertos asignados.
      throw new Error(await leerError(respuesta, "No se pudo eliminar el agente."));
    }
    mostrarToast(toastAgentes, "Agente eliminado.", "success");
    await cargarAgentes();
    await cargarTickets(); // por si algún ticket mostraba a este agente
  } catch (err) {
    mostrarToast(toastAgentes, err.message || "Error al eliminar el agente.");
  }
}

// ------------------------------------------------------------------
// Formulario de ticket
// ------------------------------------------------------------------
function validarFormularioTicket() {
  const cliente = inputCliente.value.trim();
  const asunto = inputAsunto.value.trim();

  if (!cliente) {
    inputCliente.classList.add("is-invalid");
    return "Escribe el nombre del cliente.";
  }
  if (asunto.length < 5) {
    inputAsunto.classList.add("is-invalid");
    return "El asunto debe tener al menos 5 caracteres.";
  }
  return null;
}

formularioTicket.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  limpiarErrorFormulario(formErrorTicket, [inputCliente, inputAsunto, selectPrioridad]);

  const errorLocal = validarFormularioTicket();
  if (errorLocal) {
    mostrarErrorFormulario(formErrorTicket, errorLocal);
    return;
  }

  const datos = {
    cliente: inputCliente.value.trim(),
    asunto: inputAsunto.value.trim(),
    prioridad: selectPrioridad.value,
  };

  btnSubmitTicket.disabled = true;
  btnSubmitTicket.textContent = "Creando...";

  try {
    await crearTicket(datos);
    formularioTicket.reset();
    selectPrioridad.value = "media";
    mostrarToast(toast, "Ticket creado con éxito.", "success");
    await cargarTickets();
  } catch (err) {
    mostrarErrorFormulario(formErrorTicket, err.message || "Ocurrió un error al crear el ticket.");
  } finally {
    btnSubmitTicket.disabled = false;
    btnSubmitTicket.textContent = "Registrar pase";
  }
});

[inputCliente, inputAsunto, selectPrioridad].forEach((el) => {
  el.addEventListener("input", () => limpiarErrorFormulario(formErrorTicket, [inputCliente, inputAsunto, selectPrioridad]));
});

// ------------------------------------------------------------------
// Formulario de agente
// ------------------------------------------------------------------
function validarFormularioAgente() {
  const nombre = inputAgenteNombre.value.trim();
  const email = inputAgenteEmail.value.trim();

  if (nombre.length < 3) {
    inputAgenteNombre.classList.add("is-invalid");
    return "El nombre debe tener al menos 3 caracteres.";
  }
  if (!email.includes("@")) {
    inputAgenteEmail.classList.add("is-invalid");
    return "Escribe un correo válido.";
  }
  return null;
}

formularioAgente.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  limpiarErrorFormulario(formErrorAgente, [inputAgenteNombre, inputAgenteEmail, selectAgenteEspecialidad]);

  const errorLocal = validarFormularioAgente();
  if (errorLocal) {
    mostrarErrorFormulario(formErrorAgente, errorLocal);
    return;
  }

  const datos = {
    nombre: inputAgenteNombre.value.trim(),
    email: inputAgenteEmail.value.trim(),
    especialidad: selectAgenteEspecialidad.value,
  };

  btnSubmitAgente.disabled = true;
  btnSubmitAgente.textContent = "Creando...";

  try {
    await crearAgente(datos);
    formularioAgente.reset();
    selectAgenteEspecialidad.value = "software";
    mostrarToast(toastAgentes, "Agente creado con éxito.", "success");
    await cargarAgentes();
    renderTickets(); // refresca los <select> de asignación con el nuevo agente
  } catch (err) {
    // Aquí se evidencia el 400 por correo duplicado (error code 11000 en el backend)
    mostrarErrorFormulario(formErrorAgente, err.message || "Ocurrió un error al crear el agente.");
  } finally {
    btnSubmitAgente.disabled = false;
    btnSubmitAgente.textContent = "Registrar agente";
  }
});

[inputAgenteNombre, inputAgenteEmail, selectAgenteEspecialidad].forEach((el) => {
  el.addEventListener("input", () =>
    limpiarErrorFormulario(formErrorAgente, [inputAgenteNombre, inputAgenteEmail, selectAgenteEspecialidad])
  );
});

// ------------------------------------------------------------------
// Filtros de tickets (100% en el cliente)
// ------------------------------------------------------------------
filtersBar.addEventListener("click", (evento) => {
  const btn = evento.target.closest(".filter-btn");
  if (!btn) return;

  if (btn.dataset.filtro) {
    filtroEstado = btn.dataset.filtro;
    filtersBar.querySelectorAll("[data-filtro]").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
  }

  if (btn.dataset.prioridad) {
    const yaActivo = btn.classList.contains("is-active");
    filtersBar.querySelectorAll("[data-prioridad]").forEach((b) => b.classList.remove("is-active"));
    if (yaActivo) {
      filtroPrioridad = null;
    } else {
      filtroPrioridad = btn.dataset.prioridad;
      btn.classList.add("is-active");
    }
  }

  renderTickets();
});

// ------------------------------------------------------------------
// Arranque
// ------------------------------------------------------------------
async function iniciar() {
  await cargarAgentes();
  await cargarTickets();
}

iniciar();
