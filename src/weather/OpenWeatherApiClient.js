/**
 * Client for communicating with the OpenWeather 5 Day / 3 Hour Forecast REST API.
 */
export class OpenWeatherApiClient {
  /**
   * @param {object} [options]
   * @param {string} [options.apiKey] Optional API key override. Defaults to VITE_OPENWEATHER_API_KEY.
   * @param {string} [options.baseUrl] Base URL for the forecast endpoint.
   */
  constructor({ apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY, baseUrl = 'https://api.openweathermap.org/data/2.5/forecast' } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Fetches the 5-day forecast for given latitude and longitude coordinates.
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

    return forecastData;
  }
}
