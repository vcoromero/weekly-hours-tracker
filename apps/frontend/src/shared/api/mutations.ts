import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./client";
import type { Worker, CreateRecordInput, Week } from "../types";

export function useCreateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; isRegular: boolean }) =>
      api.post<Worker>("/workers", data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Trabajador creado correctamente");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al crear trabajador");
    },
  });
}

export function useUpdateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string; name?: string; isRegular?: boolean }) =>
      api.put<Worker>(`/workers/${id}`, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Trabajador actualizado correctamente");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al actualizar trabajador");
    },
  });
}

export function useDeleteWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workers/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}

export function useAddRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRecordInput & { weekId: string }) =>
      api.post<{ id: string; weekId: string; week?: { id: string; label: string; startDate: string; endDate: string; status: string } }>("/records", data),
    onSuccess: async (_result) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["weeks", "current"] }),
        qc.invalidateQueries({ queryKey: ["weeks"] }),
        qc.invalidateQueries({ queryKey: ["weeks", "available"] }),
        qc.invalidateQueries({ queryKey: ["records"] }),
        qc.invalidateQueries({ queryKey: ["workers"] }),
      ]);
    },
  });
}

export function useDeleteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/records/${id}`),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["weeks", "current"] }),
        qc.invalidateQueries({ queryKey: ["weeks"] }),
        qc.invalidateQueries({ queryKey: ["weeks", "available"] }),
        qc.invalidateQueries({ queryKey: ["records"] }),
        qc.invalidateQueries({ queryKey: ["workers"] }),
      ]);
    },
  });
}

export function useSaveWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { weekId: string; records: CreateRecordInput[] }) =>
      api.post<Week>("/weeks/save", data),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["weeks"] }),
        qc.invalidateQueries({ queryKey: ["weeks", "current"] }),
        qc.invalidateQueries({ queryKey: ["weeks", "available"] }),
        qc.invalidateQueries({ queryKey: ["records"] }),
        qc.invalidateQueries({ queryKey: ["workers"] }),
      ]);
    },
  });
}

export function useUpdateWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      records,
    }: {
      id: string;
      records: CreateRecordInput[];
    }) => api.put<Week>(`/weeks/${id}`, { records }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["weeks"] }),
        qc.invalidateQueries({ queryKey: ["weeks", variables.id] }),
        qc.invalidateQueries({ queryKey: ["weeks", "available"] }),
        qc.invalidateQueries({ queryKey: ["records"] }),
        qc.invalidateQueries({ queryKey: ["workers"] }),
      ]);
    },
  });
}

export function usePayWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workerId, weekIds }: { workerId: string; weekIds: string[] }) =>
      api.post<{ paidWeeks: number; totalAmount: number }>(`/workers/${workerId}/pay`, { weekIds }),
    onSuccess: async (data) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["workers"] }),
        qc.invalidateQueries({ queryKey: ["weeks"] }),
      ]);
      toast.success(`${data.paidWeeks} week(s) marked as paid`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error marking as paid");
    },
  });
}

export function useDeleteWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/weeks/${id}`),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["weeks"] }),
        qc.invalidateQueries({ queryKey: ["weeks", "current"] }),
      ]);
    },
  });
}

export function useSaveDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (weekId: string) =>
      api.post<{ savedDate: string; recordsCount: number }>(
        `/weeks/${weekId}/save-day`
      ),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["records"] }),
        qc.invalidateQueries({ queryKey: ["weeks"] }),
        qc.invalidateQueries({ queryKey: ["workers"] }),
      ]);
    },
  });
}

export function useGenerateInvoicePDF() {
  return useMutation({
    mutationFn: async ({ workerId, weekIds }: { workerId: string; weekIds: string[] }) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/workers/${workerId}/invoice/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ weekIds }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Error generating invoice" }));
        throw new Error(error.error || "Error generating invoice");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      a.download = match ? match[1] : "invoice.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success("Invoice PDF generated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error generating invoice");
    },
  });
}
