import { CityRepository } from "../cities/CityRepository.js";
import { CityAutocomplete } from "../cities/CityAutocomplete.js";
import { OpenWeatherApiClient } from "../weather/OpenWeatherApiClient.js";
import { ForecastService } from "../weather/ForecastService.js";
import { ForecastView } from "../weather/ForecastView.js";
import { ForecastChartView } from "../weather/ForecastChartView.js";
import { GeolocationService } from "../geolocation/GeolocationService.js";
import { LocaleFormatter } from "../localization/LocaleFormatter.js";
import { TranslationService } from "../localization/TranslationService.js";

/**
 * Main coordinator of the Weather Forecast application.
 */
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
            "/data/translations.csv",
            "cs",
        );
        this.localeFormatter = new LocaleFormatter(
            this.translationService.getIntlLocale(),
        );
        this.cityRepository = new CityRepository("/data/city.list.json");
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
        this.selectedCity = null;
        this.lastLoadedForecast = null;

        this.handleCitySelected = this.handleCitySelected.bind(this);
        this.handleGeolocationClick = this.handleGeolocationClick.bind(this);
        this.handleLanguageChange = this.handleLanguageChange.bind(this);
    }

    /**
     * Starts the application by loading city datasets, translations, and initializing UI components.
     *
     * @returns {Promise<void>}
     */
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
            // Load translations dictionary first
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
                "search.loadingCities",
                "Loading cities dataset...",
            );

            await this.cityRepository.loadCities();

            this.searchInput.disabled = false;
            this.searchInput.placeholder = this.translationService.t(
                "search.placeholder",
                "Search for a city (e.g. Prague, London)...",
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
                "search.loadFailed",
                "Failed to load cities",
            );
            this.forecastView.renderErrorState(
                this.translationService.t(
                    "error.datasetFailed",
                    "Could not load the city dataset. Please verify that the city.list.json file exists and reload the page.",
                ),
            );
            console.error("Failed to initialize application:", error);
        }
    }

    /**
     * Updates all static text elements in the DOM when language changes.
     */
    updateStaticTranslations() {
        const appTitleElement = document.getElementById("app-title-text");
        const appSubtitleElement = document.getElementById("app-subtitle-text");
        const searchLabelElement = document.querySelector(".search-label");
        const geolocationLabelElement =
            document.querySelector(".geolocation-label");
        const footerParagraphElement = document.querySelector(".app-footer p");

        if (appTitleElement !== null) {
            appTitleElement.textContent = this.translationService.t(
                "app.title",
                "Weather Forecast",
            );
        }
        if (appSubtitleElement !== null) {
            appSubtitleElement.textContent = this.translationService.t(
                "app.subtitle",
                "Search for a city to see the 5-day weather forecast",
            );
        }
        if (searchLabelElement !== null) {
            searchLabelElement.textContent = this.translationService.t(
                "search.label",
                "Select City",
            );
        }
        if (geolocationLabelElement !== null) {
            geolocationLabelElement.textContent = this.translationService.t(
                "geolocation.button",
                "My Location",
            );
        }
        if (footerParagraphElement !== null) {
            footerParagraphElement.textContent = this.translationService.t(
                "app.footer",
                "Weather Forecast Single Page Application • Powered by OpenWeather API",
            );
        }
        if (this.clearButton !== null) {
            this.clearButton.setAttribute(
                "aria-label",
                this.translationService.t(
                    "search.clearAria",
                    "Clear search input",
                ),
            );
        }
        if (this.searchInput !== null && !this.searchInput.disabled) {
            this.searchInput.placeholder = this.translationService.t(
                "search.placeholder",
                "Search for a city (e.g. Prague, London)...",
            );
        }
    }

    /**
     * Handles dynamic language switching across the entire UI and active forecast view.
     *
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

    /**
     * Handles user request to fetch forecast for their physical geolocation.
     */
    async handleGeolocationClick() {
        if (this.geolocationButton !== null) {
            this.geolocationButton.disabled = true;
        }

        const loadingLocationText = this.translationService.t(
            "geolocation.loadingLocation",
            "your current location",
        );
        this.forecastView.renderLoadingState(loadingLocationText);

        try {
            const coordinates =
                await this.geolocationService.getCurrentCoordinates();

            // Placeholder city model until API returns the exact city name
            const locationCity = {
                id: 0,
                name: this.translationService.t(
                    "geolocation.currentPrefix",
                    "My Location",
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
            this.forecastView.renderErrorState(error.message);
        } finally {
            if (this.geolocationButton !== null) {
                this.geolocationButton.disabled = false;
            }
        }
    }

    /**
     * Coordinates the forecast loading workflow when a user selects a city from autocomplete.
     *
     * @param {{id: number, name: string, country: string, coord: {lat: number, lon: number}}} city
     */
    async handleCitySelected(city) {
        if (city === null || city === undefined) {
            return;
        }

        await this.loadForecastForCoordinates({
            city: city,
            isGeolocation: false,
        });
    }

    /**
     * Performs the forecast fetch, data transformation, and UI rendering for given city coordinates.
     *
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
     * Instantiates or in-place updates the temperature chart view.
     *
     * @param {Array<{date: Date, minimumTemperature: number, maximumTemperature: number, condition: string, weatherIcon: string}>} dailyForecastList
     */
    renderForecastChart(dailyForecastList) {
        const canvasElement = document.getElementById("forecast-chart-canvas");
        const chartPanelElement = document.getElementById(
            "forecast-chart-panel",
        );

        if (canvasElement === null || chartPanelElement === null) {
            return;
        }

        if (
            this.forecastChartView === null ||
            this.forecastChartView.canvasElement !== canvasElement
        ) {
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
