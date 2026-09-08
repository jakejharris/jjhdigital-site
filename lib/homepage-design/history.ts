// Undo history for the homepage shuffle. Space pushes a new design,
// Shift + Space steps back, and a new shuffle after stepping back discards the
// designs that were ahead of the cursor (the same model as a browser tab).
export type DesignHistory<T> = {
  readonly current: T;
  readonly canGoBack: boolean;
  readonly size: number;
  push(snapshot: T): T;
  back(): T | undefined;
  reset(): T;
};

export function createDesignHistory<T>(initial: T): DesignHistory<T> {
  let entries: T[] = [initial];
  let index = 0;

  return {
    get current() {
      return entries[index];
    },
    get canGoBack() {
      return index > 0;
    },
    get size() {
      return entries.length;
    },
    push(snapshot) {
      entries = entries.slice(0, index + 1);
      entries.push(snapshot);
      index = entries.length - 1;
      return snapshot;
    },
    back() {
      if (index === 0) return undefined;
      index -= 1;
      return entries[index];
    },
    reset() {
      entries = [entries[0]];
      index = 0;
      return entries[0];
    },
  };
}
