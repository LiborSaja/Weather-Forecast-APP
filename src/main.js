import { WeatherApplication } from './app/WeatherApplication.js';

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('city-search-input');
  const clearButton = document.getElementById('city-search-clear-button');
  const geolocationButton = document.getElementById('geolocation-button');
  const autocompleteResults = document.getElementById('city-autocomplete-dropdown');
  const forecastContainer = document.getElementById('forecast-container');

  if (searchInput === null || autocompleteResults === null || forecastContainer === null) {
    console.error('Required DOM elements were not found in index.html.');
    return;
  }

  const weatherApplication = new WeatherApplication({
    searchInput: searchInput,
    clearButton: clearButton,
    geolocationButton: geolocationButton,
    autocompleteResults: autocompleteResults,
    forecastContainer: forecastContainer
  });

  weatherApplication.start();
});
