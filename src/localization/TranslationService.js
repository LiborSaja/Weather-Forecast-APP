import { API_ENDPOINTS } from "../constants/ApiEndpoints.js";
import { APP_CONFIG, SUPPORTED_LANGUAGES } from "../constants/AppConfig.js";
import { TRANSLATION_KEYS } from "../constants/TranslationKeys.js";

/**
 * Service responsible for loading, parsing, and providing multi-language translations from a CSV file.
 */
export class TranslationService {
    /**
     * @param {string} [csvUrl]
     * @param {string} [defaultLanguage]
     */
    constructor(
        csvUrl = API_ENDPOINTS.TRANSLATIONS_DATASET,
        defaultLanguage = APP_CONFIG.DEFAULT_LANGUAGE,
    ) {
        this.csvUrl = csvUrl;
        this.supportedLanguageList = SUPPORTED_LANGUAGES;

        this.currentLanguage = this.detectInitialLanguage(defaultLanguage);
        /** @type {Map<string, Record<string, string>>} */
        this.translationDictionaryMap = new Map();
        this.isLoaded = false;
    }

    /**
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
     * Splits a single CSV line into an array of cell values, respecting quotes and escaped commas (RFC 4180).
     *
     * @param {string} line
     * @returns {string[]}
     */
    splitCsvLine(line) {
        const cellList = [];
        let currentCell = "";
        let insideQuotes = false;

        for (let index = 0; index < line.length; index += 1) {
            const char = line[index];
            const nextChar = line[index + 1];

            if (char === '"') {
                if (insideQuotes && nextChar === '"') {
                    // Escaped double quote ("" -> ")
                    currentCell += '"';
                    index += 1;
                } else {
                    insideQuotes = !insideQuotes;
                }
            } else if (char === "," && !insideQuotes) {
                cellList.push(currentCell.trim());
                currentCell = "";
            } else {
                currentCell += char;
            }
        }

        cellList.push(currentCell.trim());
        return cellList;
    }

    /**
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
        const headerColumnList = this.splitCsvLine(headerLine).map((column) =>
            column.toLowerCase(),
        );

        for (let index = 1; index < lineList.length; index += 1) {
            const line = lineList[index].trim();
            if (line.length === 0) {
                continue;
            }

            const cellList = this.splitCsvLine(line);
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

        // Fallback to English in dictionary if translation is missing in the current language
        if (
            translationEntry !== undefined &&
            typeof translationEntry[APP_CONFIG.FALLBACK_LANGUAGE] ===
                "string" &&
            translationEntry[APP_CONFIG.FALLBACK_LANGUAGE].length > 0
        ) {
            return translationEntry[APP_CONFIG.FALLBACK_LANGUAGE];
        }

        return fallbackText.length > 0 ? fallbackText : key;
    }

    /**
     * @param {string} conditionCode
     * @returns {string}
     */
    tCondition(conditionCode) {
        if (
            typeof conditionCode !== "string" ||
            conditionCode.trim().length === 0
        ) {
            return this.t(TRANSLATION_KEYS.CONDITION_UNKNOWN);
        }

        const translationKey = `condition.${conditionCode.trim()}`;
        return this.t(translationKey, conditionCode);
    }

    /**
     * @param {string} languageCode
     * @returns {boolean}
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

    getLanguage() {
        return this.currentLanguage;
    }

    getIntlLocale() {
        const languageConfig = this.supportedLanguageList.find(
            (lang) => lang.code === this.currentLanguage,
        );
        return languageConfig !== undefined
            ? languageConfig.intlLocale
            : "en-US";
    }

    getSupportedLanguages() {
        return this.supportedLanguageList;
    }
}
