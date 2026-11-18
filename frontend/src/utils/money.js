export const formatTaka = (n) => {
  const value = Number(n) || 0;
  const hasPaisa = Math.round(value * 100) % 100 !== 0;
  const text = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: hasPaisa ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "−" : ""}৳${text}`;
};

export const formatSigned = (n) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatTaka(Math.abs(n))}`;

// null means "cannot be calculated" (for example, no income -> no savings rate)
export const formatPercent = (n, digits = 0) =>
  n === null || n === undefined ? "—" : `${Number(n).toFixed(digits)}%`;

export const formatPoints = (n) =>
  n === null || n === undefined ? "—" : `${n > 0 ? "+" : ""}${n} pts`;

// "2026-11" -> "Nov 2026"; short=true -> "Nov"
export const monthLabel = (key, short = false) => {
  if (!key) return "";
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    ...(short ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
};

// Current month as seen in Bangladesh, same rule the backend uses.
export const currentMonthKey = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }).slice(0, 7);

export const apiErrorMessage = (error, fallback = "Something went wrong.") => {
  const msg = error?.response?.data?.message;
  return Array.isArray(msg) ? msg[0] : msg || fallback;
};