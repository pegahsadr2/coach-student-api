import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configuredOrigins = [
    "http://localhost:4200",
    "http://172.22.16.50:4200",
    "http://172.22.16.82:4200",
    "http://localhost:3001",
    "http://172.22.16.158:3001",
    "http://172.22.16.50:5000",

    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    ...(process.env.FRONTEND_URLS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];
  const allowedOrigins = new Set(configuredOrigins);

  app.enableCors({
    origin: (origin, callback) => {
      // Requests without an Origin header (curl, Postman, server-to-server) are allowed.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin is not allowed: ${origin}`), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("Coach Student API")
    .setDescription("API documentation for the Coach Student project")
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      "access-token",
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  await app.listen(Number(process.env.PORT ?? 3001), "0.0.0.0");
}

bootstrap();
