import { defineField, defineType, defineArrayMember } from 'sanity';

export const planPage = defineType({
  name: 'planPage',
  title: 'Plan Page',
  type: 'document',
  groups: [
    { name: 'header', title: 'Page Header' },
    { name: 'weeks',  title: 'Week Labels' },
    { name: 'stats',  title: 'Stats Section' },
  ],
  fields: [
    // ── Header ──
    defineField({
      name: 'pageTitle',
      title: 'Page title',
      type: 'string',
      group: 'header',
      initialValue: 'Training Plan',
    }),
    defineField({
      name: 'phaseLabel',
      title: 'Phase badge label',
      type: 'string',
      group: 'header',
      description: 'e.g. "Phase 01: Foundation"',
      initialValue: 'Phase 01: Foundation',
    }),
    defineField({
      name: 'durationLabel',
      title: 'Duration badge label',
      type: 'string',
      group: 'header',
      description: 'e.g. "28 Days Duration"',
      initialValue: '28 Days Duration',
    }),

    // ── Week Labels ──
    defineField({
      name: 'weekEntries',
      title: 'Week labels (one per week, in order)',
      type: 'array',
      group: 'weeks',
      description: 'Define a name, theme, and description for each week of the plan.',
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({ name: 'name',        title: 'Week ordinal name', type: 'string', description: 'e.g. One, Two, Three, Four' }),
          defineField({ name: 'theme',       title: 'Theme label',       type: 'string', description: 'e.g. Activation, Intensity, Volume, Deload' }),
          defineField({ name: 'description', title: 'Short description', type: 'string', description: 'One sentence shown under the theme.' }),
        ],
        preview: { select: { title: 'theme', subtitle: 'name' } },
      })],
      initialValue: [
        { _key: 'w1', name: 'One',   theme: 'Activation', description: 'Focus on neural recruitment and technique.'          },
        { _key: 'w2', name: 'Two',   theme: 'Intensity',  description: 'Increasing load and decreasing rest intervals.'      },
        { _key: 'w3', name: 'Three', theme: 'Volume',     description: 'Maximum sets per muscle group.'                      },
        { _key: 'w4', name: 'Four',  theme: 'Deload',     description: 'Central nervous system recovery and joint health.'   },
      ],
    }),

    // ── Stats section ──
    defineField({
      name: 'statCompletedLabel',
      title: '"Completed Days" stat label',
      type: 'string',
      group: 'stats',
      initialValue: 'Completed Days',
    }),
    defineField({
      name: 'statBurnLabel',
      title: '"Projected Burn" stat label',
      type: 'string',
      group: 'stats',
      initialValue: 'Projected Burn',
    }),
    defineField({
      name: 'statFocusLabel',
      title: '"Focus Metric" stat label',
      type: 'string',
      group: 'stats',
      initialValue: 'Focus Metric',
    }),
    defineField({
      name: 'focusMetric',
      title: 'Focus metric value',
      type: 'string',
      group: 'stats',
      description: 'Displayed as the value for the Focus Metric stat. e.g. "Hypertrophy", "Strength", "Endurance"',
      initialValue: 'Hypertrophy',
    }),
  ],
  preview: { prepare: () => ({ title: 'Plan Page Content' }) },
});
