import DOMPurify from 'dompurify';
import { useMemo } from 'react';

const looksLikeHtml = (text) => /<\/?[a-z][\s\S]*>/i.test(text ?? '');

/**
 * Email bodies are untrusted. HTML is sanitized before it is ever rendered,
 * and anything else is shown as plain text.
 */
export function EmailBody({ body }) {
  const html = useMemo(() => {
    if (!body || !looksLikeHtml(body)) return null;

    return DOMPurify.sanitize(body, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'b',
        'strong',
        'i',
        'em',
        'u',
        'ul',
        'ol',
        'li',
        'blockquote',
        'a',
        'h1',
        'h2',
        'h3',
        'code',
        'pre',
        'span',
      ],
      ALLOWED_ATTR: ['href', 'title'],
      // No remote images: loading one tells the sender you opened the mail.
      FORBID_TAGS: ['img', 'style', 'script', 'iframe', 'form', 'object', 'embed'],
      ALLOW_DATA_ATTR: false,
    });
  }, [body]);

  if (html) {
    return (
      <div
        className="space-y-3 text-md leading-relaxed [&_a]:text-accent [&_a]:underline"
        // Sanitized directly above; nothing executable survives.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return <p className="text-md leading-relaxed whitespace-pre-wrap">{body}</p>;
}
