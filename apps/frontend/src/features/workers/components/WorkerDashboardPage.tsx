import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useWorkerDashboard, useWorkers } from "@/shared/api/queries";
import { usePayWorker, useGenerateInvoicePDF } from "@/shared/api/mutations";
import { formatCurrency } from "@/shared/utils/formatters";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { ArrowLeft, Calendar, DollarSign, Hash, Clock, FileText, CircleDollarSign, Check, Download } from "lucide-react";
import { WorkerDashboardSkeleton } from "./worker-dashboard-skeleton";

export function WorkerDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dashboard, isLoading } = useWorkerDashboard(id || "");
  const { data: workersResult } = useWorkers({ page: 1, pageSize: 100 });
  const workers = workersResult?.items ?? [];

  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedPayWeekIds, setSelectedPayWeekIds] = useState<string[]>([]);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedInvoiceWeekIds, setSelectedInvoiceWeekIds] = useState<string[]>([]);

  const payWorker = usePayWorker();
  const generatePdf = useGenerateInvoicePDF();

  const weeks = dashboard?.weeks ?? [];

  const eligibleForPayment = useMemo(
    () => weeks.filter((w) => w.status === "saved" && !w.isPaid && w.recordCount > 0),
    [weeks]
  );

  const paySummary = useMemo(() => {
    const selected = eligibleForPayment.filter((w) => selectedPayWeekIds.includes(w.weekId));
    return {
      count: selected.length,
      totalHours: selected.reduce((sum, w) => sum + w.totalHours, 0),
      totalAmount: selected.reduce((sum, w) => sum + w.totalEarnings, 0),
    };
  }, [eligibleForPayment, selectedPayWeekIds]);

  const eligibleForInvoice = useMemo(
    () => weeks.filter((w) => w.status === "saved" && !w.isPaid && w.recordCount > 0),
    [weeks]
  );

  const invoiceSummary = useMemo(() => {
    const selected = eligibleForInvoice.filter((w) => selectedInvoiceWeekIds.includes(w.weekId));
    return {
      count: selected.length,
      totalHours: selected.reduce((sum, w) => sum + w.totalHours, 0),
      totalAmount: selected.reduce((sum, w) => sum + w.totalEarnings, 0),
    };
  }, [eligibleForInvoice, selectedInvoiceWeekIds]);

  const worker = workers.find((w) => w.id === id);

  if (isLoading) return <WorkerDashboardSkeleton />;

  if (!dashboard || !worker) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Trabajador no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/workers")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
      </div>
    );
  }

  const { stats } = dashboard;

  const togglePayWeek = (weekId: string) => {
    setSelectedPayWeekIds((prev) =>
      prev.includes(weekId)
        ? prev.filter((id) => id !== weekId)
        : [...prev, weekId]
    );
  };

  const handleOpenPayDialog = () => {
    setSelectedPayWeekIds([]);
    setShowPayDialog(true);
  };

  const handleConfirmPayment = async () => {
    if (!id || selectedPayWeekIds.length === 0) return;
    const confirmed = confirm(
      `¿Marcar ${paySummary.count} semana(s) como pagadas?\n\nTotal: ${formatCurrency(paySummary.totalAmount)}\n\nEsta acción es irreversible.`
    );
    if (!confirmed) return;
    try {
      await payWorker.mutateAsync({ workerId: id, weekIds: selectedPayWeekIds });
      setShowPayDialog(false);
      setSelectedPayWeekIds([]);
    } catch {
      // handled by mutation state
    }
  };

  const toggleInvoiceWeek = (weekId: string) => {
    setSelectedInvoiceWeekIds((prev) => {
      if (prev.includes(weekId)) return prev.filter((id) => id !== weekId);
      if (prev.length >= 2) return prev;
      return [...prev, weekId];
    });
  };

  const handleOpenInvoiceDialog = () => {
    setSelectedInvoiceWeekIds([]);
    setShowInvoiceDialog(true);
  };

  const handleGeneratePdf = async () => {
    if (!id || selectedInvoiceWeekIds.length === 0) return;
    try {
      await generatePdf.mutateAsync({ workerId: id, weekIds: selectedInvoiceWeekIds });
      setShowInvoiceDialog(false);
      setSelectedInvoiceWeekIds([]);
    } catch {
      // handled by mutation state
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Trabajadores
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{worker.name}</h1>
        <p className="text-sm text-muted-foreground">
          {worker.isRegular ? "Trabajador fijo" : "Trabajador ocasional"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="py-2">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Total horas
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1 px-3">
            <p className="text-xl font-bold">{stats.totalHours}h</p>
          </CardContent>
        </Card>
        <Card className="py-2">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Ganancias
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1 px-3">
            <p className="text-xl font-bold">
              {formatCurrency(stats.totalEarnings)}
            </p>
          </CardContent>
        </Card>
        <Card className="py-2">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Semanas
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1 px-3">
            <p className="text-xl font-bold">{stats.weeksActive}</p>
          </CardContent>
        </Card>
        <Card className="py-2">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Hash className="h-3 w-3" /> Prom. costo/h
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1 px-3">
            <p className="text-xl font-bold">
              {formatCurrency(stats.averageHourlyRate)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Semanas trabajadas</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPayDialog}
              disabled={eligibleForPayment.length === 0}
            >
              <CircleDollarSign className="h-4 w-4 mr-1" />
              Marcar como pagadas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInvoiceDialog}
              disabled={eligibleForInvoice.length === 0}
            >
              <FileText className="h-4 w-4 mr-1" />
              Generar factura
            </Button>
          </div>
        </div>

        {weeks.length === 0 && (
          <p className="text-muted-foreground text-sm">Sin registros</p>
        )}

        <div className="flex flex-col gap-4">
          {weeks.map((week) => (
            <Link key={week.weekId} to={`/workers/${id}/weeks/${week.weekId}`} className="block">
              <Card className="py-2 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-1 px-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{week.label}</span>
                        <Badge
                          variant={week.status === "saved" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {week.status === "saved" ? "Guardado" : "Borrador"}
                        </Badge>
                        {week.isPaid && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                            Pagada
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{week.totalHours}h</span>
                        <span>{formatCurrency(week.totalEarnings)}</span>
                        <span>{week.recordCount} registros</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como pagadas</DialogTitle>
          </DialogHeader>

          {eligibleForPayment.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No hay semanas disponibles para marcar como pagadas.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eligibleForPayment.map((week) => {
                const isSelected = selectedPayWeekIds.includes(week.weekId);
                return (
                  <button
                    key={week.weekId}
                    onClick={() => togglePayWeek(week.weekId)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded border ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      } flex items-center justify-center`}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="space-y-1">
                        <span className="font-medium text-sm">{week.label}</span>
                        <div className="text-xs text-muted-foreground">
                          {week.totalHours}h · {formatCurrency(week.totalEarnings)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedPayWeekIds.length > 0 && (
            <div className="border-t pt-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Semanas:</span>
                <span className="font-medium">{paySummary.count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total horas:</span>
                <span className="font-medium">{paySummary.totalHours}h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monto total:</span>
                <span className="font-bold text-base">
                  {formatCurrency(paySummary.totalAmount)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPayDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={selectedPayWeekIds.length === 0 || payWorker.isPending}
            >
              {payWorker.isPending ? "Procesando..." : "Confirmar pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar factura</DialogTitle>
          </DialogHeader>

          {eligibleForInvoice.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No hay semanas disponibles para generar factura.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eligibleForInvoice.map((week) => {
                const isSelected = selectedInvoiceWeekIds.includes(week.weekId);
                const isDisabled = !isSelected && selectedInvoiceWeekIds.length >= 2;
                return (
                  <button
                    key={week.weekId}
                    onClick={() => toggleInvoiceWeek(week.weekId)}
                    disabled={isDisabled}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : isDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded border ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      } flex items-center justify-center`}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="space-y-1">
                        <span className="font-medium text-sm">{week.label}</span>
                        <div className="text-xs text-muted-foreground">
                          {week.totalHours}h · {formatCurrency(week.totalEarnings)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedInvoiceWeekIds.length > 0 && (
            <div className="border-t pt-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Semanas:</span>
                <span className="font-medium">{invoiceSummary.count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total horas:</span>
                <span className="font-medium">{invoiceSummary.totalHours}h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monto total:</span>
                <span className="font-bold text-base">
                  {formatCurrency(invoiceSummary.totalAmount)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInvoiceDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGeneratePdf}
              disabled={selectedInvoiceWeekIds.length === 0 || generatePdf.isPending}
            >
              <Download className="h-4 w-4 mr-1" />
              {generatePdf.isPending ? "Generando..." : "Generar PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
