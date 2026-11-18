import "dotenv/config";
const req = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing environment variable: ${k}`);
  return v;
};
export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: req("MONGO_URI"),
  jwtSecret: req("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
};
