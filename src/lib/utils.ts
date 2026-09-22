import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names, letting later Tailwind utilities win over earlier ones. Used by shadcn and 21st.dev components. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
