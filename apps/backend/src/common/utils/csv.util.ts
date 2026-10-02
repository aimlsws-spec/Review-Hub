/**
 * A CSV cell, quoted when it needs to be. A cell that starts with =, +, - or @ would be run as a formula by a
 * spreadsheet, and names come from users, so those get a leading apostrophe to be shown as plain text.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
