import { CityRepository } from '../cities/CityRepository.js';
import { CityAutocomplete } from '../cities/CityAutocomplete.js';
import { OpenWeatherApiClient } from '../weather/OpenWeatherApiClient.js';
import { ForecastService } from '../weather/ForecastService.js';
import { ForecastView } from '../weather/ForecastView.js';
import { ForecastChartView } from '../weather/ForecastChartView.js';
import { GeolocationService } from '../geolocation/GeolocationService.js';
import { LocaleFormatter } from '../localization/LocaleFormatter.js';

/**
 * Main coordinator of the Weather Forecast application.
 */
export class WeatherApplication {
  /**
   * @param {object} elements
   * @param {HTMLInputElement} elements.searchInput
   * @param {HTMLButtonElement|null} [elements.clearButton]
   * @param {HTMLButtonElement|null} [elements.geolocationButton]
   * @param {HTMLElement} elements.autocompleteResults
   * @param {HTMLElement} elements.forecastContainer
   */
  constructor({ searchInput, clearButton = null, geolocationButton = null, autocompleteResults, forecastContainer }) {
    this.searchInput = searchInput;
    this.clearButton = clearButton;
    this.geolocationButton = geolocationButton;
    this.autocompleteResults = autocompleteResults;
    this.forecastContainer = forecastContainer;

    this.localeFormatter = new LocaleFormatter();
    this.cityRepository = new CityRepository('/data/city.list.json');
    this.weatherApiClient = new OpenWeatherApiClient();
    this.forecastService = new ForecastService();
    this.geolocationService = new GeolocationService();
    this.forecastView = new ForecastView({
      containerElement: this.forecastContainer,
      localeFormatter: this.localeFormatter
    });
    this.forecastChartView = null;

    /** @type {AbortController|null} */
    this.activeAbortController = null;
    this.selectedCity = null;

    this.handleCitySelected = this.handleCitySelected.bind(this);
    this.handleGeolocationClick = this.handleGeolocationClick.bind(this);
  }

  /**
   * Starts the application by loading city datasets and initializing UI components.
   *
   * @returns {Promise<void>}
   */
  async start() {
    this.forecastView.renderInitialState();

    if (this.geolocationButton !== null) {
      this.geolocationButton.addEventListener('click', this.handleGeolocationClick);
    }

    try {
      this.searchInput.disabled = true;
      this.searchInput.placeholder = 'Loading cities dataset...';

      await this.cityRepository.loadCities();

      this.searchInput.disabled = false;
      this.searchInput.placeholder = 'Search for a city (e.g. Prague, London)...';

      this.cityAutocomplete = new CityAutocomplete({
        inputElement: this.searchInput,
        resultsContainerElement: this.autocompleteResults,
        clearButtonElement: this.clearButton,
        cityRepository: this.cityRepository,
        onCitySelected: this.handleCitySelected
      });
    } catch (error) {
      this.searchInput.disabled = true;
      this.searchInput.placeholder = 'Failed to load cities';
      this.forecastView.renderErrorState(
        'Could not load the city dataset. Please verify that the city.list.json file exists and reload the page.'
      );
      console.error('Failed to initialize CityRepository:', error);
    }
  }

  /**
   * Handles user request to fetch forecast for their physical geolocation.
   */
  async handleGeolocationClick() {
    if (this.geolocationButton !== null) {
      this.geolocationButton.disabled = true;
    }

    this.forecastView.renderLoadingState('your current location');

    try {
      const coordinates = await this.geolocationService.getCurrentCoordinates();

      // Placeholder city model until API returns the exact city name
      const locationCity = {
        id: 0,
        name: 'My Location',
        country: '',
        coord: {
          lat: coordinates.latitude,
          lon: coordinates.longitude
        }
      };

      await this.loadForecastForCoordinates({
        city: locationCity,
        isGeolocation: true
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
      isGeolocation: false
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
        signal: abortController.signal
      });

      // Transform raw 3-hour data into 5 daily forecasts respecting city timezone
      const dailyForecastList = this.forecastService.transformToDailyForecast(rawForecastData);

      // If geolocation was used, enrich city name from OpenWeather response
      let displayCity = city;
      if (isGeolocation && rawForecastData.city && typeof rawForecastData.city.name === 'string') {
        const detectedName = rawForecastData.city.name.length > 0 ? rawForecastData.city.name : 'Current Location';
        const detectedCountry = rawForecastData.city.country || '';
        displayCity = {
          ...city,
          name: `📍 ${detectedName}`,
          country: detectedCountry
        };

        if (this.cityAutocomplete !== undefined && this.cityAutocomplete !== null) {
          this.searchInput.value = detectedCountry.length > 0 ? `📍 ${detectedName}, ${detectedCountry}` : `📍 ${detectedName}`;
          this.cityAutocomplete.updateClearButtonVisibility();
        }
      }

      // Only update UI if this request is still the active one
      if (this.activeAbortController === abortController) {
        this.forecastView.renderForecast({
          city: displayCity,
          dailyForecastList: dailyForecastList,
          onChartTabActivated: () => {
            if (this.forecastChartView !== null && this.forecastChartView.chartInstance !== null) {
              this.forecastChartView.chartInstance.resize();
            }
          }
        });

        this.renderForecastChart(dailyForecastList);

        this.activeAbortController = null;
      }
    } catch (error) {
      // AbortError indicates request was deliberately superseded by a newer search; do not show error
      if (error.name === 'AbortError') {
        return;
      }

      if (this.activeAbortController === abortController) {
        this.forecastView.renderErrorState(error.message);
        this.activeAbortController = null;
      }

      console.error('Forecast retrieval error:', error);
    }
  }

  /**
   * Instantiates or in-place updates the temperature chart view.
   *
   * @param {Array<{date: Date, minimumTemperature: number, maximumTemperature: number, condition: string, weatherIcon: string}>} dailyForecastList
   */
  renderForecastChart(dailyForecastList) {
    const canvasElement = document.getElementById('forecast-chart-canvas');
    const chartPanelElement = document.getElementById('forecast-chart-panel');

    if (canvasElement === null || chartPanelElement === null) {
      return;
    }

    if (this.forecastChartView === null || this.forecastChartView.canvasElement !== canvasElement) {
      this.forecastChartView = new ForecastChartView({
        canvasElement: canvasElement,
        containerElement: chartPanelElement
      });
    }

    this.forecastChartView.renderChart({
      dailyForecastList: dailyForecastList,
      localeFormatter: this.localeFormatter
    });
  }
}
