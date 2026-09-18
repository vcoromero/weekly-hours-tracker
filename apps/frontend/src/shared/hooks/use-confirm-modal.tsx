import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConfirmDialog,
  type ConfirmDialogVariant,
} from "@/shared/components/confirm-dialog";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  details?: string[];
}

/**
 * Imperative, promise-based confirmation modal hook.
 *
 * Returns:
 * - `confirm(options)` — opens the dialog and resolves `true` when the user
 *   confirms, `false` when cancelled or dismissed.
 * - `ConfirmDialog` — a component to render once at the page root.
 *
 * @example
 * ```tsx
 * const { confirm, ConfirmDialog } = useConfirmModal();
 *
 * const handleDelete = async () => {
 *   const ok = await confirm({
 *     title: "¿Eliminar?",
 *     description: "Esta acción no se puede deshacer.",
 *     variant: "destructive",
 *     confirmText: "Eliminar",
 *   });
 *   if (!ok) return;
 *   await mutation.mutateAsync(...);
 * };
 *
 * return (
 *   <>
 *     <Button onClick={handleDelete}>Eliminar</Button>
 *     <ConfirmDialog />
 *   </>
 * );
 * ```
 */
export function useConfirmModal() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    setOpen(false);
    resolverRef.current?.(value);
    resolverRef.current = null;
  }, []);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  // Cleanup on unmount: resolve any pending confirmation with false.
  useEffect(() => {
    return () => {
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
    };
  }, []);

  const BoundConfirmDialog = useCallback(
    () =>
      options ? (
        <ConfirmDialog
          open={open}
          onOpenChange={(next) => {
            if (!next) close(false);
          }}
          onConfirm={() => close(true)}
          title={options.title}
          description={options.description}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          variant={options.variant}
          details={options.details}
        />
      ) : null,
    [open, options, close],
  );

  return { confirm, ConfirmDialog: BoundConfirmDialog };
}
