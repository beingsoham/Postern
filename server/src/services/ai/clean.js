// Shrinking the input is the cheapest accuracy win available to a small
// model: less noise to mislead it, and a much faster response.

const QUOTED_REPLY = /^\s*(>.*|on .*wrote:|-{2,}\s*original message.*)$/gim;
const SIGNATURE = /^\s*--\s*$[\s\S]*/m;
const URL = /https?:\/\/\S+/g;
const WHITESPACE = /[ \t]+/g;
const BLANK_LINES = /\n{3,}/g;

export function cleanBody(body, maxChars = 1200) {
  if (!body) return '';

  const cleaned = body
    .replace(QUOTED_REPLY, '')
    .replace(SIGNATURE, '')
    // Links carry tracking noise and no classification signal.
    .replace(URL, '[link]')
    .replace(WHITESPACE, ' ')
    .replace(BLANK_LINES, '\n\n')
    .trim();

  return cleaned.length > maxChars ? `${cleaned.slice(0, maxChars)}…` : cleaned;
}
