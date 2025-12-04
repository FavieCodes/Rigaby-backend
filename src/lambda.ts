import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import express from 'express';
import serverlessExpress from '@vendia/serverless-express';

let cachedServer;

async function bootstrapServer() {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );
  
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  await app.init();
  return serverlessExpress({ app: expressApp });
}

export const handler = async (event, context) => {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  return cachedServer(event, context);
};