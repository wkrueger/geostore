export function filterWhereObject(where) {
  const out = {};
  Object.entries(where).forEach(([k, v]) => {
    if (v == undefined) return;
    if (isNaN(v as any)) return;
    out[k] = v;
  });
  return out;
}
