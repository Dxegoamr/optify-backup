import { db } from "@/integrations/firebase/config";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

export interface Plan {
  id: string;
  name: string;
  value?: string; // slug opcional
  price: number; // preço mensal em BRL
  period?: string; // ex.: "/mês"
  features: string[];
  badge?: string; // ex.: "Mais popular"
  highlight?: boolean; // destacar visualmente
  popular?: boolean; // compatibilidade
  order?: number; // para ordenação
  active?: boolean;
}

export const PlansService = {
  async listActivePlans(): Promise<Plan[]> {
    const col = collection(db, "plans");
    const q = query(col, where("active", "==", true), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Plan, "id">) }));
  },
};

export function normalizePlanId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

