import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: env.isProduction ? "info" : "debug",
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.passwordHash"],
    censor: "[REDACTED]",
  },
  transport: env.isProduction ? undefined : { target: "pino-pretty", options: { colorize: true } },
});
