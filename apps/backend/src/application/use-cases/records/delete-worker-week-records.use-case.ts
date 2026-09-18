import type { RecordRepository } from "../../../domain/ports/record.repository.js";
import type { WeekRepository } from "../../../domain/ports/week.repository.js";
import type { WorkerRepository } from "../../../domain/ports/worker.repository.js";
import type { WorkerPaymentRepository } from "../../../domain/ports/worker-payment.repository.js";
import { NotFoundError } from "../../../domain/errors/not-found.error.js";
import { ConflictError } from "../../../domain/errors/conflict.error.js";

export interface DeleteWorkerWeekRecordsInput {
  workerId: string;
  weekId: string;
}

export interface DeleteWorkerWeekRecordsOutput {
  deletedCount: number;
}

export class DeleteWorkerWeekRecordsUseCase {
  constructor(
    private readonly recordRepo: RecordRepository,
    private readonly workerRepo: WorkerRepository,
    private readonly weekRepo: WeekRepository,
    private readonly paymentRepo: WorkerPaymentRepository,
  ) {}

  async execute(input: DeleteWorkerWeekRecordsInput): Promise<DeleteWorkerWeekRecordsOutput> {
    const { workerId, weekId } = input;

    const worker = await this.workerRepo.findById(workerId);
    if (!worker) {
      throw new NotFoundError("Trabajador no encontrado");
    }

    const week = await this.weekRepo.findById(weekId);
    if (!week) {
      throw new NotFoundError("Semana no encontrada");
    }

    const payments = await this.paymentRepo.findByWorkerAndWeeks(workerId, [weekId]);
    if (payments.length > 0) {
      throw new ConflictError(
        "No se puede eliminar: el trabajador ya fue pagado en esta semana",
      );
    }

    const deletedCount = await this.recordRepo.deleteByWorkerAndWeek(workerId, weekId);
    return { deletedCount };
  }
}
