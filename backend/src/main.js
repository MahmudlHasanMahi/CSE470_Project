import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { join } from "node:path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api"); 

  const publicDir = process.env.PUBLIC_DIR || join(process.cwd(), "public");
  app.useStaticAssets(publicDir);

  await app.listen(3000, "0.0.0.0");
}
bootstrap();