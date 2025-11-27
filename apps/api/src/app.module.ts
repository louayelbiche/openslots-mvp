import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { DiscoveryModule } from "./discovery/discovery.module";

@Module({
  imports: [PrismaModule, DiscoveryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
