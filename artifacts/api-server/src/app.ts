import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { apiLimiter, corsOptions } from "./lib/security";

const app: Express = express();

// Number of reverse proxies in front of the server, so rate limiting sees the
// real client IP. Override with TRUST_PROXY if the hosting setup changes.
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(helmet());
app.use(cors(corsOptions()));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use("/api", apiLimiter, router);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
