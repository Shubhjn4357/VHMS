"use client";

import { Camera, Loader2, ScanLine, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BarcodeCameraScanner } from "@/components/barcode/barcode-camera-scanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBarcodeLookup } from "@/hooks/useBarcodeLookup";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { useScanner } from "@/hooks/useScanner";
import { cn } from "@/lib/utils/cn";

type GlobalSearchProps = {
  compact?: boolean;
};

export function GlobalSearch({ compact = false }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchQuery = useGlobalSearch(query);
  const barcodeLookup = useBarcodeLookup();

  const handleScannedCode = useCallback(async (value: string) => {
    const normalized = value.trim();

    if (!normalized) {
      return;
    }

    setQuery(normalized);
    setIsOpen(true);
    setScanFeedback(`Captured code ${normalized}. Checking exact barcode matches.`);
    setIsCameraOpen(false);

    try {
      const result = await barcodeLookup.mutateAsync(normalized);

      if (result.redirectHref) {
        setQuery("");
        setIsOpen(false);
        setScanFeedback(null);
        router.push(result.redirectHref);
        return;
      }

      if (result.total === 0) {
        setScanFeedback(
          `No exact barcode match for ${normalized}. Showing broader search results instead.`,
        );
        return;
      }

      setScanFeedback(
        `${result.total} exact barcode matches for ${normalized}. Pick the correct record.`,
      );
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Barcode lookup failed.";
      setScanFeedback(`Lookup failed for ${normalized}.`);
      toast.error(message);
    }
  }, [barcodeLookup, router]);

  useScanner({
    enabled: pathname.startsWith("/dashboard") && !isCameraOpen,
    onScan: handleScannedCode,
  });

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const searchRoot = document.getElementById("global-search-root");

      if (
        searchRoot &&
        event.target instanceof Node &&
        !searchRoot.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const helperText = useMemo(() => {
    if (barcodeLookup.isPending) {
      return "Resolving exact barcode match.";
    }

    if (scanFeedback) {
      return scanFeedback;
    }

    if (query.length < 2) {
      return "Search patients, doctors, bills, appointments, wards, rooms, beds, or scan with hardware or camera.";
    }

    if (searchQuery.isFetching) {
      return "Looking across permitted modules.";
    }

    if (!searchQuery.data || searchQuery.data.total === 0) {
      return "No results in the modules you can access.";
    }

    return `${searchQuery.data.total} result${
      searchQuery.data.total === 1 ? "" : "s"
    } across ${searchQuery.data.sections.length} section${
      searchQuery.data.sections.length === 1 ? "" : "s"
    }.`;
  }, [
    barcodeLookup.isPending,
    query.length,
    scanFeedback,
    searchQuery.data,
    searchQuery.isFetching,
  ]);

  return (
    <div
      className={cn(
        "relative w-full",
        compact ? "max-w-[31rem]" : "max-w-[36rem]",
      )}
      id="global-search-root"
    >
      <label
        className={cn(
          "glass-panel-muted flex items-center gap-3 transition focus-within:border-primary",
          compact ? "rounded-[20px] px-3.5 py-2.5" : "rounded-[24px] px-4 py-3.5",
        )}
      >
        <Search className="h-4 w-4 text-primary" />
        <Input
          className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
          onChange={(event) => {
            setQuery(event.target.value);
            setScanFeedback(null);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={compact
            ? "Search patients, bills, wards, doctors"
            : "Search patients, doctors, bills, appointments, wards, rooms, beds"}
          value={query}
        />
        <Button
          className={cn("shrink-0", compact ? "px-2.5" : "px-3")}
          onClick={() => {
            setIsCameraOpen(true);
            setScanFeedback(null);
            setIsOpen(false);
          }}
          size={compact ? "icon" : "sm"}
          type="button"
          variant="outline"
        >
          <Camera className="h-3.5 w-3.5" />
          {!compact ? "Camera" : <span className="sr-only">Open camera scanner</span>}
        </Button>
        {query
          ? (
            <Button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                setQuery("");
                setScanFeedback(null);
                setIsOpen(false);
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          )
          : (
            <Badge className="hidden shrink-0 sm:inline-flex" variant="outline">
              <ScanLine className="h-3.5 w-3.5" />
              Wedge ready
            </Badge>
          )}
      </label>

      {isOpen
        ? (
          <Card className="absolute left-0 right-0 top-[calc(100%+0.9rem)] z-40 overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{helperText}</p>
                {searchQuery.isFetching || barcodeLookup.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  : null}
              </div>

              {query.length < 2
                ? (
                  <div className="glass-panel-muted mt-4 rounded-[22px] border-dashed p-4 text-sm text-muted-foreground">
                    Type at least 2 characters. Hardware scanners that behave like
                    keyboard wedges can send a code plus Enter, and the camera
                    scanner uses the same barcode lookup route.
                  </div>
                )
                : null}

              {query.length >= 2 && !searchQuery.isFetching &&
                searchQuery.data?.sections.map((section) => (
                  <section key={section.kind} className="mt-4">
                    <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {section.label}
                    </p>
                    <div className="mt-2 space-y-2">
                      {section.results.map((result) => (
                        <Link
                          className="glass-panel-muted flex items-start justify-between gap-4 rounded-[22px] px-4 py-3.5 transition hover:-translate-y-0.5 hover:border-primary/25"
                          href={result.href}
                          key={result.kind + result.id}
                          onClick={() => {
                            setIsOpen(false);
                            setQuery("");
                            setScanFeedback(null);
                          }}
                        >
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {result.title}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {result.subtitle}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <Badge variant="outline">{result.badge}</Badge>
                            {result.exactMatch
                              ? <Badge variant="success">Exact</Badge>
                              : null}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
            </CardContent>
          </Card>
        )
        : null}

      <BarcodeCameraScanner
        isOpen={isCameraOpen}
        isResolving={barcodeLookup.isPending}
        onClose={() => setIsCameraOpen(false)}
        onDetected={(value) => void handleScannedCode(value)}
      />
    </div>
  );
}
