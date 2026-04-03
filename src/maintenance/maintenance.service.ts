import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceReportQueryDto } from './dto/maintenance-report-query.dto';

interface MaintenancePerformanceResult {
  Familia: string;
  DF: number;
  MTBF: number;
  MTTR: number;
  Paradas: number;
  tempo_prev: number;
  tempo_corretiva: number;
}

const CLIENT_ID = 405;

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPerformanceIndicator(query: MaintenanceReportQueryDto) {
    const startDate = query.startDate ?? dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    const endDate = query.endDate ?? dayjs().format('YYYY-MM-DD');
    const startDateTime = `${startDate} 00:00:00`;
    const endDateTime = `${endDate} 23:59:59`;
    const maintenanceIds = (query.typeMaintenance ?? []) as number[];

    const typeMaintenanceFilter = maintenanceIds.length
      ? Prisma.sql`AND ord.tipo_manutencao IN (${Prisma.join(maintenanceIds)})`
      : Prisma.empty;

    const startTime = performance.now();

    try {
      const rawResults = await this.prisma.$queryRaw<MaintenancePerformanceResult[]>(
        Prisma.sql`
          SELECT
            f.familia AS Familia,
            COALESCE(SUM(esc.tempo_prev), 0) AS tempo_prev,
            COALESCE(SUM(par.tempo_corretiva), 0) AS tempo_corretiva,
            COALESCE(SUM(par.paradas), 0) AS Paradas,
            ROUND(
              CASE
                WHEN COALESCE(SUM(esc.tempo_prev), 0) = 0 THEN 0
                ELSE ((COALESCE(SUM(esc.tempo_prev), 0) - COALESCE(SUM(par.tempo_corretiva), 0)) / COALESCE(SUM(esc.tempo_prev), 0)) * 100
              END,
              2
            ) AS DF,
            ROUND(
              (COALESCE(SUM(esc.tempo_prev), 0) - COALESCE(SUM(par.tempo_corretiva), 0)) / NULLIF(COALESCE(SUM(par.paradas), 0), 0),
              2
            ) AS MTBF,
            ROUND(
              COALESCE(SUM(par.tempo_corretiva), 0) / NULLIF(COALESCE(SUM(par.paradas), 0), 0),
              2
            ) AS MTTR
          FROM cadastro_de_familias_de_equipamento f
          LEFT JOIN cadastro_de_equipamentos e
            ON e.id_familia = f.ID
            AND e.id_cliente = ${CLIENT_ID}
          LEFT JOIN (
            SELECT
              id_equipamento,
              SUM(TIMESTAMPDIFF(SECOND, inicio, termino)) AS tempo_prev
            FROM sofman_prospect_escala_trabalho
            WHERE data_programada BETWEEN ${startDateTime} AND ${endDateTime}
            GROUP BY id_equipamento
          ) esc ON esc.id_equipamento = e.ID
          LEFT JOIN (
            SELECT
              par.id_equipamento,
              COUNT(*) AS paradas,
              SUM(TIMESTAMPDIFF(SECOND, par.data_hora_start, par.data_hora_stop)) AS tempo_corretiva
            FROM sofman_apontamento_paradas par
            JOIN controle_de_ordens_de_servico ord
              ON ord.ID = par.id_ordem_servico
              AND ord.ID_cliente = ${CLIENT_ID}
              ${typeMaintenanceFilter}
            WHERE par.data_hora_start BETWEEN ${startDateTime} AND ${endDateTime}
            GROUP BY par.id_equipamento
          ) par ON par.id_equipamento = e.ID
          WHERE f.ID_cliente = ${CLIENT_ID}
          GROUP BY f.ID, f.familia
          ORDER BY f.familia;
        `,
      );

      const endTime = performance.now();
      this.logger.log(`Query de indicadores de performance executada em ${(endTime - startTime).toFixed(2)} ms`);

      return rawResults.map((row) => ({
        Familia: row.Familia,
        DF: Number(row.DF ?? 0),
        MTBF: Number(row.MTBF ?? 0),
        MTTR: Number(row.MTTR ?? 0),
        Paradas: Number(row.Paradas ?? 0),
        tempo_prev: Number(row.tempo_prev ?? 0),
        tempo_corretiva: Number(row.tempo_corretiva ?? 0),
      }));
    } catch (error) {
      this.logger.error('Falha ao buscar indicadores de performance', error as Error);
      throw new InternalServerErrorException('Erro interno ao calcular indicadores de performance');
    }
  }
}