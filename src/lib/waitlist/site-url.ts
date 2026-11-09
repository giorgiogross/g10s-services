import { serverEnv, type Env } from "./env";

/** Base of the links we email: SITE_URL when set (the production domain), else the origin of the request. */
export function siteUrl(request: Request, env: Env = serverEnv()): string {
  return env.SITE_URL?.trim() || new URL(request.url).origin;
}
