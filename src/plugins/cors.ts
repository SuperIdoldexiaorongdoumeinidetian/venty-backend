import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import cors from "@fastify/cors";
import { config } from "../config";

// localhost + private LAN-IPs in jedem Port – deckt Expo Dev ab
// (Metro/Web auf localhost:8081 sowie das Gerät im LAN via 192.168.x.x / 10.x / 172.16-31.x)
const DEV_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export const corsPlugin = fp(async (app: FastifyInstance) => {
  await app.register(cors, {
    origin: (origin, cb) => {
      // Native Apps (Expo Go / Dev Build) senden keinen Origin-Header → erlauben
      if (!origin) return cb(null, true);
      if (DEV_ORIGIN.test(origin) || config.corsExtraOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  });
});
