"use client";

import {
  Camera,
  Loader2,
  ScanBarcode,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemedSelect } from "@/components/ui/themed-select";

type CameraDevice = import("html5-qrcode").CameraDevice;
type Html5QrcodeInstance = import("html5-qrcode").Html5Qrcode;

type BarcodeCameraScannerProps = {
  isOpen: boolean;
  isResolving: boolean;
  onClose: () => void;
  onDetected: (value: string) => void;
};

function parseScannerError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Camera barcode scanner could not start.";
}

function pickPreferredCamera(cameras: CameraDevice[]) {
  const preferred = cameras.find((camera) =>
    /back|rear|environment|world/i.test(camera.label)
  );

  return preferred ?? cameras[0];
}

async function destroyScanner(scanner: Html5QrcodeInstance | null) {
  if (!scanner) {
    return;
  }

  try {
    await scanner.stop();
  } catch {
    // Scanner may already be stopped or not fully started yet.
  }

  try {
    scanner.clear();
  } catch {
    // The underlying container may already be cleared on unmount.
  }
}

export function BarcodeCameraScanner({
  isOpen,
  isResolving,
  onClose,
  onDetected,
}: BarcodeCameraScannerProps) {
  const baseId = useId().replace(/:/g, "");
  const scannerElementId = useMemo(() => `barcode-camera-${baseId}`, [baseId]);
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const handledRef = useRef(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "scanning" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setStatus("idle");
      setErrorMessage(null);
      setCameras([]);
      setSelectedCameraId("");
      handledRef.current = false;
      return;
    }

    let cancelled = false;

    async function loadCameras() {
      setStatus("loading");
      setErrorMessage(null);
      handledRef.current = false;

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const devices = await Html5Qrcode.getCameras();

        if (cancelled) {
          return;
        }

        setCameras(devices);

        if (devices.length === 0) {
          setStatus("error");
          setErrorMessage(
            "No camera was detected on this device. Use the hardware scanner or manual search.",
          );
          return;
        }

        setSelectedCameraId((current) =>
          current && devices.some((device) => device.id === current)
            ? current
            : pickPreferredCamera(devices).id
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setErrorMessage(parseScannerError(error));
      }
    }

    void loadCameras();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedCameraId) {
      return;
    }

    let cancelled = false;
    let activeScanner: Html5QrcodeInstance | null = null;

    async function startScanner() {
      setStatus("loading");
      setErrorMessage(null);
      handledRef.current = false;

      try {
        await destroyScanner(scannerRef.current);
        scannerRef.current = null;

        const {
          Html5Qrcode,
          Html5QrcodeSupportedFormats,
        } = await import("html5-qrcode");

        if (cancelled) {
          return;
        }

        activeScanner = new Html5Qrcode(scannerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        });

        scannerRef.current = activeScanner;

        await activeScanner.start(
          selectedCameraId,
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.333334,
          },
          (decodedText) => {
            if (handledRef.current) {
              return;
            }

            handledRef.current = true;
            onDetected(decodedText.trim());
          },
          () => {},
        );

        if (!cancelled) {
          setStatus("scanning");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setErrorMessage(parseScannerError(error));
      }
    }

    void startScanner();

    return () => {
      cancelled = true;

      if (activeScanner) {
        void destroyScanner(activeScanner);
      } else {
        void destroyScanner(scannerRef.current);
      }

      scannerRef.current = null;
    };
  }, [isOpen, onDetected, scannerElementId, selectedCameraId]);

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <Badge className="w-fit">
            <Camera className="h-3.5 w-3.5" />
            Camera barcode scanner
          </Badge>
          <DialogTitle>
            Scan patient, appointment, billing, or bed codes
          </DialogTitle>
          <DialogDescription>
            Align the barcode inside the frame. The lookup reuses the existing
            protected dashboard barcode route and redirects when there is a
            single exact match.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="default">
            <Camera className="h-3.5 w-3.5" />
            {status === "scanning" ? "Camera live" : "Preparing camera"}
          </Badge>
          {isResolving
            ? (
              <Badge className="bg-primary/12 text-primary" variant="outline">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Resolving code
              </Badge>
            )
            : null}
          {status === "error" && errorMessage
            ? (
              <Badge variant="destructive">
                <ShieldAlert className="h-3.5 w-3.5" />
                Camera unavailable
              </Badge>
            )
            : null}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
          <div>
            <div className="barcode-camera-shell min-h-[340px] overflow-hidden rounded-[28px] border border-border bg-surface-strong">
              <div className="h-[340px] w-full" id={scannerElementId} />
            </div>

            {status === "loading"
              ? (
                <Card className="mt-4">
                  <CardContent className="flex items-center gap-3 pt-5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Requesting camera access and preparing the scanner.
                  </CardContent>
                </Card>
              )
              : null}

            {status === "error" && errorMessage
              ? (
                <Card className="mt-4 border-destructive/20 bg-destructive/5">
                  <CardContent className="pt-5 text-sm leading-6 text-destructive">
                    {errorMessage}
                  </CardContent>
                </Card>
              )
              : null}
          </div>

          <div className="space-y-4">
            <Card className="bg-muted">
              <CardContent className="pt-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
                Scan guidance
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <p>Use the rear camera when available for sharper barcode focus.</p>
                <p>Keep the wristband, receipt, or label flat and fully inside the frame.</p>
                <p>If the camera cannot start, the keyboard wedge scanner still works from the search bar.</p>
              </div>
              </CardContent>
            </Card>

            <Card className="bg-muted">
              <CardContent className="pt-5">
              <label className="block">
                <span className="text-sm font-medium text-foreground">Camera source</span>
                <ThemedSelect
                  className="mt-2 bg-background"
                  onChange={(event) => setSelectedCameraId(event.target.value)}
                  value={selectedCameraId}
                >
                  {cameras.length === 0
                    ? <option value="">Camera unavailable</option>
                    : null}
                  {cameras.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label || "Unnamed camera"}
                    </option>
                  ))}
                </ThemedSelect>
              </label>
              </CardContent>
            </Card>

            <Card className="bg-muted">
              <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background text-primary shadow-sm">
                  <ScanBarcode className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
                    Exact barcode lookup
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Matching is routed through the same protected barcode API
                    used by the hardware scanner flow.
                  </p>
                </div>
              </div>
              </CardContent>
            </Card>

            <Button onClick={onClose} type="button" variant="outline">
              Close scanner
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
