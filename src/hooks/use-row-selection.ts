"use client";

import { useCallback, useState } from "react";

export function useRowSelection<T extends { id: string }>() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (rows: T[]) => {
      setSelected((prev) => {
        const allSelected = rows.every((r) => prev.has(r.id));
        if (allSelected) {
          const next = new Set(prev);
          rows.forEach((r) => next.delete(r.id));
          return next;
        }
        const next = new Set(prev);
        rows.forEach((r) => next.add(r.id));
        return next;
      });
    },
    []
  );

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback(
    (id: string) => selected.has(id),
    [selected]
  );

  const isAllSelected = useCallback(
    (rows: T[]) => rows.length > 0 && rows.every((r) => selected.has(r.id)),
    [selected]
  );

  const isPartial = useCallback(
    (rows: T[]) => {
      const count = rows.filter((r) => selected.has(r.id)).length;
      return count > 0 && count < rows.length;
    },
    [selected]
  );

  return {
    selected,
    selectedIds: Array.from(selected),
    count: selected.size,
    toggle,
    toggleAll,
    clear,
    isSelected,
    isAllSelected,
    isPartial,
  };
}
