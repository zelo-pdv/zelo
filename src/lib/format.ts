export const currency = (v?: number | string | null) => {
  if (v === undefined || v === null || v === "") return "R$ 0,00";
  const num = typeof v === "number" ? v : Number(v);
  if (isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

export const dateTime = (iso: string | Date) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export const initials = (name: string) =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const isToday = (iso: string) => {
  const d = new Date(iso);
  const n = new Date();
  return d.toDateString() === n.toDateString();
};

export const formatDateOnly = (val: string | Date | null | undefined) => {
  if (!val) return "";
  const d = typeof val === "string" ? val : val.toISOString();
  const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, day] = match;
    return `${day}/${m}/${y}`;
  }
  return new Date(val).toLocaleDateString("pt-BR", { timeZone: "UTC" });
};
