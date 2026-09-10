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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useCreateWorker, useUpdateWorker } from "@/shared/api/mutations";
import type { Worker } from "@/shared/types";

interface WorkerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker?: Worker | null;
}

export function WorkerFormModal({
  open,
  onOpenChange,
  worker,
}: WorkerFormModalProps) {
  const isEditing = worker != null;

  const [name, setName] = useState("");
  const [isRegular, setIsRegular] = useState(true);

  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();

  useEffect(() => {
    if (open) {
      if (worker) {
        setName(worker.name);
        setIsRegular(worker.isRegular);
      } else {
        setName("");
        setIsRegular(true);
      }
    }
  }, [open, worker]);

  useEffect(() => {
    if (!open) {
      createWorker.reset();
      updateWorker.reset();
    }
  }, [open, createWorker, updateWorker]);

  const isPending = createWorker.isPending || updateWorker.isPending;
  const error = createWorker.error || updateWorker.error;

  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      if (isEditing && worker) {
        await updateWorker.mutateAsync({
          id: worker.id,
          name: name.trim(),
          isRegular,
        });
      } else {
        await createWorker.mutateAsync({
          name: name.trim(),
          isRegular,
        });
      }
      onOpenChange(false);
    } catch {
      // handled by mutation state (inline error + toast)
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar trabajador" : "Nuevo trabajador"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del trabajador."
              : "Crea un nuevo trabajador para empezar a registrar horas."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="worker-name">Nombre</Label>
            <Input
              id="worker-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del trabajador"
              disabled={isPending}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="worker-type">Tipo</Label>
            <Select
              value={isRegular ? "regular" : "occasional"}
              onValueChange={(v) => setIsRegular(v === "regular")}
              disabled={isPending}
            >
              <SelectTrigger id="worker-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Fijo</SelectItem>
                <SelectItem value="occasional">Ocasional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-xs text-destructive">
              {error?.message || "Ocurrió un error"}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
          >
            {isPending
              ? "Guardando..."
              : isEditing
                ? "Actualizar"
                : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
