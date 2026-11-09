/** Server env as plain strings; on Vercel the functions read `process.env` at request time. */
export type Env = Record<string, string | undefined>;

export const serverEnv = (): Env => process.env;
