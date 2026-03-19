import type { ImgHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type NativeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "alt"> & {
  alt: string;
  eager?: boolean;
};

export function NativeImage({
  alt,
  className,
  decoding,
  eager = false,
  loading,
  ...props
}: NativeImageProps) {
  return (
    // Centralized native image wrapper for runtime previews, CMS content, and print branding.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={cn(className)}
      decoding={decoding ?? "async"}
      loading={loading ?? (eager ? "eager" : "lazy")}
      {...props}
    />
  );
}
