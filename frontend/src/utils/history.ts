export interface HistoryEntry {
  id: string;
  size: number;
  cityCode: number;
  cityName: string;
  rooms: number;
  balconies: number;
  parking: number;
  floor: number;
  buildingAge: string;
  price: number;
  createdAt: string;
}

const KEY = "yadata_history";
const MAX = 20;

export function getHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "createdAt">): void {
  const history = getHistory();
  const full: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const next = [full, ...history].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearHistory(): void {
  localStorage.removeItem(KEY);
}
