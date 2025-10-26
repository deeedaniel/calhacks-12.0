import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDate(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfGiven = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const dayMs = 1000 * 60 * 60 * 24;
  const diffDays = Math.floor(
    (startOfToday.getTime() - startOfGiven.getTime()) / dayMs
  );
  const safeDiffDays = Math.max(0, diffDays);

  if (safeDiffDays === 0) return "Today";
  if (safeDiffDays === 1) return "Yesterday";
  if (safeDiffDays < 7) return `${safeDiffDays} days ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}
