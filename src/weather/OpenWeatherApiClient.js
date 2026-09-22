/**
 * Client for communicating with the OpenWeather 5 Day / 3 Hour Forecast REST API with in-memory TTL caching.
 */
export class OpenWeatherApiClient {
  /**
   * @param {object} [options]
   * @param {string} [options.apiKey] Optional API key override. Defaults to VITE_OPENWEATHER_API_KEY.
   * @param {string} [options.baseUrl] Base URL for the forecast endpoint.
   * @param {number} [options.cacheTtlInMilliseconds] Cache TTL in ms. Defaults to 10 minutes (600,000 ms) per OpenWeather recommendations.
   */
  constructor({
    apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY,
    baseUrl = 'https://api.openweathermap.org/data/2.5/forecast',
    cacheTtlInMilliseconds = 10 * 60 * 1000
  } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.cacheTtlInMilliseconds = cacheTtlInMilliseconds;
    /** @type {Map<string, {data: object, expiresAt: number}>} */
    this.forecastCacheMap = new Map();
  }

  /**
   * Fetches the 5-day forecast for given latitude and longitude coordinates, utilizing a 10-minute in-memory TTL cache.
   *
   * @param {object} params
   * @param {number} params.latitude
   * @param {number} params.longitude
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<object>} Raw JSON response from OpenWeather API
   */
  async fetchForecast({ latitude, longitude, signal = undefined }) {
    if (this.apiKey === undefined || typeof this.apiKey !== 'string' || this.apiKey.trim().length === 0) {
      throw new Error(
        'OpenWeather API key is missing. Please create a .env.local file with VITE_OPENWEATHER_API_KEY=<your-key>.'
      );
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new Error('Valid latitude and longitude numerical coordinates are required.');
    }

    // Construct standardized coordinate key rounded to 4 decimal places (~11 meters precision)
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cachedEntry = this.forecastCacheMap.get(cacheKey);

    // Return cached forecast if still valid within the 10-minute TTL window
    if (cachedEntry !== undefined && Date.now() < cachedEntry.expiresAt) {
      return cachedEntry.data;
    }

    const url = new URL(this.baseUrl);
    url.searchParams.set('lat', latitude.toString());
    url.searchParams.set('lon', longitude.toString());
    url.searchParams.set('units', 'metric');
    url.searchParams.set('appid', this.apiKey.trim());

    const response = await fetch(url.toString(), {
      signal: signal
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid OpenWeather API key. Please check your VITE_OPENWEATHER_API_KEY configuration.');
      } else if (response.status === 404) {
        throw new Error('Forecast data for the selected location could not be found.');
      } else if (response.status === 429) {
        throw new Error('OpenWeather API rate limit exceeded. Please try again in a few moments.');
      } else if (response.status >= 500) {
        throw new Error('OpenWeather service is currently experiencing issues. Please try again later.');
      } else {
        throw new Error(`Weather service responded with error status ${response.status} (${response.statusText}).`);
      }
    }

    const forecastData = await response.json();

    if (forecastData === null || typeof forecastData !== 'object' || !Array.isArray(forecastData.list)) {
      throw new Error('Received unexpected or malformed forecast response structure from weather service.');
    }

    // Cache the fresh response with 10-minute expiration
    this.forecastCacheMap.set(cacheKey, {
      data: forecastData,
      expiresAt: Date.now() + this.cacheTtlInMilliseconds
    });

    return forecastData;
  }
}
