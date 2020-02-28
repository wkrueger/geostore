export function error(code: string, message: string, extra?: any) {
  const out = Error(code) as any;
  out.message = message;
  out.extra = extra;
  return out;
}
