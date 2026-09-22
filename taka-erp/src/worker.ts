import app, { type Env } from './app.js';

// Cloudflare Workers entry: the Hono app exposes fetch(request, env, ctx).
export default app;

export type { Env };
