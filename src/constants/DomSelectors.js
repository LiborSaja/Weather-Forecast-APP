/**
 * HTML element IDs, CSS selectors, and CSS classes used across the application.
 */
export const DOM_IDS = Object.freeze({
    SEARCH_INPUT: "city-search-input",
    SEARCH_CLEAR_BUTTON: "city-search-clear-button",
    GEOLOCATION_BUTTON: "geolocation-button",
    LANGUAGE_SELECT: "language-select",
    AUTOCOMPLETE_DROPDOWN: "city-autocomplete-dropdown",
    AUTOCOMPLETE_LISTBOX: "city-autocomplete-listbox",
    FORECAST_CONTAINER: "forecast-container",
    CHART_CANVAS: "forecast-chart-canvas",
    CHART_PANEL: "forecast-chart-panel",
    TABLE_PANEL: "forecast-table-panel",
    VIEW_TOGGLE_TABLE: "view-toggle-table",
    VIEW_TOGGLE_CHART: "view-toggle-chart",
    APP_TITLE_TEXT: "app-title-text",
    APP_SUBTITLE_TEXT: "app-subtitle-text",
});

export const DOM_SELECTORS = Object.freeze({
    SEARCH_LABEL: ".search-label",
    GEOLOCATION_LABEL: ".geolocation-label",
    FOOTER_PARAGRAPH: ".app-footer p",
    FORECAST_RESULT: ".forecast-result",
    FORECAST_CITY_TITLE: ".forecast-city-title",
    FORECAST_CITY_SUBTITLE: ".forecast-city-subtitle",
    FORECAST_TABLE: ".forecast-table",
    VIEW_TOGGLE_TABLE: "#view-toggle-table",
    VIEW_TOGGLE_CHART: "#view-toggle-chart",
    FORECAST_TABLE_PANEL: "#forecast-table-panel",
    FORECAST_CHART_PANEL: "#forecast-chart-panel",
    OPTION_ROLE: '[role="option"]',
});

export const CSS_CLASSES = Object.freeze({
    VIEW_TOGGLE_BUTTON: "view-toggle-button",
    VIEW_TOGGLE_BUTTON_ACTIVE: "view-toggle-button--active",
    AUTOCOMPLETE_WRAPPER: "autocomplete-wrapper",
    AUTOCOMPLETE_DROPDOWN: "autocomplete-dropdown",
    AUTOCOMPLETE_LIST: "autocomplete-list",
    AUTOCOMPLETE_OPTION: "autocomplete-option",
    AUTOCOMPLETE_OPTION_HIGHLIGHTED: "autocomplete-option--highlighted",
    AUTOCOMPLETE_OPTION_NAME: "autocomplete-option-name",
    AUTOCOMPLETE_OPTION_COUNTRY: "autocomplete-option-country",
    AUTOCOMPLETE_EMPTY: "autocomplete-empty",
    FORECAST_RESULT: "forecast-result",
    FORECAST_RESULT_LOADING: "forecast-result--loading",
});
