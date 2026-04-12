import { defineField, defineType } from 'sanity';

export const profilePage = defineType({
  name: 'profilePage',
  title: 'Profile Page',
  type: 'document',
  groups: [
    { name: 'header',   title: 'Header & Name' },
    { name: 'stats',    title: 'Stat Labels' },
    { name: 'sections', title: 'Section Labels' },
    { name: 'settings', title: 'Settings Rows' },
  ],
  fields: [
    // ── Header ──
    defineField({
      name: 'personalVaultEyebrow',
      title: 'Eyebrow label above the name',
      type: 'string',
      group: 'header',
      initialValue: 'Personal Vault',
    }),
    defineField({
      name: 'ghostTag',
      title: 'Placeholder tag shown before the user sets their name',
      type: 'string',
      group: 'header',
      description: 'Displayed inside a dashed pill when no name has been entered yet.',
      initialValue: 'Ghost Member',
    }),
    defineField({
      name: 'namePrompt',
      title: 'Small prompt text below the ghost tag',
      type: 'string',
      group: 'header',
      description: 'Nudges new users to tap and add their name.',
      initialValue: 'Tap to add your name',
    }),
    defineField({
      name: 'nameInputPlaceholder',
      title: 'Input placeholder inside the name field',
      type: 'string',
      group: 'header',
      initialValue: 'Your name',
    }),

    // ── Stats ──
    defineField({
      name: 'statSessionsLabel',
      title: 'Sessions stat label',
      type: 'string',
      group: 'stats',
      initialValue: 'Sessions',
    }),
    defineField({
      name: 'statDaysLabel',
      title: 'Days Active stat label',
      type: 'string',
      group: 'stats',
      initialValue: 'Days Active',
    }),
    defineField({
      name: 'statStreakLabel',
      title: 'Best Streak stat label',
      type: 'string',
      group: 'stats',
      initialValue: 'Best Streak',
    }),
    defineField({
      name: 'statXpLabel',
      title: 'Total XP stat label',
      type: 'string',
      group: 'stats',
      initialValue: 'Total XP',
    }),

    // ── Section labels ──
    defineField({
      name: 'activitySectionLabel',
      title: '"Activity" section heading',
      type: 'string',
      group: 'sections',
      initialValue: 'Activity',
    }),
    defineField({
      name: 'badgesSectionLabel',
      title: '"Badges" section heading',
      type: 'string',
      group: 'sections',
      initialValue: 'Badges',
    }),
    defineField({
      name: 'settingsSectionLabel',
      title: '"Settings" section heading',
      type: 'string',
      group: 'sections',
      initialValue: 'Settings',
    }),

    // ── Settings rows ──
    defineField({
      name: 'appearanceRowLabel',
      title: 'Appearance row label',
      type: 'string',
      group: 'settings',
      initialValue: 'Appearance',
    }),
    defineField({
      name: 'exportRowLabel',
      title: 'Export row label',
      type: 'string',
      group: 'settings',
      initialValue: 'Export My Data',
    }),
    defineField({
      name: 'importRowLabel',
      title: 'Import row label',
      type: 'string',
      group: 'settings',
      initialValue: 'Import Data',
    }),
    defineField({
      name: 'resetRowLabel',
      title: 'Reset row label',
      type: 'string',
      group: 'settings',
      initialValue: 'Reset All Data',
    }),
  ],
  preview: { prepare: () => ({ title: 'Profile Page Content' }) },
});
