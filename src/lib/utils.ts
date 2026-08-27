import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return "0/-";
  const num = Number(amount);
  const formatted =
    num % 1 === 0
      ? num.toLocaleString("en-IN")
      : num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${formatted}/-`;
}

export function formatDate(date: Date | string | null | undefined, pattern = "dd-MM-yyyy"): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, pattern);
  } catch {
    return String(date);
  }
}

const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const teens = [
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function convertThreeDigit(num: number): string {
  let str = "";
  if (num >= 100) {
    str += singleDigits[Math.floor(num / 100)] + " Hundred ";
    num %= 100;
  }
  if (num >= 10 && num <= 19) {
    str += teens[num - 10] + " ";
  } else if (num >= 20) {
    str += tens[Math.floor(num / 10)] + " ";
    num %= 10;
  }
  if (num >= 1 && num <= 9) {
    str += singleDigits[num] + " ";
  }
  return str.trim();
}

/**
 * Converts numbers to Words following the South Asian Indian/Bangladeshi numbering system
 * e.g., 46500 -> "Forty Six Thousand Five Hundred Taka Only"
 * e.g., 46500.50 -> "Forty Six Thousand Five Hundred Taka and Fifty Paisa Only"
 */
export function numberToWordsTaka(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "Zero Taka Only";
  }

  const raw = Math.abs(Number(amount));
  const num = Math.floor(raw);
  const paisa = Math.round((raw - num) * 100);

  if (num === 0 && paisa === 0) return "Zero Taka Only";

  let words = "";

  if (num > 0) {
    const crore = Math.floor(num / 10000000);
    let remainder = num % 10000000;
    const lakh = Math.floor(remainder / 100000);
    remainder = remainder % 100000;
    const thousand = Math.floor(remainder / 1000);
    remainder = remainder % 1000;
    const hundredAndBelow = remainder;

    if (crore > 0) {
      words += convertThreeDigit(crore) + " Crore ";
    }
    if (lakh > 0) {
      words += convertThreeDigit(lakh) + " Lakh ";
    }
    if (thousand > 0) {
      words += convertThreeDigit(thousand) + " Thousand ";
    }
    if (hundredAndBelow > 0) {
      words += convertThreeDigit(hundredAndBelow) + " ";
    }
    words = `${words.trim()} Taka`;
  }

  if (paisa > 0) {
    const paisaWords = convertThreeDigit(paisa);
    if (words) {
      words += ` and ${paisaWords} Paisa`;
    } else {
      words = `${paisaWords} Paisa`;
    }
  }

  return `${words.trim()} Only`;
}
