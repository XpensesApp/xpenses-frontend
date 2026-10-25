const STORAGE_KEY = "xpenses.postLoginTarget";

// Only same-origin paths: anything else would turn the login redirect into an
// open redirect. "//host" and "/\host" are both read by browsers as another origin.
function toSafePath(value: string | null): string {
  return value && value.startsWith("/") && !/^\/[/\\]/.test(value) ? value : "/";
}

/** The sign-in round trip leaves the app, so the page to return to is kept in sessionStorage. */
export function rememberPostLoginTarget(callbackUrl: string | null) {
  try {
    sessionStorage.setItem(STORAGE_KEY, toSafePath(callbackUrl));
  } catch {}
}

export function consumePostLoginTarget(): string {
  try {
    const target = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return toSafePath(target);
  } catch {
    return "/";
  }
}
