import { app } from './app.js';
import { initDb } from './db/index.js';
import { ENV } from './config/env.js';

async function startServer() {
  try {
    console.log('--- STARTING SIH1624 PHASE 1 BACKEND ---');
    await initDb();

    app.listen(ENV.PORT, () => {
      console.log(`Backend REST API running at http://localhost:${ENV.PORT}/`);
      console.log(`- Auth:      http://localhost:${ENV.PORT}/api/auth/login`);
      console.log(`- Projects:  http://localhost:${ENV.PORT}/api/projects`);
      console.log(`- Parcels:   http://localhost:${ENV.PORT}/api/parcels`);
      console.log(`- Health:    http://localhost:${ENV.PORT}/api/health`);
    });
  } catch (err: any) {
    console.error('Fatal backend initialization error:', err);
    process.exit(1);
  }
}

startServer();
