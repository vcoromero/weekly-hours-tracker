import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useWorkers, useWorkerDashboard } from "@/shared/api/queries";
import { useGenerateInvoicePDF, usePayWorker } from "@/shared/api/mutations";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatCurrency } from "@/shared/utils/formatters";
import { ArrowLeft, FileText, Check, CircleDollarSign } from "lucide-react";

export function InvoiceBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedWorkerId = searchParams.get("workerId");

  const { data: workersResult, isLoading: loadingWorkers } = useWorkers({ page: 1, pageSize: 100 });
  const workers = workersResult?.items ?? [];
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(
    preselectedWorkerId || ""
  );
  const { data: dashboard, isLoading: loadingDashboard } = useWorkerDashboard(
    selectedWorkerId || ""
  );

  const generatePdf = useGenerateInvoicePDF();
  const payWorker = usePayWorker();
  const [selectedWeekIds, setSelectedWeekIds] = useState<string[]>([]);

  const eligibleWeeks = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.weeks.filter(
      (w) => w.status === "saved" && !w.isPaid && w.recordCount > 0
    );
  }, [dashboard]);

  const summary = useMemo(() => {
    const selected = eligibleWeeks.filter((w) =>
      selectedWeekIds.includes(w.weekId)
    );
    return {
      count: selected.length,
      totalHours: selected.reduce((sum, w) => sum + w.totalHours, 0),
      totalAmount: selected.reduce((sum, w) => sum + w.totalEarnings, 0),
    };
  }, [eligibleWeeks, selectedWeekIds]);

  const handleToggleWeek = (weekId: string) => {
    setSelectedWeekIds((prev) => {
      if (prev.includes(weekId)) {
        return prev.filter((id) => id !== weekId);
      }
      if (prev.length >= 2) {
        return prev;
      }
      return [...prev, weekId];
    });
  };

  const handleGeneratePdf = async () => {
    if (!selectedWorkerId || selectedWeekIds.length === 0) return;
    try {
      await generatePdf.mutateAsync({
        workerId: selectedWorkerId,
        weekIds: selectedWeekIds,
      });
    } catch {
      // handled by mutation state
    }
  };

  const handlePay = async () => {
    if (!selectedWorkerId || selectedWeekIds.length === 0) return;
    const confirmed = confirm(
      `¿Marcar ${summary.count} semana(s) como pagadas?\n\nTotal: ${formatCurrency(summary.totalAmount)}\n\nEsta acción es irreversible. No se podrán modificar los registros de estas semanas.`
    );
    if (!confirmed) return;
    try {
      await payWorker.mutateAsync({
        workerId: selectedWorkerId,
        weekIds: selectedWeekIds,
      });
      navigate(`/workers/${selectedWorkerId}/dashboard`);
    } catch {
      // handled by mutation state
    }
  };

  if (loadingWorkers) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardHeader className="pb-4">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedWorker = workers.find((w) => w.id === selectedWorkerId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Generar Factura</h1>
        <p className="text-sm text-muted-foreground">
          Selecciona un trabajador y hasta 2 semanas para generar la factura
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Trabajador</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedWorkerId}
            onChange={(e) => {
              setSelectedWorkerId(e.target.value);
              setSelectedWeekIds([]);
            }}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="">Seleccionar trabajador...</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name} ({worker.isRegular ? "Fijo" : "Ocasional"})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedWorkerId && (
        <>
          {loadingDashboard ? (
            <Card>
              <CardHeader className="pb-4">
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : eligibleWeeks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay semanas elegibles para facturar. Las semanas deben estar
                guardadas y no pagadas.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">
                  Semanas elegibles ({eligibleWeeks.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Máx. 2 semanas por factura
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {eligibleWeeks.map((week) => {
                  const isSelected = selectedWeekIds.includes(week.weekId);
                  const isDisabled =
                    !isSelected && selectedWeekIds.length >= 2;
                  return (
                    <button
                      key={week.weekId}
                      onClick={() => handleToggleWeek(week.weekId)}
                      disabled={isDisabled}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {week.label}
                          </span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {week.totalHours}h · {formatCurrency(week.totalEarnings)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {selectedWeekIds.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Semanas:</span>
                  <span className="font-medium">{summary.count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total horas:</span>
                  <span className="font-medium">{summary.totalHours}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monto total:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(summary.totalAmount)}
                  </span>
                </div>
                <Button
                  onClick={handleGeneratePdf}
                  disabled={generatePdf.isPending}
                  className="w-full mt-2"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  {generatePdf.isPending ? "Generando..." : "Generar PDF"}
                </Button>
                <Button
                  onClick={handlePay}
                  disabled={payWorker.isPending}
                  variant="secondary"
                  className="w-full"
                >
                  <CircleDollarSign className="h-4 w-4 mr-1" />
                  {payWorker.isPending ? "Procesando..." : "Marcar como pagadas"}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
