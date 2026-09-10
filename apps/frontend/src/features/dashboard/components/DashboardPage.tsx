import { useNavigate, useSearchParams } from "react-router";
import { useWeeks } from "@/shared/api/queries";
import { Spinner } from "@/shared/components/ui/spinner";
import { Button } from "@/shared/components/ui/button";
import { WeekCard } from "./WeekCard";
import { Pagination } from "@/shared/components/ui/pagination";
import { parsePositiveInt, parsePageSize } from "@/shared/lib/pagination";
import { Plus } from "lucide-react";

const DEFAULT_PAGE_SIZE = 10;

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = parsePageSize(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);

  const { data, isLoading, error } = useWeeks({ page, pageSize });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Tus semanas de trabajo guardadas
          </p>
        </div>
        <Button onClick={() => navigate("/week-entry")}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva semana
        </Button>
      </div>

      {isLoading && <Spinner />}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Error al cargar las semanas. Intenta de nuevo.
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Sin semanas guardadas</p>
          <p className="text-sm mt-1">
            Haz click en "Nueva semana" para registrar horas
          </p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.items.map((week) => (
            <WeekCard key={week.id} week={week} />
          ))}
        </div>
      )}

      {data && (
        <Pagination
          page={data.pagination.page}
          pageSize={data.pagination.pageSize}
          total={data.pagination.total}
          totalPages={data.pagination.totalPages}
          onPageChange={(p) => setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set("page", String(p));
            return next;
          })}
          onPageSizeChange={(size) => {
            setSearchParams(prev => {
              const next = new URLSearchParams(prev);
              next.set("pageSize", String(size));
              next.set("page", "1");
              return next;
            });
          }}
        />
      )}
    </div>
  );
}