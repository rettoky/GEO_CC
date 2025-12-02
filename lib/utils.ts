import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSS 클래스 병합 유틸리티
 * shadcn/ui에서 사용
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
