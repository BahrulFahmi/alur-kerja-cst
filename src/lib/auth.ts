import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "rahasia-super-panjang-1234567890",
);

// Membuat token JWT
export async function createToken(payload: { id: string; role: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d") // Token berlaku 7 hari
    .sign(JWT_SECRET);
}

// Memverifikasi token JWT
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { id: string; role: string };
  } catch (error) {
    return null;
  }
}
