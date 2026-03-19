"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmationTone = "default" | "danger";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmationTone;
};

type ConfirmationDialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

type ConfirmationRequest = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

const ConfirmationDialogContext =
  createContext<ConfirmationDialogContextValue | null>(null);

function getConfirmButtonVariant(tone: ConfirmationTone) {
  return tone === "danger" ? "destructive" : "default";
}

export function ConfirmationDialogProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);

  const closeRequest = useCallback((confirmed: boolean) => {
    setRequest((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setRequest({
          cancelLabel: "Cancel",
          confirmLabel: "Confirm",
          tone: "default",
          ...options,
          resolve,
        });
      }),
    [],
  );

  const value = useMemo(
    () => ({
      confirm,
    }),
    [confirm],
  );

  return (
    <ConfirmationDialogContext.Provider value={value}>
      {children}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            closeRequest(false);
          }
        }}
        open={request !== null}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{request?.title}</DialogTitle>
            {request?.description ? (
              <DialogDescription>{request.description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => closeRequest(false)}
              type="button"
              variant="outline"
            >
              {request?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              onClick={() => closeRequest(true)}
              type="button"
              variant={getConfirmButtonVariant(request?.tone ?? "default")}
            >
              {request?.confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmationDialogContext.Provider>
  );
}

export function useConfirmationDialog() {
  const context = useContext(ConfirmationDialogContext);

  if (!context) {
    throw new Error(
      "useConfirmationDialog must be used within ConfirmationDialogProvider.",
    );
  }

  return context.confirm;
}
