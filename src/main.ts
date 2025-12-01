import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

let cachedApp;

async function bootstrap() {
  if (!cachedApp) {
    const expressApp = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // CORS
    app.enableCors();

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('Rigaby API')
      .setDescription('The Rigaby platform API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    await app.init();
    cachedApp = expressApp;
  }
  return cachedApp;
}

// For local development
if (require.main === module) {
  const port = process.env.PORT || 3005;
  bootstrap().then((app) => {
    app.listen(port, () => {
      console.log(`Application is running on: http://localhost:${port}`);
      console.log(`Swagger documentation: http://localhost:${port}/api`);
    });
  });
}

// Export for Vercel serverless
export default async (req, res) => {
  const app = await bootstrap();
  app(req, res);
};