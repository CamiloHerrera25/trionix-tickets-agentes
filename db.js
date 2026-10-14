import mongoose from "mongoose";

export async function conectarDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "Falta la variable de entorno MONGODB_URI. Revisa tu archivo .env (usa .env.example como guía)."
    );
  }

  await mongoose.connect(uri);
  console.log("Conectado a MongoDB correctamente.");
}
