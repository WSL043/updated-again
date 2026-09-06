/** Bound rendered archive cards and projector options, not the append-only feed. */
export function paginate<T>(items: readonly T[], requestedPage: number, pageSize = 24) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error("Invalid page size.");
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(pages, Math.max(1, Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 1));
  const offset = (page - 1) * pageSize;
  return { items: items.slice(offset, offset + pageSize), page, pages, start: items.length ? offset + 1 : 0, end: Math.min(offset + pageSize, items.length), total: items.length };
}
