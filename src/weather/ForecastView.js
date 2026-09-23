import {
    DOM_IDS,
    DOM_SELECTORS,
    CSS_CLASSES,
} from "../constants/DomSelectors.js";
import { TRANSLATION_KEYS } from "../constants/TranslationKeys.js";
import { API_ENDPOINTS } from "../constants/ApiEndpoints.js";

export class ForecastView {
    /**
     * @param {object} options
     * @param {HTMLElement} options.containerElement
     * @param {import('../localization/LocaleFormatter.js').LocaleFormatter} options.localeFormatter
     * @param {import('../localization/TranslationService.js').TranslationService|null} [options.translationService]
     */
    constructor({
        containerElement,
        localeFormatter,
        translationService = null,
    }) {
        this.containerElement = containerElement;
        this.localeFormatter = localeFormatter;
        this.translationService = translationService;
    }

    /**
     * @param {string} key
     * @returns {string}
     */
    t(key) {
        if (this.translationService !== null) {
            return this.translationService.t(key);
        }
        return key;
    }

    /**
     * @param {string} condition
     * @returns {string}
     */
    tCondition(condition) {
        if (this.translationService !== null) {
            return this.translationService.tCondition(condition);
        }
        return condition;
    }

    /**
     * @param {{name: string, country?: string}} city
     * @returns {string}
     */
    static formatCityDisplayName(city) {
        if (city === null || city === undefined) {
            return "";
        }
        if (
            typeof city.country === "string" &&
            city.country.trim().length > 0
        ) {
            return `${city.name}, ${city.country}`;
        }
        return city.name;
    }

    renderTableHeaderHtml() {
        return `
      <tr>
        <th scope="col">${this.escapeHtml(this.t(TRANSLATION_KEYS.TABLE_DATE))}</th>
        <th scope="col">${this.escapeHtml(this.t(TRANSLATION_KEYS.TABLE_MIN_TEMP))}</th>
        <th scope="col">${this.escapeHtml(this.t(TRANSLATION_KEYS.TABLE_MAX_TEMP))}</th>
        <th scope="col">${this.escapeHtml(this.t(TRANSLATION_KEYS.TABLE_WEATHER))}</th>
      </tr>
    `;
    }

    renderInitialState() {
        this.containerElement.innerHTML = `
      <section class="forecast-placeholder" aria-live="polite">
        <div class="forecast-placeholder-icon" aria-hidden="true">🌍</div>
        <h2 class="forecast-placeholder-title">${this.escapeHtml(this.t(TRANSLATION_KEYS.PLACEHOLDER_TITLE))}</h2>
        <p class="forecast-placeholder-text">${this.escapeHtml(this.t(TRANSLATION_KEYS.PLACEHOLDER_TEXT))}</p>
      </section>
    `;
    }

    /**
     * @param {string} cityName
     */
    renderLoadingState(cityName) {
        const existingResultElement = this.containerElement.querySelector(
            DOM_SELECTORS.FORECAST_RESULT,
        );
        const loadingPrefix = this.t(TRANSLATION_KEYS.LOADING_TEXT_PREFIX);

        // If result shell is already mounted, show subtle loading state without destroying DOM
        if (existingResultElement !== null) {
            const citySubtitleElement = existingResultElement.querySelector(
                DOM_SELECTORS.FORECAST_CITY_SUBTITLE,
            );
            if (citySubtitleElement !== null) {
                citySubtitleElement.textContent = `${loadingPrefix} ${cityName}...`;
            }
            existingResultElement.classList.add(
                CSS_CLASSES.FORECAST_RESULT_LOADING,
            );
            return;
        }

        this.containerElement.innerHTML = `
      <section class="forecast-loading" role="status" aria-live="polite">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p class="loading-text">${this.escapeHtml(loadingPrefix)} <strong>${this.escapeHtml(cityName)}</strong>...</p>
      </section>
    `;
    }

    /**
     * @param {string} errorMessage
     */
    renderErrorState(errorMessage) {
        this.containerElement.innerHTML = `
      <section class="forecast-error" role="alert" aria-live="assertive">
        <div class="error-icon" aria-hidden="true">⚠️</div>
        <div class="error-content">
          <h2 class="error-title">${this.escapeHtml(this.t(TRANSLATION_KEYS.ERROR_TITLE))}</h2>
          <p class="error-message">${this.escapeHtml(errorMessage)}</p>
        </div>
      </section>
    `;
    }

    /**
     * @param {object} params
     * @param {{name: string, country: string}} params.city
     * @param {Array<{date: Date, minimumTemperature: number, maximumTemperature: number, condition: string, weatherIcon: string}>} params.dailyForecastList
     * @param {() => void} [params.onChartTabActivated]
     */
    renderForecast({
        city,
        dailyForecastList,
        onChartTabActivated = undefined,
    }) {
        if (dailyForecastList.length === 0) {
            this.renderErrorState(this.t(TRANSLATION_KEYS.ERROR_NO_DATA));
            return;
        }

        const cityDisplayName = ForecastView.formatCityDisplayName(city);
        let tableRowsHtml = "";

        for (let index = 0; index < dailyForecastList.length; index += 1) {
            const dailyForecast = dailyForecastList[index];
            const formattedDate = this.localeFormatter.formatDate(
                dailyForecast.date,
            );
            const formattedMinTemp = this.localeFormatter.formatTemperature(
                dailyForecast.minimumTemperature,
            );
            const formattedMaxTemp = this.localeFormatter.formatTemperature(
                dailyForecast.maximumTemperature,
            );
            const translatedCondition = this.tCondition(
                dailyForecast.condition,
            );
            const iconUrl = `${API_ENDPOINTS.OPENWEATHER_ICON_BASE_URL}${dailyForecast.weatherIcon}@2x.png`;

            tableRowsHtml += `
        <tr>
          <td class="table-cell-date">${this.escapeHtml(formattedDate)}</td>
          <td class="table-cell-min-temp">${this.escapeHtml(formattedMinTemp)}</td>
          <td class="table-cell-max-temp">${this.escapeHtml(formattedMaxTemp)}</td>
          <td class="table-cell-weather">
            <div class="weather-condition-wrapper">
              <img
                src="${iconUrl}"
                alt="${this.escapeHtml(translatedCondition)}"
                class="weather-icon"
                width="40"
                height="40"
                loading="lazy"
              />
              <span class="weather-condition-label">${this.escapeHtml(translatedCondition)}</span>
            </div>
          </td>
        </tr>
      `;
        }

        const existingResultElement = this.containerElement.querySelector(
            DOM_SELECTORS.FORECAST_RESULT,
        );

        // In-place update: reuse existing DOM elements, preserving canvas and active tab
        if (existingResultElement !== null) {
            existingResultElement.classList.remove(
                CSS_CLASSES.FORECAST_RESULT_LOADING,
            );
            const cityTitleElement = existingResultElement.querySelector(
                DOM_SELECTORS.FORECAST_CITY_TITLE,
            );
            const citySubtitleElement = existingResultElement.querySelector(
                DOM_SELECTORS.FORECAST_CITY_SUBTITLE,
            );
            const tableTabButtonElement = existingResultElement.querySelector(
                DOM_SELECTORS.VIEW_TOGGLE_TABLE,
            );
            const chartTabButtonElement = existingResultElement.querySelector(
                DOM_SELECTORS.VIEW_TOGGLE_CHART,
            );
            const tableHeadElement =
                existingResultElement.querySelector("thead");
            const tableBodyElement =
                existingResultElement.querySelector("tbody");

            if (cityTitleElement !== null) {
                cityTitleElement.textContent = cityDisplayName;
            }
            if (citySubtitleElement !== null) {
                citySubtitleElement.textContent = this.t(
                    TRANSLATION_KEYS.FORECAST_SUBTITLE,
                );
            }
            if (tableTabButtonElement !== null) {
                tableTabButtonElement.textContent = this.t(
                    TRANSLATION_KEYS.VIEW_TABLE,
                );
            }
            if (chartTabButtonElement !== null) {
                chartTabButtonElement.textContent = this.t(
                    TRANSLATION_KEYS.VIEW_CHART,
                );
            }
            if (tableHeadElement !== null) {
                tableHeadElement.innerHTML = this.renderTableHeaderHtml();
            }
            if (tableBodyElement !== null) {
                tableBodyElement.innerHTML = tableRowsHtml;
            }
            return;
        }

        // Initial mount of the forecast result shell
        this.containerElement.innerHTML = `
      <section class="${CSS_CLASSES.FORECAST_RESULT}" aria-live="polite">
        <header class="forecast-result-header">
          <div class="forecast-result-header-main">
            <h2 class="forecast-city-title">${this.escapeHtml(cityDisplayName)}</h2>
            <p class="forecast-city-subtitle">${this.escapeHtml(this.t(TRANSLATION_KEYS.FORECAST_SUBTITLE))}</p>
          </div>
          <div class="view-toggle-group" role="tablist" aria-label="Forecast view mode">
            <button
              type="button"
              id="${DOM_IDS.VIEW_TOGGLE_TABLE}"
              class="${CSS_CLASSES.VIEW_TOGGLE_BUTTON} ${CSS_CLASSES.VIEW_TOGGLE_BUTTON_ACTIVE}"
              role="tab"
              aria-selected="true"
              aria-controls="${DOM_IDS.TABLE_PANEL}"
            >
              ${this.escapeHtml(this.t(TRANSLATION_KEYS.VIEW_TABLE))}
            </button>
            <button
              type="button"
              id="${DOM_IDS.VIEW_TOGGLE_CHART}"
              class="${CSS_CLASSES.VIEW_TOGGLE_BUTTON}"
              role="tab"
              aria-selected="false"
              aria-controls="${DOM_IDS.CHART_PANEL}"
            >
              ${this.escapeHtml(this.t(TRANSLATION_KEYS.VIEW_CHART))}
            </button>
          </div>
        </header>

        <div id="${DOM_IDS.TABLE_PANEL}" class="forecast-view-panel" role="tabpanel" aria-labelledby="${DOM_IDS.VIEW_TOGGLE_TABLE}">
          <div class="forecast-table-container">
            <table class="forecast-table" aria-label="5-Day Weather Forecast for ${this.escapeHtml(cityDisplayName)}">
              <thead>
                ${this.renderTableHeaderHtml()}
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <div id="${DOM_IDS.CHART_PANEL}" class="forecast-view-panel" role="tabpanel" aria-labelledby="${DOM_IDS.VIEW_TOGGLE_CHART}" hidden>
          <div class="forecast-chart-wrapper">
            <canvas id="${DOM_IDS.CHART_CANVAS}"></canvas>
          </div>
        </div>
      </section>
    `;

        this.bindViewTabs(onChartTabActivated);
    }

    /**
     * @param {() => void} [onChartTabActivated]
     */
    bindViewTabs(onChartTabActivated) {
        const tableButton = this.containerElement.querySelector(
            DOM_SELECTORS.VIEW_TOGGLE_TABLE,
        );
        const chartButton = this.containerElement.querySelector(
            DOM_SELECTORS.VIEW_TOGGLE_CHART,
        );
        const tablePanel = this.containerElement.querySelector(
            DOM_SELECTORS.FORECAST_TABLE_PANEL,
        );
        const chartPanel = this.containerElement.querySelector(
            DOM_SELECTORS.FORECAST_CHART_PANEL,
        );

        if (
            tableButton === null ||
            chartButton === null ||
            tablePanel === null ||
            chartPanel === null
        ) {
            return;
        }

        tableButton.addEventListener("click", () => {
            tableButton.classList.add(CSS_CLASSES.VIEW_TOGGLE_BUTTON_ACTIVE);
            tableButton.setAttribute("aria-selected", "true");
            chartButton.classList.remove(CSS_CLASSES.VIEW_TOGGLE_BUTTON_ACTIVE);
            chartButton.setAttribute("aria-selected", "false");

            tablePanel.hidden = false;
            chartPanel.hidden = true;
        });

        chartButton.addEventListener("click", () => {
            chartButton.classList.add(CSS_CLASSES.VIEW_TOGGLE_BUTTON_ACTIVE);
            chartButton.setAttribute("aria-selected", "true");
            tableButton.classList.remove(CSS_CLASSES.VIEW_TOGGLE_BUTTON_ACTIVE);
            tableButton.setAttribute("aria-selected", "false");

            chartPanel.hidden = false;
            tablePanel.hidden = true;

            if (typeof onChartTabActivated === "function") {
                onChartTabActivated();
            }
        });
    }

    /**
     * @param {string} text
     * @returns {string}
     */
    escapeHtml(text) {
        if (typeof text !== "string") {
            return "";
        }
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
