import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useCurrentWeek, useAvailableWeeks, useWeekRecords, useWeekById, useWorkers } from "@/shared/api/queries";
import {
  useAddRecord,
  useDeleteRecord,
  useSaveWeek,
  useUpdateWeek,
} from "@/shared/api/mutations";
import { api } from "@/shared/api/client";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { CreateRecordInput, Week, WorkRecord } from "@/shared/types";
import { RecordForm } from "./RecordForm";
import { RecordList } from "./RecordList";
import { WeekPreview } from "./WeekPreview";
import { SaveDayButton } from "./SaveDayButton";
import { CapturedDaysSection } from "./CapturedDaysSection";
import { WeekDetailSkeleton } from "./week-detail-skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { ArrowLeft } from "lucide-react";

type Step = "entry" | "preview";

export function WeekEntryPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("entry");
  const [previewData, setPreviewData] = useState<Week | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { id: urlWeekId } = useParams<{ id: string }>();

  const { data: currentWeek, isLoading: currentLoading } = useCurrentWeek();
  const { data: availableWeeks, isLoading: weeksLoading } = useAvailableWeeks();
  const { data: workersResult } = useWorkers({ page: 1, pageSize: 100 });
  const workers = workersResult?.items ?? [];

  const available = availableWeeks || [];
  const [selectedWeekId, setSelectedWeekId] = useState<string>(urlWeekId || "");

  const activeWeekId = selectedWeekId || currentWeek?.id || "";

  const { data: activeWeek, isLoading: activeWeekLoading } = useWeekById(activeWeekId);
  const { data: existingRecords } = useWeekRecords(activeWeekId);

  const week = activeWeek || currentWeek;
  const isLoading = currentLoading || weeksLoading || activeWeekLoading;

  const records: WorkRecord[] = existingRecords || [];

  // Split records into unsaved (editable) and saved (captured, still editable)
  const unsavedRecords = records.filter((r) => !r.daySavedAt);
  const savedRecords = records.filter((r) => !!r.daySavedAt);

  const isEditing = !!urlWeekId;
  const paidWorkerIds = new Set(week?.payments?.map((p) => p.workerId) || []);

  const addRecord = useAddRecord();
  const deleteRecord = useDeleteRecord();
  const saveWeek = useSaveWeek();
  const updateWeek = useUpdateWeek();

  const workersList = workers || [];
  const availableWorkers = isEditing
    ? workersList.filter((w) => !paidWorkerIds.has(w.id))
    : workersList;

  const handleAddRecord = useCallback(
    async (data: CreateRecordInput) => {
      if (!activeWeekId) return;
      try {
        const result = await addRecord.mutateAsync({ ...data, weekId: activeWeekId });
        if (result.week && result.week.id !== activeWeekId) {
          setSelectedWeekId(result.week.id);
        }
      } catch {
        // handled by mutation state
      }
    },
    [activeWeekId, addRecord]
  );

  const handleDeleteRecord = useCallback(
    (recordId: string) => {
      const record = records.find((r) => r.id === recordId);
      if (record && paidWorkerIds.has(record.workerId)) return;
      deleteRecord.mutate(recordId);
    },
    [deleteRecord, records, paidWorkerIds]
  );

  const handlePreview = async () => {
    if (!activeWeekId || records.length === 0) return;
    setSaveError(null);

    const editableRecords = records.filter((r) => !paidWorkerIds.has(r.workerId));

    if (editableRecords.length === 0) {
      setSaveError("No hay registros editables: todos los trabajadores de esta semana ya fueron pagados.");
      return;
    }

    const previewRecords = editableRecords.map((r) => ({
      workerId: r.workerId,
      date: r.date,
      hours: r.hours,
      hourlyRate: r.hourlyRate,
      description: r.description || undefined,
    }));

    try {
      const preview = await api.post<Week>("/weeks/preview", {
        weekId: activeWeekId,
        records: previewRecords,
      });
      setPreviewData(preview);
      setStep("preview");
    } catch (err) {
      setSaveError((err as Error)?.message || "Error al previsualizar");
    }
  };

  const handleSave = async () => {
    if (!activeWeekId || !previewData?.records || previewData.records.length === 0) {
      setSaveError("No hay registros para guardar");
      return;
    }
    setSaveError(null);

    const records = previewData.records.map((r) => ({
      workerId: r.workerId,
      date: r.date,
      hours: r.hours,
      hourlyRate: r.hourlyRate,
      description: r.description || undefined,
    }));

    try {
      const selectedWeek = available.find((w) => w.id === activeWeekId);
      const isAlreadySaved = selectedWeek?.status === "saved";
      if (isAlreadySaved) {
        await updateWeek.mutateAsync({ id: activeWeekId, records });
      } else {
        await saveWeek.mutateAsync({ weekId: activeWeekId, records });
      }
      navigate("/");
    } catch (err) {
      setSaveError((err as Error)?.message || "Error al guardar la semana");
    }
  };

  const handleWeekChange = (value: string) => {
    if (value === "__new__") {
      setSelectedWeekId("");
    } else {
      setSelectedWeekId(value);
    }
    setStep("entry");
    setPreviewData(null);
    setSaveError(null);
  };

  if (isLoading) {
    return <WeekDetailSkeleton />;
  }

  const selectedWeek = available.find((w) => w.id === activeWeekId);
  const isAlreadySaved = selectedWeek?.status === "saved";

  if (step === "preview" && previewData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
        </div>

        {saveError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {saveError}
          </div>
        )}

        <WeekPreview
          week={previewData}
          onSave={handleSave}
          onBack={() => { setSaveError(null); setStep("entry"); }}
          isSaving={saveWeek.isPending || updateWeek.isPending}
          saveLabel={isAlreadySaved ? "Actualizar semana" : "Guardar semana"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="space-y-2 mb-4">
            <Label>Seleccionar semana</Label>
            <Select value={activeWeekId} onValueChange={handleWeekChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una semana" />
              </SelectTrigger>
              <SelectContent>
                {available.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.label} {w.status === "draft" ? "(borrador)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {week && (
            <p className="text-xs text-muted-foreground mb-4">
              {isAlreadySaved
                ? `Editando: ${week.label}`
                : `Nueva semana: ${week.label}`}
            </p>
          )}

          <RecordForm
            weekStart={week?.startDate || ""}
            weekEnd={week?.endDate || ""}
            workers={availableWorkers}
            onSubmit={handleAddRecord}
            isSubmitting={addRecord.isPending}
          />

          {addRecord.error && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription className="text-sm">
                {(addRecord.error as Error)?.message || "Error al agregar registro"}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="md:max-h-[calc(100vh-12rem)] md:overflow-y-auto md:pr-2">
          <RecordList
            records={unsavedRecords}
            onDelete={handleDeleteRecord}
            isDeleting={deleteRecord.isPending}
            readOnlyWorkerIds={isEditing ? paidWorkerIds : undefined}
            headerAction={
              week ? (
                <SaveDayButton
                  weekId={activeWeekId}
                  unlockedRecords={unsavedRecords}
                  weekStatus={week.status}
                />
              ) : undefined
            }
          />
        </div>
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button onClick={handlePreview} disabled={records.length === 0}>
          Vista previa y guardar
        </Button>
      </div>

      <CapturedDaysSection
        capturedRecords={savedRecords}
        onDelete={handleDeleteRecord}
        isDeleting={deleteRecord.isPending}
        readOnlyWorkerIds={isEditing ? paidWorkerIds : undefined}
      />
    </div>
  );
}
