import { cookies } from "next/headers";

const COOKIE = "tb_admin";

export async function isAdminSession(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value === "1";
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export const ADMIN_COOKIE_NAME = COOKIE;
