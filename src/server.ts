// src/server.ts
import "dotenv/config";
import app from "./app";

const PORT = Number(process.env.PORT) || 5000;

// 🔍 Catch startup crashes so you actually see WHY it died
process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 UNHANDLED REJECTION:", reason);
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Portfolio API listening on http://0.0.0.0:${PORT}`);
  console.log(`   → Try: http://localhost:${PORT}/`);
  console.log(`   → Try: http://127.0.0.1:${PORT}/`);
});

// Graceful shutdown — closes port cleanly on Ctrl+C
const shutdown = (signal: string) => {
  console.log(`\n${signal} received — closing server...`);
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));