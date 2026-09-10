import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Plus, Pencil, Trash2, BarChart3, ArrowLeft, Search } from "lucide-react";
import { useWorkers } from "@/shared/api/queries";
import { useDeleteWorker } from "@/shared/api/mutations";
import { Spinner } from "@/shared/components/ui/spinner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Pagination } from "@/shared/components/ui/pagination";
import { parsePositiveInt, parsePageSize } from "@/shared/lib/pagination";
import { WorkerFormModal } from "./worker-form-modal";
import type { Worker } from "@/shared/types";

const WORKER_FILTERS = ["all", "regular", "occasional"] as const;
type WorkerFilter = (typeof WORKER_FILTERS)[number];

const isWorkerFilter = (v: string | null): v is WorkerFilter =>
  v !== null && (WORKER_FILTERS as readonly string[]).includes(v);

const DEFAULT_PAGE_SIZE = 10;

export function WorkersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = parsePageSize(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);
  const filterParam = searchParams.get("filter");
  const filter: WorkerFilter = isWorkerFilter(filterParam) ? filterParam : "all";
  const [search, setSearch] = useState("");

  const isRegularParam = filter === "regular" ? true : filter === "occasional" ? false : undefined;

  const { data, isLoading, error } = useWorkers({
    page,
    pageSize,
    search: search || undefined,
    isRegular: isRegularParam,
  });

  const deleteWorker = useDeleteWorker();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

  const handleAdd = () => {
    setEditingWorker(null);
    setModalOpen(true);
  };

  const handleEdit = (w: Worker) => {
    setEditingWorker(w);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este trabajador?")) return;
    try {
      await deleteWorker.mutateAsync(id);
    } catch {
      // handled by mutation state
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      return next;
    }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Dashboard
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trabajadores</h1>
          <p className="text-sm text-muted-foreground">
            Administra tus trabajadores
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "regular", "occasional"] as const).map((f) => (
            <Badge
              key={f}
              variant={filter === f ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  next.set("filter", f);
                  next.set("page", "1");
                  return next;
                });
              }}
            >
              {f === "all" ? "Todos" : f === "regular" ? "Fijos" : "Ocasionales"}
            </Badge>
          ))}
        </div>
      </div>

      {isLoading && <Spinner />}

      {error && (
        <p className="text-sm text-destructive">
          Error al cargar trabajadores
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="text-center py-8 text-muted-foreground">
          Sin trabajadores
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.items.map((worker) => (
            <Card key={worker.id} className="py-2">
              <CardContent className="py-2 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{worker.name}</span>
                    <Badge
                      variant={worker.isRegular ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {worker.isRegular ? "Fijo" : "Ocasional"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/workers/${worker.id}/dashboard`)}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(worker)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(worker.id)}
                      disabled={deleteWorker.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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

      <WorkerFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        worker={editingWorker}
      />
    </div>
  );
}
