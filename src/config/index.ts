// src/config/index.ts
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3000"),

  DB_MONITORAMENTO_HOST: z.string(),
  DB_MONITORAMENTO_PORT: z
    .string()
    .transform((v) => Number(v))
    .default("3306"),
  DB_MONITORAMENTO_USER: z.string(),
  DB_MONITORAMENTO_PASSWORD: z.string(),
  DB_NAME_MONITORAMENTO: z.string(),
  DB_NAME: z.string(),
  CRON_SCHEDULE: z.string().default('*/5 * * * *'),
  TRAY_URL: z.string().url(),
  TRAY_TOKEN: z.string(),
  GOOGLE_WEBHOOK_URL: z.string().url().optional(),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error("❌ Erro de validação nas variáveis de ambiente:", env.error.format());
  process.exit(1);
}

export const config = env.data;
