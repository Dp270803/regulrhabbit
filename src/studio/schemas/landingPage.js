import { defineField, defineType, defineArrayMember } from 'sanity';

export const landingPage = defineType({
  name: 'landingPage',
  title: 'Landing Page',
  type: 'document',
  groups: [
    { name: 'hero', title: 'Hero' },
    { name: 'science', title: 'Science Section' },
    { name: 'cta', title: 'CTA Section' },
    { name: 'other', title: 'Other' },
  ],
  fields: [
    // ── Hero ──
    defineField({ name: 'heroHeading', title: 'Heading (white part)', type: 'string', group: 'hero', initialValue: 'Become a' }),
    defineField({ name: 'heroAccent', title: 'Heading Accent (gold part)', type: 'string', group: 'hero', initialValue: 'regular.' }),
    defineField({ name: 'heroSubtitle', title: 'Subtitle', type: 'string', group: 'hero', initialValue: 'Build the habit of showing up. No friction, just focus.' }),
    defineField({ name: 'heroCtaText', title: 'CTA Button Label', type: 'string', group: 'hero', initialValue: 'Start for free' }),
    defineField({ name: 'heroCtaNote', title: 'Note below CTA', type: 'string', group: 'hero', initialValue: 'No account · 2 minutes' }),
    defineField({
      name: 'proofPoints',
      title: 'Proof Point Cards (4)',
      type: 'array',
      group: 'hero',
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({ name: 'icon', title: 'Material Symbol name', type: 'string', description: 'e.g. calendar_today, rule, no_accounts, tips_and_updates' }),
          defineField({ name: 'tag', title: 'Category label', type: 'string' }),
          defineField({ name: 'title', title: 'Card title', type: 'string' }),
        ],
        preview: { select: { title: 'title', subtitle: 'tag' } },
      })],
    }),

    // ── Science ──
    defineField({ name: 'scienceEyebrow', title: 'Eyebrow label', type: 'string', group: 'science', initialValue: 'The Science' }),
    defineField({ name: 'scienceHeading', title: 'Heading', type: 'string', group: 'science', initialValue: 'The high cost of missing twice.' }),
    defineField({ name: 'scienceBody', title: 'Body text', type: 'text', group: 'science', initialValue: 'One miss is an accident. Two misses is the start of a new habit. Our system is built around the "2-Day Rule" — never let a lapse happen twice in a row. This prevents the spiral of failure and keeps your identity intact.' }),
    defineField({
      name: 'scienceBullets',
      title: 'Bullet points',
      type: 'array',
      group: 'science',
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({ name: 'title', title: 'Bold label', type: 'string' }),
          defineField({ name: 'body', title: 'Description', type: 'string' }),
        ],
        preview: { select: { title: 'title' } },
      })],
    }),
    defineField({
      name: 'scienceImage',
      title: 'Science section image (square, dark aesthetic)',
      type: 'image',
      group: 'science',
      options: { hotspot: true },
      description: 'Recommended: 800×800px. The obsidian/textured sphere shown beside the 2-Day Rule text.',
    }),

    // ── CTA ──
    defineField({ name: 'ctaHeading', title: 'CTA Heading', type: 'string', group: 'cta', initialValue: 'Ready to show up?' }),
    defineField({ name: 'ctaSubtitle', title: 'CTA Subtitle', type: 'string', group: 'cta', initialValue: 'Join 12,000+ others who stopped chasing hacks and started becoming regulars.' }),
    defineField({ name: 'ctaButtonText', title: 'CTA Button Label', type: 'string', group: 'cta', initialValue: 'Start your first plan' }),

    // ── Other ──
    defineField({ name: 'footerLeft', title: 'Footer left text', type: 'string', group: 'other', initialValue: '© 2026 Regular. Built for focus.' }),
    defineField({ name: 'footerRight', title: 'Footer right text', type: 'string', group: 'other', initialValue: 'No tracking · No ads · No nonsense' }),
  ],
  preview: { prepare: () => ({ title: 'Landing Page Content' }) },
});
