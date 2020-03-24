export function filterWhereObject(where, nullIfEmpty = false): any {
  const out = {};
  Object.entries(where).forEach(([k, v]) => {
    if (v == undefined) return;
    if (isNaN(v as any)) return;
    out[k] = v;
  });
  if (nullIfEmpty && Object.keys(out).length === 0) return undefined;
  return out;
}
