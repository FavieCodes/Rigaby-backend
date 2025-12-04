import serverless from 'serverless-http';
import { createNetlifyApp } from '../../src/netlify-bootstrap';

let cachedServer: any;

async function bootstrap() {
  if (!cachedServer) {
    const server = await createNetlifyApp();
    cachedServer = serverless(server);
  }
  return cachedServer;
}

export const handler = async (event: any, context: any) => {
  // Set Prisma binary target for Netlify environment
  if (process.env.NETLIFY) {
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = 
      '/opt/buildhome/.pnpm-store/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node';
  }

  const server = await bootstrap();
  
  // Allow for longer Lambda execution
  context.callbackWaitsForEmptyEventLoop = false;
  
  return server(event, context);
};