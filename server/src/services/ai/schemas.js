import { z } from 'zod';

export const CATEGORIES = [
  'academic',
  'work',
  'recruiting',
  'finance',
  'security',
  'newsletter',
  'social',
  'other',
];

export const PRIORITIES = ['urgent', 'important', 'normal', 'low'];

// What we accept back from the model. Anything outside this is rejected and
// the rule result stands in.
export const ClassificationSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  requires_reply: z.boolean(),
  action_items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(300),
        // Any non-empty string is accepted here. Whether it is a real,
        // plausible date is decided by reconcileDueDate, which has the
        // email timestamp to check it against. Rejecting the shape at this
        // layer threw away otherwise correct classifications.
        due_date: z.string().trim().min(1).nullable().catch(null),
      }),
    )
    .max(8)
    .default([]),
  reason: z.string().trim().max(160),
});

// The same shape expressed for Ollama's `format` parameter. Constrained
// decoding makes invalid JSON structurally unreachable, which is what lets a
// small model be reliable here.
export const classificationFormat = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: CATEGORIES },
    priority: { type: 'string', enum: PRIORITIES },
    requires_reply: { type: 'boolean' },
    action_items: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          due_date: { type: ['string', 'null'] },
        },
        required: ['description', 'due_date'],
      },
    },
    reason: { type: 'string' },
  },
  required: ['category', 'priority', 'requires_reply', 'action_items', 'reason'],
};

export const BriefingSchema = z.object({
  headline: z.string().trim().max(120),
  needs_attention: z
    .array(z.object({ email_id: z.number().int(), note: z.string().max(160) }))
    .max(5)
    .default([]),
  reply_needed: z
    .array(z.object({ email_id: z.number().int(), note: z.string().max(160) }))
    .max(5)
    .default([]),
  action_items: z
    .array(z.object({ task_id: z.number().int(), note: z.string().max(160) }))
    .max(5)
    .default([]),
  next_step: z.string().trim().max(200),
});

const refItem = (key) => ({
  type: 'object',
  properties: { [key]: { type: 'integer' }, note: { type: 'string' } },
  required: [key, 'note'],
});

export const briefingFormat = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    needs_attention: { type: 'array', maxItems: 5, items: refItem('email_id') },
    reply_needed: { type: 'array', maxItems: 5, items: refItem('email_id') },
    action_items: { type: 'array', maxItems: 5, items: refItem('task_id') },
    next_step: { type: 'string' },
  },
  required: ['headline', 'needs_attention', 'reply_needed', 'action_items', 'next_step'],
};

export const DraftSchema = z.object({ content: z.string().trim().min(1).max(2000) });

export const draftFormat = {
  type: 'object',
  properties: { content: { type: 'string' } },
  required: ['content'],
};
