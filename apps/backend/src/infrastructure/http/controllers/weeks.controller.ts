import { Request, Response, NextFunction } from "express";
import type { GetCurrentWeekUseCase } from "../../../application/use-cases/weeks/get-current-week.use-case.js";
import type { ListWeeksUseCase } from "../../../application/use-cases/weeks/list-weeks.use-case.js";
import type { ListAllWeeksUseCase } from "../../../application/use-cases/weeks/list-all-weeks.use-case.js";
import type { PreviewWeekUseCase } from "../../../application/use-cases/weeks/preview-week.use-case.js";
import type { SaveWeekUseCase } from "../../../application/use-cases/weeks/save-week.use-case.js";
import type { GetWeekDetailUseCase } from "../../../application/use-cases/weeks/get-week-detail.use-case.js";
import type { UpdateWeekUseCase } from "../../../application/use-cases/weeks/update-week.use-case.js";
import type { GetWeekDetailByWorkerUseCase } from "../../../application/use-cases/weeks/get-week-detail-by-worker.use-case.js";
import type { DeleteWeekUseCase } from "../../../application/use-cases/weeks/delete-week.use-case.js";
import type { SaveDayUseCase } from "../../../application/use-cases/weeks/save-day.use-case.js";
import type { UpdateDayUseCase } from "../../../application/use-cases/weeks/update-day.use-case.js";

interface WeeksControllerDeps {
  getCurrentWeek: GetCurrentWeekUseCase;
  listWeeks: ListWeeksUseCase;
  listAllWeeks: ListAllWeeksUseCase;
  previewWeek: PreviewWeekUseCase;
  saveWeek: SaveWeekUseCase;
  getWeekDetail: GetWeekDetailUseCase;
  updateWeek: UpdateWeekUseCase;
  getWeekDetailByWorker: GetWeekDetailByWorkerUseCase;
  deleteWeek: DeleteWeekUseCase;
  saveDay: SaveDayUseCase;
  updateDay: UpdateDayUseCase;
}

export function createWeeksController(deps: WeeksControllerDeps) {
  return {
    async list(req: Request, res: Response, next: NextFunction) {
      try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const pageSize = Math.min(
          100,
          Math.max(1, parseInt(req.query.pageSize as string) || 10),
        );
        const result = await deps.listWeeks.execute({ page, pageSize });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async available(_req: Request, res: Response, next: NextFunction) {
      try {
        const weeks = await deps.listAllWeeks.execute();
        res.json(weeks);
      } catch (err) {
        next(err);
      }
    },

    async current(_req: Request, res: Response, next: NextFunction) {
      try {
        const week = await deps.getCurrentWeek.execute();
        res.json(week);
      } catch (err) {
        next(err);
      }
    },

    async preview(req: Request, res: Response, next: NextFunction) {
      try {
        const { weekId, records } = req.body;
        const preview = await deps.previewWeek.execute(weekId, records);
        res.json(preview);
      } catch (err) {
        next(err);
      }
    },

    async save(req: Request, res: Response, next: NextFunction) {
      try {
        const { weekId, records } = req.body;
        const result = await deps.saveWeek.execute(weekId, records);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async getById(req: Request, res: Response, next: NextFunction) {
      try {
        const week = await deps.getWeekDetail.execute(req.params.id as string);
        res.json(week);
      } catch (err) {
        next(err);
      }
    },

    async update(req: Request, res: Response, next: NextFunction) {
      try {
        const { records } = req.body;
        const result = await deps.updateWeek.execute(
          req.params.id as string,
          records,
        );
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async getByWorkerAndWeek(req: Request, res: Response, next: NextFunction) {
      try {
        const week = await deps.getWeekDetailByWorker.execute(
          req.params.weekId as string,
          req.params.workerId as string,
        );
        res.json(week);
      } catch (err) {
        next(err);
      }
    },

    async delete(req: Request, res: Response, next: NextFunction) {
      try {
        await deps.deleteWeek.execute(req.params.id as string);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },

    async saveDay(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await deps.saveDay.execute(req.params.weekId as string);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async updateDay(req: Request, res: Response, next: NextFunction) {
      try {
        const { weekId, date } = req.params;
        const { records } = req.body;
        const result = await deps.updateDay.execute(
          weekId as string,
          date as string,
          records,
        );
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
