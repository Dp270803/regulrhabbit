import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { heroImage, landingPage, tipsPage, planPage, dashboardPage, profilePage } from './src/studio/schemas';

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset   = import.meta.env.VITE_SANITY_DATASET || 'production';

export default defineConfig({
  name: 'regulr-cms',
  title: 'Regulr — Media Manager',

  projectId,
  dataset,

  plugins: [
    structureTool(),
  ],

  schema: {
    types: [heroImage, landingPage, tipsPage, planPage, dashboardPage, profilePage],
  },

  document: {
    newDocumentOptions: (prev) =>
      prev.filter(t => ['heroImage', 'landingPage', 'tipsPage', 'planPage', 'dashboardPage', 'profilePage'].includes(t.templateId)),
  },
});
