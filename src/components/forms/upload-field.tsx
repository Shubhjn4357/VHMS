"use client";

import type { ChangeEvent } from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useId, useRef } from "react";
import { toast } from "sonner";

import { UPLOAD_TARGET_RULES } from "@/constants/uploadTargets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeImage } from "@/components/ui/native-image";
import { useFileUpload } from "@/hooks/useFileUpload";
import { cn } from "@/lib/utils/cn";
import type { UploadAssetTarget } from "@/types/upload";

function isImageUrl(value: string) {
  return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(value);
}

type UploadFieldProps = {
  target: UploadAssetTarget;
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function UploadField({
  target,
  label,
  description,
  value,
  onChange,
  disabled = false,
  className,
}: UploadFieldProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isUploading, upload } = useFileUpload();
  const canPreviewImage = Boolean(value) && isImageUrl(value);
  const acceptedTypes = UPLOAD_TARGET_RULES[target].allowedMimeTypes.join(",");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const asset = await upload(target, file);
      onChange(asset.publicUrl);
      toast.success(`${label} uploaded.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Unable to upload ${label}.`,
      );
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <input
        accept={acceptedTypes}
        id={inputId}
        ref={fileInputRef}
        className="hidden"
        disabled={disabled || isUploading}
        onChange={handleFileChange}
        type="file"
      />

      <div className="management-subtle-card rounded-[var(--radius-panel)] border-dashed px-4 py-4">
        {canPreviewImage ? (
          <div className="mb-4 overflow-hidden rounded-[var(--radius)] border border-border/70 bg-background/80">
            <NativeImage
              alt={label}
              className="h-40 w-full object-cover"
              eager
              src={value}
            />
          </div>
        ) : (
          <div className="mb-4 flex h-28 items-center justify-center rounded-[var(--radius)] border border-border/70 bg-background/70 text-sm text-muted-foreground">
            <ImagePlus className="mr-2 h-4 w-4 text-brand" />
            No file uploaded yet
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className="flex-1"
            onChange={(event) => onChange(event.target.value)}
            placeholder="Uploaded file URL will appear here"
            value={value}
          />
          <div className="flex gap-2">
            <Button
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              type="button"
              variant="outline"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              Upload
            </Button>
            {value ? (
              <Button
                disabled={disabled || isUploading}
                onClick={() => onChange("")}
                size="sm"
                type="button"
                variant="destructive"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
