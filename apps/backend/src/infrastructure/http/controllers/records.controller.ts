import { Request, Response, NextFunction } from "express";
import type { CreateRecordUseCase } from "../../../application/use-cases/records/create-record.use-case.js";
import type { GetRecordsByWeekUseCase } from "../../../application/use-cases/records/get-records-by-week.use-case.js";
import type { DeleteRecordUseCase } from "../../../application/use-cases/records/delete-record.use-case.js";
import type { DeleteWorkerWeekRecordsUseCase } from "../../../application/use-cases/records/delete-worker-week-records.use-case.js";

interface RecordsControllerDeps {
  createRecord: CreateRecordUseCase;
  getRecordsByWeek: GetRecordsByWeekUseCase;
  deleteRecord: DeleteRecordUseCase;
  deleteWorkerWeekRecords: DeleteWorkerWeekRecordsUseCase;
}

export function createRecordsController(deps: RecordsControllerDeps) {
  return {
    async create(req: Request, res: Response, next: NextFunction) {
      try {
        const record = await deps.createRecord.execute(req.body);
        res.status(201).json(record);
      } catch (err) {
        next(err);
      }
    },

    async getByWeek(req: Request, res: Response, next: NextFunction) {
      try {
        const weekId = req.params.weekId as string;
        const records = await deps.getRecordsByWeek.execute(weekId);
        res.json(records);
      } catch (err) {
        next(err);
      }
    },

    async delete(req: Request, res: Response, next: NextFunction) {
      try {
        await deps.deleteRecord.execute(req.params.id as string);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },

    async deleteByWorkerAndWeek(req: Request, res: Response, next: NextFunction) {
      try {
        const { workerId, weekId } = req.params as { workerId: string; weekId: string };
        const result = await deps.deleteWorkerWeekRecords.execute({ workerId, weekId });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
