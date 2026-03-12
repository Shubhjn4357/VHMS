"use client";

import { useSession } from "next-auth/react";

export function useAuthUser() {
  const { data, status } = useSession();

  return {
    status,
    user: data?.user ?? null,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
  };
}
