export function error(code: string, message: string, extra?: any) {
  const out = Error(message) as any;
  out.message = message;
  out.code = code;
  out.extra = extra;
  return out;
}
