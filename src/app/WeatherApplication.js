import { CityRepository } from "../cities/CityRepository.js";
import { CityAutocomplete } from "../cities/CityAutocomplete.js";
import { OpenWeatherApiClient } from "../weather/OpenWeatherApiClient.js";
import { ForecastService } from "../weather/ForecastService.js";
import { ForecastView } from "../weather/ForecastView.js";
import { ForecastChartView } from "../weather/ForecastChartView.js";
import { GeolocationService } from "../geolocation/GeolocationService.js";
import { LocaleFormatter } from "../localization/LocaleFormatter.js";
import { TranslationService } from "../localization/TranslationService.js";
import { DOM_IDS, DOM_SELECTORS } from "../constants/DomSelectors.js";
import { TRANSLATION_KEYS } from "../constants/TranslationKeys.js";
import { API_ENDPOINTS } from "../constants/ApiEndpoints.js";
import { APP_CONFIG } from "../constants/AppConfig.js";

export class WeatherApplication {
    /**
     * @param {object} elements
     * @param {HTMLInputElement} elements.searchInput
     * @param {HTMLButtonElement|null} [elements.clearButton]
     * @param {HTMLButtonElement|null} [elements.geolocationButton]
     * @param {HTMLSelectElement|null} [elements.languageSelect]
     * @param {HTMLElement} elements.autocompleteResults
     * @param {HTMLElement} elements.forecastContainer
     */
    constructor({
        searchInput,
        clearButton = null,
        geolocationButton = null,
        languageSelect = null,
        autocompleteResults,
        forecastContainer,
    }) {
        this.searchInput = searchInput;
        this.clearButton = clearButton;
        this.geolocationButton = geolocationButton;
        this.languageSelect = languageSelect;
        this.autocompleteResults = autocompleteResults;
        this.forecastContainer = forecastContainer;

        this.translationService = new TranslationService(
            API_ENDPOINTS.TRANSLATIONS_DATASET,
            APP_CONFIG.DEFAULT_LANGUAGE,
        );
        this.localeFormatter = new LocaleFormatter(
            this.translationService.getIntlLocale(),
        );
        this.cityRepository = new CityRepository(API_ENDPOINTS.CITIES_DATASET);
        this.weatherApiClient = new OpenWeatherApiClient();
        this.forecastService = new ForecastService();
        this.geolocationService = new GeolocationService();
        this.forecastView = new ForecastView({
            containerElement: this.forecastContainer,
            localeFormatter: this.localeFormatter,
            translationService: this.translationService,
        });
        this.forecastChartView = null;

        /** @type {AbortController|null} */
        this.activeAbortController = null;
        this.currentGeolocationRequestId = 0;
        this.selectedCity = null;
        this.lastLoadedForecast = null;

        this.handleCitySelected = this.handleCitySelected.bind(this);
        this.handleGeolocationClick = this.handleGeolocationClick.bind(this);
        this.handleLanguageChange = this.handleLanguageChange.bind(this);
    }

    async start() {
        if (this.geolocationButton !== null) {
            this.geolocationButton.addEventListener(
                "click",
                this.handleGeolocationClick,
            );
        }

        if (this.languageSelect !== null) {
            this.languageSelect.addEventListener("change", (event) => {
                this.handleLanguageChange(event.target.value);
            });
        }

        try {
            await this.translationService.loadTranslations();
            this.localeFormatter.setLocale(
                this.translationService.getIntlLocale(),
            );

            if (this.languageSelect !== null) {
                this.languageSelect.value =
                    this.translationService.getLanguage();
            }

            this.updateStaticTranslations();
            this.forecastView.renderInitialState();

            this.searchInput.disabled = true;
            this.searchInput.placeholder = this.translationService.t(
                TRANSLATION_KEYS.SEARCH_LOADING_CITIES,
            );

            await this.cityRepository.loadCities();

            this.searchInput.disabled = false;
            this.searchInput.placeholder = this.translationService.t(
                TRANSLATION_KEYS.SEARCH_PLACEHOLDER,
            );

            this.cityAutocomplete = new CityAutocomplete({
                inputElement: this.searchInput,
                resultsContainerElement: this.autocompleteResults,
                clearButtonElement: this.clearButton,
                cityRepository: this.cityRepository,
                translationService: this.translationService,
                onCitySelected: this.handleCitySelected,
            });
        } catch (error) {
            this.searchInput.disabled = true;
            this.searchInput.placeholder = this.translationService.t(
                TRANSLATION_KEYS.SEARCH_LOAD_FAILED,
            );
            this.forecastView.renderErrorState(
                this.translationService.t(
                    TRANSLATION_KEYS.ERROR_DATASET_FAILED,
                ),
            );
            console.error("Failed to initialize application:", error);
        }
    }

    updateStaticTranslations() {
        const appTitleElement = document.getElementById(DOM_IDS.APP_TITLE_TEXT);
        const appSubtitleElement = document.getElementById(
            DOM_IDS.APP_SUBTITLE_TEXT,
        );
        const searchLabelElement = document.querySelector(
            DOM_SELECTORS.SEARCH_LABEL,
        );
        const geolocationLabelElement = document.querySelector(
            DOM_SELECTORS.GEOLOCATION_LABEL,
        );
        const footerParagraphElement = document.querySelector(
            DOM_SELECTORS.FOOTER_PARAGRAPH,
        );

        if (appTitleElement !== null) {
            appTitleElement.textContent = this.translationService.t(
                TRANSLATION_KEYS.APP_TITLE,
            );
        }
        if (appSubtitleElement !== null) {
            appSubtitleElement.textContent = this.translationService.t(
                TRANSLATION_KEYS.APP_SUBTITLE,
            );
        }
        if (searchLabelElement !== null) {
            searchLabelElement.textContent = this.translationService.t(
                TRANSLATION_KEYS.SEARCH_LABEL,
            );
        }
        if (geolocationLabelElement !== null) {
            geolocationLabelElement.textContent = this.translationService.t(
                TRANSLATION_KEYS.GEOLOCATION_BUTTON,
            );
        }
        if (footerParagraphElement !== null) {
            footerParagraphElement.textContent = this.translationService.t(
                TRANSLATION_KEYS.APP_FOOTER,
            );
        }
        if (this.clearButton !== null) {
            this.clearButton.setAttribute(
                "aria-label",
                this.translationService.t(TRANSLATION_KEYS.SEARCH_CLEAR_ARIA),
            );
        }
        if (this.searchInput !== null && !this.searchInput.disabled) {
            this.searchInput.placeholder = this.translationService.t(
                TRANSLATION_KEYS.SEARCH_PLACEHOLDER,
            );
        }
    }

    /**
     * @param {string} languageCode
     */
    handleLanguageChange(languageCode) {
        const isSuccess = this.translationService.setLanguage(languageCode);
        if (!isSuccess) {
            return;
        }

        this.localeFormatter.setLocale(this.translationService.getIntlLocale());
        this.updateStaticTranslations();

        // If forecast is already displayed, re-render in the new language
        if (this.lastLoadedForecast !== null) {
            this.forecastView.renderForecast({
                city: this.lastLoadedForecast.city,
                dailyForecastList: this.lastLoadedForecast.dailyForecastList,
                onChartTabActivated: () => {
                    if (
                        this.forecastChartView !== null &&
                        this.forecastChartView.chartInstance !== null
                    ) {
                        this.forecastChartView.chartInstance.resize();
                    }
                },
            });

            this.renderForecastChart(this.lastLoadedForecast.dailyForecastList);
        } else {
            this.forecastView.renderInitialState();
        }
    }

    async handleGeolocationClick() {
        if (this.geolocationButton !== null) {
            this.geolocationButton.disabled = true;
        }

        const requestId = ++this.currentGeolocationRequestId;
        const loadingLocationText = this.translationService.t(
            TRANSLATION_KEYS.GEOLOCATION_LOADING_LOCATION,
        );
        this.forecastView.renderLoadingState(loadingLocationText);

        try {
            const coordinates =
                await this.geolocationService.getCurrentCoordinates();

            // If user initiated another action while geolocation was resolving, discard result
            if (requestId !== this.currentGeolocationRequestId) {
                return;
            }

            // Placeholder city model until API returns the exact city name
            const locationCity = {
                id: 0,
                name: this.translationService.t(
                    TRANSLATION_KEYS.GEOLOCATION_CURRENT_PREFIX,
                ),
                country: "",
                coord: {
                    lat: coordinates.latitude,
                    lon: coordinates.longitude,
                },
            };

            await this.loadForecastForCoordinates({
                city: locationCity,
                isGeolocation: true,
            });
        } catch (error) {
            if (requestId === this.currentGeolocationRequestId) {
                this.forecastView.renderErrorState(error.message);
            }
        } finally {
            if (this.geolocationButton !== null) {
                this.geolocationButton.disabled = false;
            }
        }
    }

    /**
     * @param {{id: number, name: string, country: string, coord: {lat: number, lon: number}}} city
     */
    async handleCitySelected(city) {
        if (city === null || city === undefined) {
            return;
        }

        // Invalidate any pending geolocation request
        this.currentGeolocationRequestId++;

        await this.loadForecastForCoordinates({
            city: city,
            isGeolocation: false,
        });
    }

    /**
     * @param {object} params
     * @param {{id: number, name: string, country: string, coord: {lat: number, lon: number}}} params.city
     * @param {boolean} params.isGeolocation
     */
    async loadForecastForCoordinates({ city, isGeolocation = false }) {
        this.selectedCity = city;

        // Cancel any ongoing forecast request to prevent race conditions
        if (this.activeAbortController !== null) {
            this.activeAbortController.abort();
            this.activeAbortController = null;
        }

        const abortController = new AbortController();
        this.activeAbortController = abortController;

        this.forecastView.renderLoadingState(city.name);

        try {
            const rawForecastData = await this.weatherApiClient.fetchForecast({
                latitude: city.coord.lat,
                longitude: city.coord.lon,
                signal: abortController.signal,
            });

            // Transform raw 3-hour data into 5 daily forecasts respecting city timezone
            const dailyForecastList =
                this.forecastService.transformToDailyForecast(rawForecastData);

            // If geolocation was used, enrich city name from OpenWeather response
            let displayCity = city;
            if (
                isGeolocation &&
                rawForecastData.city &&
                typeof rawForecastData.city.name === "string"
            ) {
                const detectedName =
                    rawForecastData.city.name.length > 0
                        ? rawForecastData.city.name
                        : "Current Location";
                const detectedCountry = rawForecastData.city.country || "";
                displayCity = {
                    ...city,
                    name: `📍 ${detectedName}`,
                    country: detectedCountry,
                };

                if (
                    this.cityAutocomplete !== undefined &&
                    this.cityAutocomplete !== null
                ) {
                    this.searchInput.value =
                        detectedCountry.length > 0
                            ? `📍 ${detectedName}, ${detectedCountry}`
                            : `📍 ${detectedName}`;
                    this.cityAutocomplete.updateClearButtonVisibility();
                }
            }

            // Only update UI if this request is still the active one
            if (this.activeAbortController === abortController) {
                this.lastLoadedForecast = {
                    city: displayCity,
                    dailyForecastList: dailyForecastList,
                };

                this.forecastView.renderForecast({
                    city: displayCity,
                    dailyForecastList: dailyForecastList,
                    onChartTabActivated: () => {
                        if (
                            this.forecastChartView !== null &&
                            this.forecastChartView.chartInstance !== null
                        ) {
                            this.forecastChartView.chartInstance.resize();
                        }
                    },
                });

                this.renderForecastChart(dailyForecastList);

                this.activeAbortController = null;
            }
        } catch (error) {
            // AbortError indicates request was deliberately superseded by a newer search; do not show error
            if (error.name === "AbortError") {
                return;
            }

            if (this.activeAbortController === abortController) {
                this.forecastView.renderErrorState(error.message);
                this.activeAbortController = null;
            }

            console.error("Forecast retrieval error:", error);
        }
    }

    /**
     * @param {Array<{date: Date, minimumTemperature: number, maximumTemperature: number, condition: string, weatherIcon: string}>} dailyForecastList
     */
    renderForecastChart(dailyForecastList) {
        const canvasElement = document.getElementById(DOM_IDS.CHART_CANVAS);
        const chartPanelElement = document.getElementById(DOM_IDS.CHART_PANEL);

        if (canvasElement === null || chartPanelElement === null) {
            return;
        }

        if (
            this.forecastChartView === null ||
            this.forecastChartView.canvasElement !== canvasElement
        ) {
            if (this.forecastChartView !== null) {
                this.forecastChartView.destroy();
            }
            this.forecastChartView = new ForecastChartView({
                canvasElement: canvasElement,
                containerElement: chartPanelElement,
                translationService: this.translationService,
            });
        }

        this.forecastChartView.renderChart({
            dailyForecastList: dailyForecastList,
            localeFormatter: this.localeFormatter,
        });
    }
}
