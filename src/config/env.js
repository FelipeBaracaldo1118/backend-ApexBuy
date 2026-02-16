import dotenv from "dotenv";

// Carga variables del archivo .env
dotenv.config();

// Solo para verificar en desarrollo 
console.log("DATABASE_URL cargada:", !!process.env.DATABASE_URL);