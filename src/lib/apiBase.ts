// SILVORA | The shop API's address
// Set by VITE_CATALOG_API_URL when the site is built; a local server otherwise. Every API call starts from it.

const configuredBaseUrl = import.meta.env.VITE_CATALOG_API_URL?.trim();

/** The API's base address without a trailing slash, for example https://example.com/api. */
export const API_BASE_URL = (configuredBaseUrl || 'http://localhost:8080/api').replace(/\/$/, '');
