/**
 * 計算兩個 settings 物件之間的差異
 * @returns diff 物件: { field: { old, new } }，只包含有變更的欄位
 */
export function computeDiff(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of Object.keys(newValues)) {
    const oldVal = oldValues[key];
    const newVal = newValues[key];

    if (!isEqual(oldVal, newVal)) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }

  return diff;
}

/**
 * 深度相等比較（支援 primitive, array, object）
 */
export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => isEqual(val, b[i]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
    for (const key of keys) {
      if (!isEqual(aObj[key], bObj[key])) return false;
    }
    return true;
  }

  return false;
}
