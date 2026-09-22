/**
 * Manages the collection of available cities loaded from a local JSON resource.
 */
export class CityRepository {
  /**
   * @param {string} [datasetUrl] Optional custom path to city list JSON file.
   */
  constructor(datasetUrl = '/data/city.list.json') {
    this.datasetUrl = datasetUrl;
    /** @type {Array<{id: number, name: string, country: string, coord: {lat: number, lon: number}}>} */
    this.cityList = [];
    this.isLoaded = false;
  }

  /**
   * Loads and parses the city dataset from the local JSON file.
   *
   * @returns {Promise<void>}
   */
  async loadCities() {
    try {
      const response = await fetch(this.datasetUrl);

      if (!response.ok) {
        throw new Error(`Failed to load cities dataset. HTTP Status: ${response.status} ${response.statusText}`);
      }

      const parsedCityList = await response.json();

      if (!Array.isArray(parsedCityList)) {
        throw new Error('Invalid cities dataset format: expected an array.');
      }

      this.cityList = parsedCityList;
      this.isLoaded = true;
    } catch (error) {
      this.isLoaded = false;
      this.cityList = [];
      throw error;
    }
  }

  /**
   * Normalizes a text string by removing diacritical marks and converting to lower case.
   *
   * @param {string} text
   * @returns {string}
   */
  normalizeText(text) {
    if (typeof text !== 'string') {
      return '';
    }
    // NFD splits letters and their diacritical marks, regex strips combining marks
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Searches for cities matching the search query.
   *
   * @param {string} searchQuery
   * @param {number} [maxResults=10]
   * @returns {Array<{id: number, name: string, country: string, coord: {lat: number, lon: number}}>}
   */
  search(searchQuery, maxResults = 10) {
    if (typeof searchQuery !== 'string') {
      return [];
    }

    const normalizedQuery = this.normalizeText(searchQuery);

    // Minimum requirement: search begins at 3 characters
    if (normalizedQuery.length < 3) {
      return [];
    }

    const matchingCityList = [];

    for (let index = 0; index < this.cityList.length; index += 1) {
      const city = this.cityList[index];
      const normalizedCityName = this.normalizeText(city.name);

      if (normalizedCityName.includes(normalizedQuery)) {
        matchingCityList.push(city);

        if (matchingCityList.length >= maxResults) {
          break;
        }
      }
    }

    return matchingCityList;
  }
}
