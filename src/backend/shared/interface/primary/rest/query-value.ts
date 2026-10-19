export function queryValue(url: URL, name: string): string | undefined {
  const values = url.searchParams.getAll(name);
  return values.length > 1 ? '\u0000' : values[0];
}
