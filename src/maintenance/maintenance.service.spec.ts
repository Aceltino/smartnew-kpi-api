import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceService } from './maintenance.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaintenanceService, PrismaService],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should calcular indicadores e mapear campos corretamente', async () => {
    const query = {
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      typeMaintenance: [1, 2],
    };

    jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([
      {
        Familia: 'Grupo A',
        DF: 75.0,
        MTBF: 120.0,
        MTTR: 30.0,
        Paradas: 3,
        tempo_prev: 240,
        tempo_corretiva: 90,
      },
    ]);

    const result = await service.getPerformanceIndicator(query);

    expect(result).toEqual([
      {
        Familia: 'Grupo A',
        DF: 75,
        MTBF: 120,
        MTTR: 30,
        Paradas: 3,
        tempo_prev: 240,
        tempo_corretiva: 90,
      },
    ]);

    expect(prismaService.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('deve lançar InternalServerErrorException em falha de query', async () => {
    jest.spyOn(prismaService, '$queryRaw').mockRejectedValue(new Error('DB error')); 

    await expect(
      service.getPerformanceIndicator({ startDate: '2026-03-01', endDate: '2026-03-10' }),
    ).rejects.toThrow('Erro interno ao calcular indicadores de performance');
  });
});
