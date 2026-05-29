let counter = 0;

export function generateId(): string {
  counter++;
  return `${Date.now()}-${counter}`;
}
