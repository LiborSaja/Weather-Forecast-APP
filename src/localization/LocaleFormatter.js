/**
 * Formats dates, times, and numbers according to the user's browser locale.
 */
export class LocaleFormatter {
    /**
     * @param {string|string[]} [locales] Optional locale or locales array. Defaults to browser preferences.
     */
    constructor(locales = undefined) {
        // Determine the active locale from navigator or fallback to undefined for system default
        this.locales = locales;
        if (this.locales === undefined && typeof navigator !== "undefined") {
            if (
                Array.isArray(navigator.languages) &&
                navigator.languages.length > 0
            ) {
                this.locales = navigator.languages;
            } else if (
                typeof navigator.language === "string" &&
                navigator.language.length > 0
            ) {
                this.locales = navigator.language;
            }
        }

        this.initializeFormatters();
    }

    /**
     * Initializes or updates the Intl formatters for the active locale.
     */
    initializeFormatters() {
        this.dateFormatter = new Intl.DateTimeFormat(this.locales, {
            weekday: "long",
            month: "short",
            day: "numeric",
        });

        this.temperatureFormatter = new Intl.NumberFormat(this.locales, {
            maximumFractionDigits: 0,
            signDisplay: "auto",
        });
    }

    /**
     * Updates the active locale used for formatting.
     *
     * @param {string|string[]} locale
     */
    setLocale(locale) {
        this.locales = locale;
        this.initializeFormatters();
    }

    /**
     * Formats a given Date instance for forecast table display.
     *
     * @param {Date} date
     * @returns {string} Formatted localized date string (e.g. "Monday, Sep 21" or "pondělí 21. zář.")
     */
    formatDate(date) {
        if (date === null || date === undefined) {
            return "";
        }
        return this.dateFormatter.format(date);
    }

    /**
     * Formats a temperature number into a localized string with degree symbol.
     *
     * @param {number} temperatureInCelsius
     * @returns {string} Formatted temperature string (e.g. "19 °C")
     */
    formatTemperature(temperatureInCelsius) {
        if (
            typeof temperatureInCelsius !== "number" ||
            Number.isNaN(temperatureInCelsius)
        ) {
            return "-- °C";
        }
        const roundedTemperature = Math.round(temperatureInCelsius);
        const normalizedTemperature =
            roundedTemperature === 0 ? 0 : roundedTemperature;
        return `${this.temperatureFormatter.format(normalizedTemperature)} °C`;
    }
}
