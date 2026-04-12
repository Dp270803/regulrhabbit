import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { heroImage, landingPage, tipsPage, planPage, dashboardPage } from './src/studio/schemas';

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
    types: [heroImage, landingPage, tipsPage, planPage, dashboardPage],
  },

  document: {
    newDocumentOptions: (prev) =>
      prev.filter(t => ['heroImage', 'landingPage', 'tipsPage', 'planPage', 'dashboardPage'].includes(t.templateId)),
  },
});
