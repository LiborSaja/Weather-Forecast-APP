/**
 * Application-wide configuration defaults, timeouts, thresholds, and supported languages.
 */
export const APP_CONFIG = Object.freeze({
    SEARCH_MIN_QUERY_LENGTH: 3,
    SEARCH_MAX_RESULTS: 10,
    SEARCH_DEBOUNCE_DELAY_MS: 180,
    CACHE_TTL_MS: 10 * 60 * 1000,
    DEFAULT_LANGUAGE: "cs",
    FALLBACK_LANGUAGE: "en",
});

export const SUPPORTED_LANGUAGES = Object.freeze([
    { code: "cs", label: "🇨🇿 Čeština", intlLocale: "cs-CZ" },
    { code: "en", label: "🇬🇧 English", intlLocale: "en-US" },
    { code: "de", label: "🇩🇪 Deutsch", intlLocale: "de-DE" },
    { code: "es", label: "🇪🇸 Español", intlLocale: "es-ES" },
    { code: "fr", label: "🇫🇷 Français", intlLocale: "fr-FR" },
]);
