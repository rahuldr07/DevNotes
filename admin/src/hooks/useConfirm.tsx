"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions;
}

const DEFAULT_OPTIONS: ConfirmOptions = {
  title: "",
  description: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  destructive: false,
};

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    options: DEFAULT_OPTIONS,
  });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  // Async API — mirrors window.confirm() but themed and non-blocking
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, options });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  const ConfirmDialog = useCallback(() => {
    const { title, description, confirmLabel, cancelLabel, destructive } =
      state.options;
    return (
      <Dialog
        open={state.open}
        onOpenChange={(o) => {
          if (!o) handleCancel();
        }}
      >
        <DialogContent
          className="max-w-sm"
          style={{
            backgroundColor: "var(--sub-alt-color)",
            border: "1px solid var(--border-color)",
            color: "var(--text-color)",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "var(--text-color)" }}>
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription style={{ color: "var(--sub-color)" }}>
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="transition-opacity hover:opacity-70"
              style={{ color: "var(--sub-color)" }}
            >
              {cancelLabel ?? "Cancel"}
            </Button>
            <Button
              onClick={handleConfirm}
              className="transition-opacity hover:opacity-90"
              style={{
                backgroundColor: destructive
                  ? "var(--error-color)"
                  : "var(--main-color)",
                color: "var(--bg-color)",
                border: "none",
              }}
            >
              {confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }, [state, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialog };
}
