"use client";

import { Camera, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { BarcodeCameraScanner } from "@/components/barcode/barcode-camera-scanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_TEXT } from "@/constants/appText";
import { useAppShell } from "@/hooks/useAppShell";
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
  const deferredQuery = useDeferredValue(query);
  const router = useRouter();
  const pathname = usePathname();
  const { setGlobalSearchOpen } = useAppShell();
  const searchQuery = useGlobalSearch(deferredQuery);
  const barcodeLookup = useBarcodeLookup();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const closeSearch = useCallback(
    ({ clearQuery = false }: { clearQuery?: boolean } = {}) => {
      setIsOpen(false);
      setScanFeedback(null);
      setGlobalSearchOpen(false);

      if (clearQuery) {
        setQuery("");
      }
    },
    [setGlobalSearchOpen],
  );

  const handleScannedCode = useCallback(async (value: string) => {
    const normalized = value.trim();

    if (!normalized) {
      return;
    }

    setQuery(normalized);
    setIsOpen(true);
    setGlobalSearchOpen(true);
    setScanFeedback(`Captured code ${normalized}. Checking exact barcode matches.`);
    setIsCameraOpen(false);

    try {
      const result = await barcodeLookup.mutateAsync(normalized);

      if (result.redirectHref) {
        closeSearch({ clearQuery: true });
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
  }, [barcodeLookup, closeSearch, router, setGlobalSearchOpen]);

  useScanner({
    enabled: pathname.startsWith("/dashboard") && !isCameraOpen,
    onScan: handleScannedCode,
  });

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        closeSearch();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [closeSearch]);

  const helperText = useMemo(() => {
    if (barcodeLookup.isPending) {
      return APP_TEXT.SHELL.SEARCH_RESOLVING_BARCODE;
    }

    if (scanFeedback) {
      return scanFeedback;
    }

    if (query.length < 2) {
      return APP_TEXT.SHELL.SEARCH_IDLE;
    }

    if (searchQuery.isFetching) {
      return APP_TEXT.SHELL.SEARCH_LOADING;
    }

    if (!searchQuery.data || searchQuery.data.total === 0) {
      return APP_TEXT.SHELL.SEARCH_EMPTY;
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
        "relative w-full transition-all duration-300",
        compact ? "max-w-xl" : "max-w-3xl",
      )}
      ref={rootRef}
    >
      <label
        className={cn(
          "flex items-center gap-2 rounded-[var(--radius-control)] border bg-background transition-all duration-300 shadow-[var(--shadow-soft)] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
          compact ? "min-h-10 px-3" : "min-h-11 px-4",
        )}
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
          onChange={(event) => {
            setQuery(event.target.value);
            setScanFeedback(null);
            setIsOpen(true);
            setGlobalSearchOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setGlobalSearchOpen(true);
          }}
          placeholder={APP_TEXT.SHELL.SEARCH_PLACEHOLDER}
          value={query}
        />

        <div className="flex items-center gap-2">
          {query ? (
            <Button
              className="h-8 w-8 rounded-md text-muted-foreground"
              onClick={() => {
                closeSearch({ clearQuery: true });
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="h-8 w-8 rounded-md text-muted-foreground"
              onClick={() => {
                setIsCameraOpen(true);
                closeSearch();
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Camera className="h-4 w-4" />
            </Button>
          )}
        </div>
      </label>

      {isOpen ? (
        <Card className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-[var(--radius-panel)] border bg-popover shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {APP_TEXT.SHELL.SEARCH_LIVE}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>
              </div>
              {(searchQuery.isFetching || barcodeLookup.isPending) ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : null}
            </div>

            <div className="max-h-[50vh] overflow-y-auto pr-1 scrollbar-none">
              {query.length < 2 ? (
                <div className="mt-4 rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                  {APP_TEXT.SHELL.SEARCH_TYPING}
                </div>
              ) : null}

              {query.length >= 2 && !searchQuery.isFetching
                ? searchQuery.data?.sections.map((section) => (
                    <section key={section.kind} className="mt-4 first:mt-2">
                      <p className="px-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {section.label}
                      </p>
                      <div className="mt-2 space-y-1">
                        {section.results.map((result) => (
                          <Link
                            className="flex items-center justify-between gap-4 rounded-md px-3 py-3 transition-colors hover:bg-accent hover:text-accent-foreground"
                            href={result.href}
                            key={result.kind + result.id}
                            onClick={() => {
                              closeSearch({ clearQuery: true });
                            }}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                                {result.title}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {result.subtitle}
                              </p>
                            </div>
                            <Badge className="h-6 px-2 py-0" variant="outline">
                              {result.badge}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </section>
                  ))
                : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <BarcodeCameraScanner
        isOpen={isCameraOpen}
        isResolving={barcodeLookup.isPending}
        onClose={() => setIsCameraOpen(false)}
        onDetected={(value) => void handleScannedCode(value)}
      />
    </div>
  );
}
