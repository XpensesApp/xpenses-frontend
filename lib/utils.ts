import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

/** The HTTP status a service's `parseError` attached to a thrown Error, if any \u2014 lets a caller special-case e.g. a 409 (changed/deleted concurrently) without string-matching the message. */
export function errorStatus(error: unknown): number | undefined {
  return error instanceof Error ? (error as Error & { status?: number }).status : undefined
}

/** A service error's message, falling back to a generic one for anything that isn't an Error (shouldn't normally happen). */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
