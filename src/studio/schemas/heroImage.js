import { defineField, defineType } from 'sanity';

export const heroImage = defineType({
  name: 'heroImage',
  title: 'Dashboard Hero Image',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Label / Title',
      type: 'string',
      description: 'Internal label, e.g. "Gym – Barbell Hero"',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Hero Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Full-width image shown behind the Today\'s Session card on the Dashboard.',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      description: 'Describe the image for screen readers.',
    }),
    defineField({
      name: 'active',
      title: 'Use as active hero',
      type: 'boolean',
      description: 'Only one hero image should be active at a time.',
      initialValue: true,
    }),
  ],
  preview: {
    select: { title: 'title', media: 'image' },
  },
});
