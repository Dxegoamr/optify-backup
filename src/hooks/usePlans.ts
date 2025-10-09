import { useQuery } from "@tanstack/react-query";
import { PlansService, Plan } from "@/core/services/plans.service";

export function usePlans() {
  return useQuery<Plan[]>({
    queryKey: ["plans", "active"],
    queryFn: () => PlansService.listActivePlans(),
    staleTime: 1000 * 60 * 5,
  });
}


