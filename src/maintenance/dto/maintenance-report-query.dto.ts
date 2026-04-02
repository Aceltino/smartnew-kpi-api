import { createZodDto, ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';

export const MaintenanceReportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD').optional(),
  typeMaintenance: z
    .string()
    .optional()
    .refine((value) => !value || /^[0-9]+(,[0-9]+)*$/.test(value), {
      message: 'typeMaintenance must be comma separated numeric IDs'
    })
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((item) => Number(item.trim()))
            .filter((id) => !Number.isNaN(id))
        : undefined
    )
});

export type MaintenanceReportQueryDto = z.infer<typeof MaintenanceReportQuerySchema>;
export class MaintenanceReportQueryClass extends createZodDto(MaintenanceReportQuerySchema) {}

export const MaintenanceReportQueryValidationPipe = new ZodValidationPipe(MaintenanceReportQuerySchema);
