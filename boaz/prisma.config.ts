import { defineConfig, env } from 'prisma/config';
import * as dotenv from 'dotenv';

// Charge les variables du fichier .env dans process.env
dotenv.config();

export default defineConfig({
  datasource: {
    // Utilisation de process.env
    url: process.env.DATABASE_URL,
  },
});