import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";

connectDB()
  .then(() => app.listen(env.port, () => console.log(`API running on port ${env.port}`)))
  .catch((e) => {
    console.error("Startup failed:", e.message);
    process.exit(1);
  });
