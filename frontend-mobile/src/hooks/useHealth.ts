import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export interface HealthResponse {
  status: string;
  db: string;
  checkedAt: string;
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthResponse>("/health"),
    staleTime: 0,
    refetchInterval: 10_000,
  });
}
