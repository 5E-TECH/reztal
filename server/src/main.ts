import { config } from 'dotenv';
config(); // .env faylini o'qish

import { NestFactory } from '@nestjs/core';
import { AppModule } from './api/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  console.log(
    `Application is running on: http://localhost:${port} with token: ${process.env.BOT_TOKEN}`,
  );
}
bootstrap();
