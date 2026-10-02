import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useUpdateDay } from "@/shared/api/mutations";

export interface EditableDayRecord {
  id: string;
  workerId: string;
  workerName: string;
  hours: number;
  hourlyRate: number;
  description: string | null;
}

interface EditDayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekId: string;
  date: string; // YYYY-MM-DD
  records: EditableDayRecord[];
  onSuccess?: () => void;
}

interface RecordDraft {
  recordId: string;
  hours: number;
  hourlyRate: number;
  description: string;
}

interface DraftFieldErrors {
  hours?: string;
  hourlyRate?: string;
}

function validateDraft(draft: RecordDraft): DraftFieldErrors {
  const errors: DraftFieldErrors = {};
  if (!(draft.hours > 0)) {
    errors.hours = "Las horas deben ser mayores que 0";
  }
  if (!(draft.hourlyRate > 0)) {
    errors.hourlyRate = "El costo por hora debe ser mayor que 0";
  }
  return errors;
}

function hasErrors(errors: DraftFieldErrors): boolean {
  return Boolean(errors.hours || errors.hourlyRate);
}

function toDrafts(records: EditableDayRecord[]): RecordDraft[] {
  return records.map((r) => ({
    recordId: r.id,
    hours: r.hours,
    hourlyRate: r.hourlyRate,
    description: r.description ?? "",
  }));
}

export function EditDayModal({
  open,
  onOpenChange,
  weekId,
  date,
  records,
  onSuccess,
}: EditDayModalProps) {
  const [drafts, setDrafts] = useState<RecordDraft[]>(() => toDrafts(records));
  const [draftErrors, setDraftErrors] = useState<
    Record<string, DraftFieldErrors>
  >({});
  const updateDay = useUpdateDay();

  useEffect(() => {
    if (open) {
      setDrafts(toDrafts(records));
      setDraftErrors({});
    }
  }, [open, records]);

  useEffect(() => {
    if (!open) {
      updateDay.reset();
      setDraftErrors({});
    }
  }, [open, updateDay]);

  const isPending = updateDay.isPending;
  const error = updateDay.error;

  const updateDraft = (
    recordId: string,
    patch: Partial<Omit<RecordDraft, "recordId">>,
  ) => {
    setDrafts((prev) =>
      prev.map((d) => (d.recordId === recordId ? { ...d, ...patch } : d)),
    );
    // Clear validation errors for the edited fields as the user types
    setDraftErrors((prev) => {
      const current = prev[recordId];
      if (!current) return prev;
      const next: DraftFieldErrors = { ...current };
      if ("hours" in patch) delete next.hours;
      if ("hourlyRate" in patch) delete next.hourlyRate;
      if (!hasErrors(next)) {
        const { [recordId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [recordId]: next };
    });
  };

  const handleSubmit = async () => {
    if (isPending) return;

    // Validate all drafts before submitting; block if any draft is invalid
    const errors: Record<string, DraftFieldErrors> = {};
    for (const draft of drafts) {
      const draftErrors = validateDraft(draft);
      if (hasErrors(draftErrors)) {
        errors[draft.recordId] = draftErrors;
      }
    }
    if (Object.keys(errors).length > 0) {
      setDraftErrors(errors);
      return;
    }

    const payload = drafts.map((d) => ({
      recordId: d.recordId,
      hours: d.hours,
      hourlyRate: d.hourlyRate,
      description: d.description.trim() || undefined,
    }));

    try {
      await updateDay.mutateAsync({ weekId, date, records: payload });
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // handled by mutation state (inline error + toast)
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar registros del día</DialogTitle>
          <DialogDescription>
            Modifica horas, costo por hora o descripción de los registros.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {drafts.map((draft, index) => {
            const record = records[index];
            return (
              <div
                key={draft.recordId}
                className="rounded-lg border bg-muted/30 p-3 space-y-2"
              >
                <p className="text-sm font-medium">
                  {record?.workerName || "Desconocido"}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor={`hours-${draft.recordId}`}
                      className="text-xs"
                    >
                      Horas
                    </Label>
                    <Input
                      id={`hours-${draft.recordId}`}
                      type="number"
                      step="0.5"
                      min="0"
                      value={draft.hours}
                      onChange={(e) =>
                        updateDraft(draft.recordId, {
                          hours: Number(e.target.value),
                        })
                      }
                      disabled={isPending}
                      aria-invalid={Boolean(draftErrors[draft.recordId]?.hours)}
                      className="h-9"
                    />
                    {draftErrors[draft.recordId]?.hours && (
                      <p className="text-xs text-destructive">
                        {draftErrors[draft.recordId].hours}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor={`rate-${draft.recordId}`}
                      className="text-xs"
                    >
                      Costo/hora ($)
                    </Label>
                    <Input
                      id={`rate-${draft.recordId}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={draft.hourlyRate}
                      onChange={(e) =>
                        updateDraft(draft.recordId, {
                          hourlyRate: Number(e.target.value),
                        })
                      }
                      disabled={isPending}
                      aria-invalid={Boolean(
                        draftErrors[draft.recordId]?.hourlyRate,
                      )}
                      className="h-9"
                    />
                    {draftErrors[draft.recordId]?.hourlyRate && (
                      <p className="text-xs text-destructive">
                        {draftErrors[draft.recordId].hourlyRate}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`desc-${draft.recordId}`} className="text-xs">
                    Descripción (opcional)
                  </Label>
                  <Input
                    id={`desc-${draft.recordId}`}
                    value={draft.description}
                    onChange={(e) =>
                      updateDraft(draft.recordId, {
                        description: e.target.value,
                      })
                    }
                    disabled={isPending}
                    placeholder="Ej. Turno mañana"
                    className="h-9"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="text-xs text-destructive">
            {error?.message || "Ocurrió un error al actualizar el día"}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
