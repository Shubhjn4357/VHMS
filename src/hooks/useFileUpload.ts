"use client";

import { useState } from "react";

import type { UploadAssetResponse, UploadAssetTarget } from "@/types/upload";

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);

  async function upload(target: UploadAssetTarget, file: File) {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.set("target", target);
      formData.set("file", file);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const payload = await response.json() as
        | UploadAssetResponse
        | { message?: string };

      if (!response.ok || !("asset" in payload)) {
        throw new Error(
          "message" in payload ? payload.message ?? "Upload failed." : "Upload failed.",
        );
      }

      return payload.asset;
    } finally {
      setIsUploading(false);
    }
  }

  return {
    isUploading,
    upload,
  };
}
