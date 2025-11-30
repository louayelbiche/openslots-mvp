import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as compression from "compression";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable gzip compression for all responses
  app.use(compression({
    level: 6, // Balanced compression level (1-9)
    threshold: 1024, // Only compress responses larger than 1KB
  }));

  app.enableCors({
    origin: "http://localhost:3000",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Accept, Accept-Encoding"
  });

  await app.listen(3001);
}
bootstrap();
