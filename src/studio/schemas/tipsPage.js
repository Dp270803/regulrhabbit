import { defineField, defineType, defineArrayMember } from 'sanity';

export const tipsPage = defineType({
  name: 'tipsPage',
  title: 'Tips Page',
  type: 'document',
  groups: [
    { name: 'featured', title: 'Featured Hero' },
    { name: 'categories', title: 'Categories' },
    { name: 'footer', title: 'Footer' },
  ],
  fields: [
    // ── Featured Tip Hero ──
    defineField({
      name: 'featuredEyebrow',
      title: 'Eyebrow label',
      type: 'string',
      group: 'featured',
      description: 'Small uppercase label above the hero heading.',
      initialValue: 'Featured Tip of the Day',
    }),
    defineField({
      name: 'featuredHeadingPrefix',
      title: 'Heading prefix (white text)',
      type: 'string',
      group: 'featured',
      description: 'Text before the gold category name, e.g. "The Science of"',
      initialValue: 'The Science of',
    }),
    defineField({
      name: 'featuredCtaLabel',
      title: 'CTA button label',
      type: 'string',
      group: 'featured',
      description: 'Label on the "Read Masterclass" button.',
      initialValue: 'Read Masterclass',
    }),

    // ── Categories ──
    defineField({
      name: 'categories',
      title: 'Category configuration',
      type: 'array',
      group: 'categories',
      description: 'Display labels for each tip category. Key must stay unchanged.',
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({
            name: 'key',
            title: 'Key (do not change)',
            type: 'string',
            description: 'Internal identifier: technique | recovery | mindset | progress',
          }),
          defineField({ name: 'label', title: 'Display label', type: 'string' }),
        ],
        preview: { select: { title: 'label', subtitle: 'key' } },
      })],
      initialValue: [
        { _key: 'technique', key: 'technique', label: 'Technique' },
        { _key: 'recovery',  key: 'recovery',  label: 'Recovery'  },
        { _key: 'mindset',   key: 'mindset',   label: 'Mindset'   },
        { _key: 'progress',  key: 'progress',  label: 'Progress'  },
      ],
    }),

    // ── Footer ──
    defineField({
      name: 'footerQuote',
      title: 'Footer quote',
      type: 'string',
      group: 'footer',
      description: 'Short motivational line shown beneath the dot grid at the bottom.',
      initialValue: 'Growth Is Nonlinear',
    }),
  ],
  preview: { prepare: () => ({ title: 'Tips Page Content' }) },
});
