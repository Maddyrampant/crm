export type SortDirection = "asc" | "desc";

export type ColumnSort = {
  column: string;
  direction: SortDirection;
};

export function nextSortDirection(current: SortDirection): SortDirection {
  return current === "asc" ? "desc" : "asc";
}
