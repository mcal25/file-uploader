// Convert a form or query-string value into a positive integer id.
// Number.parseInt("12abc") would return 12, so the stricter Number conversion
// prevents malformed ids from silently targeting a real record.
export function parseId(value) {
  if (value === undefined || value === "") return null;

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
