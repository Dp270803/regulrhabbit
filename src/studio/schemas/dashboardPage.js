import { defineField, defineType } from 'sanity';

export const dashboardPage = defineType({
  name: 'dashboardPage',
  title: 'Dashboard Page',
  type: 'document',
  groups: [
    { name: 'level',    title: 'Level Section' },
    { name: 'session',  title: 'Session Card' },
    { name: 'week',     title: 'Weekly Grid' },
    { name: 'rest',     title: 'Rest Day' },
  ],
  fields: [
    // ── Level section ──
    defineField({
      name: 'currentStandingLabel',
      title: 'Eyebrow label above level name',
      type: 'string',
      group: 'level',
      initialValue: 'Current Standing',
    }),
    defineField({
      name: 'consistencyTrackLabel',
      title: '"Consistency Track" card label',
      type: 'string',
      group: 'level',
      initialValue: 'Consistency Track',
    }),

    // ── Session card ──
    defineField({
      name: 'todaySessionLabel',
      title: '"Today\'s Session" eyebrow label',
      type: 'string',
      group: 'session',
      initialValue: "Today's Session",
    }),
    defineField({
      name: 'markCompleteLabel',
      title: '"Mark Complete" button label',
      type: 'string',
      group: 'session',
      initialValue: 'Mark Complete',
    }),
    defineField({
      name: 'sessionDoneLabel',
      title: 'Session already logged message',
      type: 'string',
      group: 'session',
      description: 'Shown when a session was completed earlier the same day.',
      initialValue: 'Session logged — come back tomorrow',
    }),

    // ── Weekly grid ──
    defineField({
      name: 'trainingRecordLabel',
      title: '"Training Record" section label',
      type: 'string',
      group: 'week',
      initialValue: 'Training Record',
    }),

    // ── Rest day ──
    defineField({
      name: 'restDayTitle',
      title: 'Rest Day card title',
      type: 'string',
      group: 'rest',
      initialValue: 'Rest Day',
    }),
    defineField({
      name: 'restDayBody',
      title: 'Rest Day card body text',
      type: 'text',
      group: 'rest',
      rows: 2,
      initialValue: 'Recovery is where growth happens. Rest days build what training breaks down.',
    }),
    defineField({
      name: 'restDayFootnote',
      title: 'Rest Day small footnote',
      type: 'string',
      group: 'rest',
      initialValue: 'Tomorrow you rise again',
    }),
  ],
  preview: { prepare: () => ({ title: 'Dashboard Page Content' }) },
});
