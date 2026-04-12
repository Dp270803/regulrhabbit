import { createClient } from '@sanity/client';

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset   = import.meta.env.VITE_SANITY_DATASET || 'production';
const token     = import.meta.env.VITE_SANITY_TOKEN;

export const isConfigured = Boolean(projectId && projectId !== 'PASTE_YOUR_PROJECT_ID_HERE');

export const sanity = isConfigured
  ? createClient({ projectId, dataset, token, useCdn: false, apiVersion: '2024-01-01' })
  : null;

/**
 * Build a Sanity image URL from an asset reference.
 * Returns null if Sanity isn't configured or the reference is missing.
 */
export function sanityImageUrl(asset, { width, quality = 85 } = {}) {
  if (!isConfigured || !asset?.asset?._ref) return null;

  // Parse the Sanity asset reference:  image-{id}-{dims}-{ext}
  const ref = asset.asset._ref;
  const [, id, dims, ext] = ref.split('-');
  let url = `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dims}.${ext}`;

  const params = new URLSearchParams();
  if (width)   params.set('w', width);
  if (quality) params.set('q', quality);
  params.set('auto', 'format');
  return `${url}?${params}`;
}

/**
 * Fetch the hero image document from Sanity.
 * The document should have type "heroImage" and a field "image".
 * Returns null if not configured or fetch fails.
 */
export async function fetchLandingPage() {
  if (!sanity) return null;
  try {
    const doc = await sanity.fetch(`*[_type == "landingPage"][0]{
      heroHeading, heroAccent, heroSubtitle, heroCtaText, heroCtaNote,
      proofPoints,
      scienceEyebrow, scienceHeading, scienceBody, scienceBullets, scienceImage,
      ctaHeading, ctaSubtitle, ctaButtonText,
      footerLeft, footerRight
    }`);
    return doc ?? null;
  } catch (err) {
    console.warn('[Sanity] fetchLandingPage failed:', err.message);
    return null;
  }
}

export async function fetchTipsPage() {
  if (!sanity) return null;
  try {
    const doc = await sanity.fetch(`*[_type == "tipsPage"][0]{
      featuredEyebrow, featuredHeadingPrefix, featuredCtaLabel,
      heroImage, heroImageUrl,
      categories[]{key, label},
      categoryCards[]{categoryKey, subcategoryLabel, title, body},
      footerQuote
    }`);
    return doc ?? null;
  } catch (err) {
    console.warn('[Sanity] fetchTipsPage failed:', err.message);
    return null;
  }
}

export async function fetchPlanPage() {
  if (!sanity) return null;
  try {
    const doc = await sanity.fetch(`*[_type == "planPage"][0]{
      pageTitle, phaseLabel, durationLabel,
      weekEntries[]{name, theme, description},
      statCompletedLabel, statBurnLabel, statFocusLabel, focusMetric
    }`);
    return doc ?? null;
  } catch (err) {
    console.warn('[Sanity] fetchPlanPage failed:', err.message);
    return null;
  }
}

export async function fetchDashboardPage() {
  if (!sanity) return null;
  try {
    const doc = await sanity.fetch(`*[_type == "dashboardPage"][0]{
      currentStandingLabel, consistencyTrackLabel,
      todaySessionLabel, markCompleteLabel, sessionDoneLabel,
      trainingRecordLabel,
      restDayTitle, restDayBody, restDayFootnote
    }`);
    return doc ?? null;
  } catch (err) {
    console.warn('[Sanity] fetchDashboardPage failed:', err.message);
    return null;
  }
}

export async function fetchProfilePage() {
  if (!sanity) return null;
  try {
    const doc = await sanity.fetch(`*[_type == "profilePage"][0]{
      personalVaultEyebrow, ghostTag, namePrompt, nameInputPlaceholder,
      statSessionsLabel, statDaysLabel, statStreakLabel, statXpLabel,
      activePlanLabel, currentLevelLabel, membershipLabel,
      consistencyMatrixLabel, badgesSectionLabel, dataVaultLabel,
      appearanceRowLabel, exportRowLabel, importRowLabel, resetRowLabel
    }`);
    return doc ?? null;
  } catch (err) {
    console.warn('[Sanity] fetchProfilePage failed:', err.message);
    return null;
  }
}

export async function fetchHeroImage() {
  if (!sanity) return null;
  try {
    const doc = await sanity.fetch(`*[_type == "heroImage"][0]{ image, alt }`);
    return doc ?? null;
  } catch (err) {
    console.warn('[Sanity] fetchHeroImage failed:', err.message);
    return null;
  }
}
