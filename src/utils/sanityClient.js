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
