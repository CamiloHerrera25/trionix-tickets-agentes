import express from "express";
import dotenv from "dotenv";
import { conectarDB } from "./db.js";
import ticketsRouter from "./routes/tickets.js";
import agentesRouter from "./routes/agentes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static("public"));

app.use("/api/tickets", ticketsRouter);
app.use("/api/agentes", agentesRouter);

async function iniciar() {
  // La conexión a MongoDB se abre ANTES de levantar el servidor Express,
  // para no aceptar peticiones mientras la base de datos todavía no está lista.
  await conectarDB();

  app.listen(PORT, () => {
    console.log(`Servidor Trionix Tickets + Agentes corriendo en el puerto ${PORT}`);
  });
}

iniciar().catch((err) => {
  console.error("No se pudo iniciar la aplicación:", err.message);
  process.exit(1);
});
