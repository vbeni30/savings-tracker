import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "savings-session";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }
  return new TextEncoder().encode(secret);
}

export function getAuthConfig() {
  return {
    username: process.env.AUTH_USERNAME ?? "owner",
    password: process.env.AUTH_PASSWORD ?? "",
  };
}

export function credentialsMatch(username: string, password: string): boolean {
  const config = getAuthConfig();
  if (!config.password) return false;

  const userOk = username === config.username;
  const passOk = password === config.password;

  return userOk && passOk;
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function getSessionFromCookies(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}
