import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, MaintenanceModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
