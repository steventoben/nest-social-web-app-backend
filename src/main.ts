import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { config } from 'aws-sdk';
import * as cookieParser from 'cookie-parser';
import { ExpressAdapter } from "@nestjs/platform-express";
import * as express from 'express';
import * as http from "http";
require('dotenv').config();

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  const configService = app.get(ConfigService);
  const origin = configService.get('CLIENT_ORIGIN');
  app.enableCors({
    credentials: true,
    origin: origin
  });
  config.update({
    accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
    region: configService.get('AWS_REGION')
  });
  app.use(cookieParser());
  await app.init();

  http.createServer(server).listen(5000);
}
bootstrap();
