// Tiny class joiner. Falsy entries drop out, so conditional classes read well.
export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}
