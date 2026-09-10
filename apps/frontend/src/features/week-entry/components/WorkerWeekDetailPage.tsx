import { useParams, useNavigate } from "react-router";
import { useWorkerWeek } from "@/shared/api/queries";
import { useDeleteWeek } from "@/shared/api/mutations";
import { formatCurrency, formatDateShort } from "@/shared/utils/formatters";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ArrowLeft, Pencil, Trash2, User } from "lucide-react";

export function WorkerWeekDetailPage() {
  const { id: workerId, weekId } = useParams<{ id: string; weekId: string }>();
  const navigate = useNavigate();
  const { data: week, isLoading, error } = useWorkerWeek(workerId || "", weekId || "");
  const deleteWeek = useDeleteWeek();

  const handleDelete = async () => {
    if (!weekId || !confirm("¿Eliminar esta semana permanentemente?")) return;
    try {
      await deleteWeek.mutateAsync(weekId);
      navigate(`/workers/${workerId}/dashboard`);
    } catch {
      // handled by mutation state
    }
  };

  if (isLoading) {
    return <Spinner />;
  }

  if (error || !week) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se pudo cargar la semana</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`/workers/${workerId}/dashboard`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver al trabajador
        </Button>
      </div>
    );
  }

  const workerRecords = week.records || [];
  const workerTotal = week.totalsByWorker?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver al trabajador
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <User className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">{workerTotal?.workerName || "Trabajador"}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {week.label} — {week.startDate} → {week.endDate}
          </p>
        </div>
        <div className="flex gap-2">
          {!week.isPaid && (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(`/weeks/${weekId}/edit`)}>
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteWeek.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {deleteWeek.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </>
          )}
          {week.isPaid && (
            <span className="inline-flex items-center rounded-full border border-green-500/50 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
              Pagada
            </span>
          )}
        </div>
      </div>

      {workerRecords.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Sin registros esta semana</p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 pb-2 font-medium">Fecha</th>
                  <th className="p-4 pb-2 font-medium text-right">Horas</th>
                  <th className="p-4 pb-2 font-medium text-right">Costo/h</th>
                  <th className="p-4 pb-2 font-medium text-right">Total</th>
                  <th className="p-4 pb-2 font-medium">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {workerRecords.map((record) => (
                  <tr key={record.id} className="border-b last:border-0">
                    <td className="p-4 py-2">{formatDateShort(record.date)}</td>
                    <td className="p-4 py-2 text-right">{record.hours}h</td>
                    <td className="p-4 py-2 text-right">
                      {formatCurrency(record.hourlyRate)}
                    </td>
                    <td className="p-4 py-2 text-right font-medium">
                      {formatCurrency(record.total || record.hours * record.hourlyRate)}
                    </td>
                    <td className="p-4 py-2 text-muted-foreground">
                      {record.description || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {workerTotal && (
        <Card className="bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total de {workerTotal.workerName}</span>
              <span className="text-primary">
                {workerTotal.totalHours}h — {formatCurrency(workerTotal.totalAmount)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
