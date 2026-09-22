import dotenv from 'dotenv';
import { serve } from '@hono/node-server';
import app from './app.js';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`=======================================================`);
  console.log(`  TAKA Scientific Agentic ERP Server is RUNNING`);
  console.log(`  Port: ${info.port}`);
  console.log(`  App: http://localhost:${info.port}/app`);
  console.log(`  Health: http://localhost:${info.port}/health`);
  console.log(`=======================================================`);
});
