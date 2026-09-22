/** The platform serves India first, so a request that does not name a country gets Indian states. */
export const DEFAULT_COUNTRY_CODE = 'IN';

/** States and cities change rarely, so a client or proxy may keep the answer for an hour. */
export const LOCATION_CACHE_CONTROL = 'public, max-age=3600';
