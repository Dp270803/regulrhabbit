import { defineField, defineType, defineArrayMember } from 'sanity';

export const tipsPage = defineType({
  name: 'tipsPage',
  title: 'Tips Page',
  type: 'document',
  groups: [
    { name: 'featured', title: 'Featured Hero' },
    { name: 'categories', title: 'Categories' },
    { name: 'cards', title: 'Tip Cards' },
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
    defineField({
      name: 'heroImage',
      title: 'Hero background image (upload)',
      type: 'image',
      group: 'featured',
      options: { hotspot: true },
      description: 'Upload a photo directly to Sanity. Takes priority over the URL field below. Recommended: landscape, dark/moody aesthetic.',
    }),
    defineField({
      name: 'heroImageUrl',
      title: 'Hero background image URL (fallback)',
      type: 'url',
      group: 'featured',
      description: 'Used when no uploaded image is set above.',
      initialValue: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD68CMbg3KNXfRMFfnZp0gsXPG21ZD6fzt4WviJGAcrvfPlXq5g9jCY6ppNmVSthfzJh-WaGO_9wuGzaL6xiS4aEZd-2w7ryo4RlE5rD3lpRqBruK3zEByMM0jpeyc3QbaMxgwEmFQw4WML4gkAyoVpw7gc25-RJDaa4NLQMVGF1pP6UU4kL67DoT1Klm2kwxMTPMkuszHaufmVC-NyQcTUUtGk2oBVJXkwrcmI5y-kvxqibuhSS4V9K1QEVB27wOBgNkn0tZSQNGsm',
    }),

    // ── Categories ──
    defineField({
      name: 'categories',
      title: 'Category labels',
      type: 'array',
      group: 'categories',
      description: 'Display labels for each tip category. The key must remain unchanged.',
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

    // ── Tip Cards ──
    defineField({
      name: 'categoryCards',
      title: 'Tip cards (2 per category)',
      type: 'array',
      group: 'cards',
      description: 'Exactly 2 cards per category — 8 total. These populate the grid beneath the hero.',
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({
            name: 'categoryKey',
            title: 'Category',
            type: 'string',
            description: 'technique | recovery | mindset | progress',
          }),
          defineField({ name: 'subcategoryLabel', title: 'Subcategory label', type: 'string', description: 'e.g. Kinematics, Circadian, Focus, Metrics' }),
          defineField({ name: 'title', title: 'Card title', type: 'string' }),
          defineField({ name: 'body', title: 'Card body text', type: 'text' }),
        ],
        preview: { select: { title: 'title', subtitle: 'categoryKey' } },
      })],
      initialValue: [
        { _key: 'tech1', categoryKey: 'technique', subcategoryLabel: 'Kinematics',  title: 'Perfecting the Hinge',     body: 'Mastering the posterior chain engagement for maximum deadlift efficiency.'               },
        { _key: 'tech2', categoryKey: 'technique', subcategoryLabel: 'Stability',   title: 'Unilateral Load Balance',  body: 'Eliminating strength imbalances through focused single-leg movements.'                  },
        { _key: 'rec1',  categoryKey: 'recovery',  subcategoryLabel: 'Circadian',   title: 'The 10-3-2-1 Rule',        body: 'Architecting your evening for optimal growth hormone release during deep sleep.'        },
        { _key: 'rec2',  categoryKey: 'recovery',  subcategoryLabel: 'Hydration',   title: 'Electrolyte Timing',       body: 'Beyond water: How sodium and magnesium influence muscle contraction.'                  },
        { _key: 'mind1', categoryKey: 'mindset',   subcategoryLabel: 'Psychology',  title: 'Cognitive Reframing',      body: 'Converting physiological stress into performance-enhancing focus.'                     },
        { _key: 'mind2', categoryKey: 'mindset',   subcategoryLabel: 'Focus',       title: 'Intrinsic Motivation',     body: 'Building habits that survive the dip in external validation.'                         },
        { _key: 'prog1', categoryKey: 'progress',  subcategoryLabel: 'Metrics',     title: 'Beyond the Scale',         body: 'Tracking HRV, strength velocity, and metabolic flexibility.'                         },
        { _key: 'prog2', categoryKey: 'progress',  subcategoryLabel: 'Strategy',    title: 'Linear vs Wave',           body: 'When to switch periodization models to avoid the 6-month plateau.'                   },
      ],
    }),

    // ── Footer ──
    defineField({
      name: 'footerQuote',
      title: 'Footer quote',
      type: 'string',
      group: 'footer',
      description: 'Short motivational line shown beneath the dot grid.',
      initialValue: 'Growth Is Nonlinear',
    }),
  ],
  preview: { prepare: () => ({ title: 'Tips Page Content' }) },
});
