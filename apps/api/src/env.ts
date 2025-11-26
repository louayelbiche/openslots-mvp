import * as dotenv from "dotenv";
import { join } from "path";

const envPath = join(__dirname, "../.env");
dotenv.config({ path: envPath });

console.log("[env] loaded .env from", envPath);
console.log("[env] DATABASE_URL =", process.env.DATABASE_URL ? "SET" : "MISSING");
