export function createId(prefix = "id") {
  const randomPart = Math.random().toString(36).slice(2, 12);
  const timePart = Date.now().toString(36);
  return `${prefix}_${timePart}_${randomPart}`;
}
