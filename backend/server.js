const fs = require("fs");
const https = require("https");
const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const morgan = require("morgan");
const { initializeFirebase } = require("./config/firebase");
const authMiddleware = require("./middleware/auth");
const createAuthRoutes = require("./routes/authRoutes");
const { createNotesRoutes, createSharedNotesRoutes } = require("./routes/notesRoutes");
const createUserRoutes = require("./routes/userRoutes");

const projectRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(projectRoot, ".env") });

const app = express();
const PORT = Number(process.env.PORT || 3000);
const { admin, db } = initializeFirebase();
const frontendDir = path.join(projectRoot, "frontend");
const keyPath = path.resolve(projectRoot, process.env.SSL_KEY_PATH || "certs/key.pem");
const certPath = path.resolve(projectRoot, process.env.SSL_CERT_PATH || "certs/cert.pem");
const hasHttpsCertificates = fs.existsSync(keyPath) && fs.existsSync(certPath);
const configuredBaseUrl = (process.env.APP_BASE_URL || "").trim();
const defaultBaseUrl = `${hasHttpsCertificates ? "https" : "http"}://localhost:${PORT}`;

app.locals.baseUrl = configuredBaseUrl || defaultBaseUrl;

app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use((req, res, next) => {
  if (configuredBaseUrl) {
    req.app.locals.baseUrl = configuredBaseUrl;
    return next();
  }

  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = String(Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || req.protocol || "https")
    .split(",")[0]
    .trim();
  const host = req.headers.host;

  req.app.locals.baseUrl = protocol && host ? `${protocol}://${host}` : defaultBaseUrl;
  next();
});
app.use(express.static(frontendDir));

app.get("/api/health", (req, res) => {
  res.json({ message: "Diary API is running." });
});

app.use("/api/auth", createAuthRoutes({ admin, db }));
app.use("/api/notes/shared", createSharedNotesRoutes({ db }));
app.use("/api/notes", authMiddleware, createNotesRoutes({ db }));
app.use("/api/user", authMiddleware, createUserRoutes({ db }));

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found." });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(frontendDir, "login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(frontendDir, "dashboard.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

function startLocalServer() {
  if (!hasHttpsCertificates) {
    const server = app.listen(PORT, () => {
      console.log(`Server ready at ${defaultBaseUrl}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Close the existing server or change PORT in .env.`);
        return;
      }

      console.error(error);
    });

    return;
  }

  const server = https.createServer(
    {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    },
    app
  );

  server.listen(PORT, () => {
    console.log(`Server ready at ${defaultBaseUrl}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Close the existing server or change PORT in .env.`);
      return;
    }

    console.error(error);
  });
}

if (require.main === module) {
  startLocalServer();
}

module.exports = app;
