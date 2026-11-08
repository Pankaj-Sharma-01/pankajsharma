/**
 * The site is exported with `trailingSlash: true`, so canonical URLs end in "/".
 */
export function withTrailingSlash(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

/** Strips a trailing slash (except for the root) so paths compare reliably. */
export function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}
