import { WeatherApplication } from "./app/WeatherApplication.js";
import { DOM_IDS } from "./constants/DomSelectors.js";

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById(DOM_IDS.SEARCH_INPUT);
    const clearButton = document.getElementById(DOM_IDS.SEARCH_CLEAR_BUTTON);
    const geolocationButton = document.getElementById(
        DOM_IDS.GEOLOCATION_BUTTON,
    );
    const languageSelect = document.getElementById(DOM_IDS.LANGUAGE_SELECT);
    const autocompleteResults = document.getElementById(
        DOM_IDS.AUTOCOMPLETE_DROPDOWN,
    );
    const forecastContainer = document.getElementById(
        DOM_IDS.FORECAST_CONTAINER,
    );

    if (
        searchInput === null ||
        autocompleteResults === null ||
        forecastContainer === null
    ) {
        console.error("Required DOM elements were not found in index.html.");
        return;
    }

    const weatherApplication = new WeatherApplication({
        searchInput: searchInput,
        clearButton: clearButton,
        geolocationButton: geolocationButton,
        languageSelect: languageSelect,
        autocompleteResults: autocompleteResults,
        forecastContainer: forecastContainer,
    });

    weatherApplication.start();
});
