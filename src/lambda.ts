import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import { AppModule } from './app.module';

let cachedServer;

export const handler = async (event, context) => {
  if (!cachedServer) {
    const expressApp = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      {
        logger: ['error', 'warn'], // Reduce logs in production
      }
    );
    
    // Enable CORS for Netlify
    app.enableCors({
      origin: true,
      credentials: true,
    });
    
    await app.init();
    cachedServer = serverlessExpress({ app: expressApp });
  }
  return cachedServer(event, context);
};