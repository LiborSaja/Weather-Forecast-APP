/**
 * Service responsible for loading, parsing, and providing multi-language translations from a CSV file.
 */
export class TranslationService {
    /**
     * @param {string} [csvUrl] URL to translations CSV file.
     * @param {string} [defaultLanguage] Default fallback language code (e.g. 'cs', 'en', 'de', 'es', 'fr').
     */
    constructor(csvUrl = "/data/translations.csv", defaultLanguage = "cs") {
        this.csvUrl = csvUrl;
        this.supportedLanguageList = [
            { code: "cs", label: "🇨🇿 Čeština", intlLocale: "cs-CZ" },
            { code: "en", label: "🇬🇧 English", intlLocale: "en-US" },
            { code: "de", label: "🇩🇪 Deutsch", intlLocale: "de-DE" },
            { code: "es", label: "🇪🇸 Español", intlLocale: "es-ES" },
            { code: "fr", label: "🇫🇷 Français", intlLocale: "fr-FR" },
        ];

        this.currentLanguage = this.detectInitialLanguage(defaultLanguage);
        /** @type {Map<string, Record<string, string>>} */
        this.translationDictionaryMap = new Map();
        this.isLoaded = false;
    }

    /**
     * Detects the user's preferred language from the browser or falls back to default.
     *
     * @param {string} fallbackLanguage
     * @returns {string}
     */
    detectInitialLanguage(fallbackLanguage) {
        if (
            typeof navigator === "undefined" ||
            typeof navigator.language !== "string"
        ) {
            return fallbackLanguage;
        }

        const browserLanguageCode = navigator.language
            .slice(0, 2)
            .toLowerCase();
        const isSupported = this.supportedLanguageList.some(
            (lang) => lang.code === browserLanguageCode,
        );

        if (isSupported) {
            return browserLanguageCode;
        }

        return fallbackLanguage;
    }

    /**
     * Fetches and parses the CSV translations file.
     *
     * @returns {Promise<void>}
     */
    async loadTranslations() {
        try {
            const response = await fetch(this.csvUrl);

            if (!response.ok) {
                throw new Error(
                    `Failed to load translations CSV. HTTP Status: ${response.status} ${response.statusText}`,
                );
            }

            const csvContent = await response.text();
            this.parseCsvContent(csvContent);
            this.isLoaded = true;
        } catch (error) {
            this.isLoaded = false;
            this.translationDictionaryMap.clear();
            throw error;
        }
    }

    /**
     * Parses raw CSV content into structured in-memory translation dictionary map.
     *
     * @param {string} rawCsv
     */
    parseCsvContent(rawCsv) {
        if (typeof rawCsv !== "string" || rawCsv.trim().length === 0) {
            return;
        }

        const lineList = rawCsv.split(/\r?\n/);
        if (lineList.length === 0) {
            return;
        }

        const headerLine = lineList[0];
        const headerColumnList = headerLine
            .split(",")
            .map((column) => column.trim().toLowerCase());

        for (let index = 1; index < lineList.length; index += 1) {
            const line = lineList[index].trim();
            if (line.length === 0) {
                continue;
            }

            const cellList = line.split(",");
            const translationKey = cellList[0]?.trim();

            if (translationKey === undefined || translationKey.length === 0) {
                continue;
            }

            const languageMap = {};

            for (
                let columnIndex = 1;
                columnIndex < headerColumnList.length;
                columnIndex += 1
            ) {
                const languageCode = headerColumnList[columnIndex];
                const translationValue = cellList[columnIndex]?.trim() || "";
                languageMap[languageCode] = translationValue;
            }

            this.translationDictionaryMap.set(translationKey, languageMap);
        }
    }

    /**
     * Translates a given key into the currently active language.
     *
     * @param {string} key
     * @param {string} [fallbackText]
     * @returns {string}
     */
    t(key, fallbackText = "") {
        if (typeof key !== "string") {
            return fallbackText;
        }

        const translationEntry = this.translationDictionaryMap.get(key);

        if (
            translationEntry !== undefined &&
            typeof translationEntry[this.currentLanguage] === "string" &&
            translationEntry[this.currentLanguage].length > 0
        ) {
            return translationEntry[this.currentLanguage];
        }

        // Fallback to English if translation is missing in the current language
        if (
            translationEntry !== undefined &&
            typeof translationEntry["en"] === "string" &&
            translationEntry["en"].length > 0
        ) {
            return translationEntry["en"];
        }

        return fallbackText.length > 0 ? fallbackText : key;
    }

    /**
     * Translates an OpenWeather weather condition code (e.g. 'Clouds', 'Rain', 'Clear').
     *
     * @param {string} conditionCode
     * @returns {string}
     */
    tCondition(conditionCode) {
        if (
            typeof conditionCode !== "string" ||
            conditionCode.trim().length === 0
        ) {
            return this.t("condition.Unknown", "Unknown");
        }

        const translationKey = `condition.${conditionCode.trim()}`;
        return this.t(translationKey, conditionCode);
    }

    /**
     * Changes the active language code.
     *
     * @param {string} languageCode
     * @returns {boolean} True if language was changed successfully
     */
    setLanguage(languageCode) {
        const isSupported = this.supportedLanguageList.some(
            (lang) => lang.code === languageCode,
        );

        if (isSupported) {
            this.currentLanguage = languageCode;
            return true;
        }

        return false;
    }

    /**
     * Returns the currently active language code (e.g. 'cs', 'en', 'de', 'es', 'fr').
     *
     * @returns {string}
     */
    getLanguage() {
        return this.currentLanguage;
    }

    /**
     * Returns the corresponding full Intl locale string for the active language (e.g. 'cs-CZ', 'de-DE').
     *
     * @returns {string}
     */
    getIntlLocale() {
        const languageConfig = this.supportedLanguageList.find(
            (lang) => lang.code === this.currentLanguage,
        );
        return languageConfig !== undefined
            ? languageConfig.intlLocale
            : "en-US";
    }

    /**
     * Returns the list of all supported language objects.
     *
     * @returns {Array<{code: string, label: string, intlLocale: string}>}
     */
    getSupportedLanguages() {
        return this.supportedLanguageList;
    }
}
