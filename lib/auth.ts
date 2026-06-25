import { SignJWT, jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

export type TokenPayload = {
  email: string;
  tier: string;
  name: string;
};

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret());
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, secret());
  return {
    email: payload.email as string,
    tier:  payload.tier  as string,
    name:  payload.name  as string,
  };
}

export const SESSION_COOKIE = "crs_portal_session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours
