import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: [
        {
          emit: 'stdout',
          level: 'query',
        },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();

    // Esta linha liga o monitoramento preciso de query, sem erro de tipagem TS
    // (prisma $on pode ter tipos restritivos dependendo da versão instalada)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.$on as any)('query', (e: any) => {
      console.log('--- Prisma QUERY');
      console.log(`Query: ${e.query}`);
      console.log(`Params: ${JSON.stringify(e.params)}`);
      console.log(`Duration: ${e.duration}ms`);
      console.log('---');
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
