/**
 * Handles DOM rendering for the 5-day weather forecast, loading states, and error alerts.
 */
export class ForecastView {
  /**
   * @param {object} options
   * @param {HTMLElement} options.containerElement
   * @param {import('../localization/LocaleFormatter.js').LocaleFormatter} options.localeFormatter
   */
  constructor({ containerElement, localeFormatter }) {
    this.containerElement = containerElement;
    this.localeFormatter = localeFormatter;
  }

  /**
   * Renders the initial / empty prompt state.
   */
  renderInitialState() {
    this.containerElement.innerHTML = `
      <section class="forecast-placeholder" aria-live="polite">
        <div class="forecast-placeholder-icon" aria-hidden="true">🌍</div>
        <h2 class="forecast-placeholder-title">Choose a City</h2>
        <p class="forecast-placeholder-text">Type a city name in the search box above to view the 5-day weather forecast.</p>
      </section>
    `;
  }

  /**
   * Renders the loading indicator when fetching forecast data.
   *
   * @param {string} cityName
   */
  renderLoadingState(cityName) {
    const existingResultElement = this.containerElement.querySelector('.forecast-result');

    // If result shell is already mounted, show subtle loading state without destroying DOM
    if (existingResultElement !== null) {
      const citySubtitleElement = existingResultElement.querySelector('.forecast-city-subtitle');
      if (citySubtitleElement !== null) {
        citySubtitleElement.textContent = `Loading forecast for ${cityName}...`;
      }
      existingResultElement.classList.add('forecast-result--loading');
      return;
    }

    this.containerElement.innerHTML = `
      <section class="forecast-loading" role="status" aria-live="polite">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p class="loading-text">Loading 5-day forecast for <strong>${this.escapeHtml(cityName)}</strong>...</p>
      </section>
    `;
  }

  /**
   * Renders an error message to the user.
   *
   * @param {string} errorMessage
   */
  renderErrorState(errorMessage) {
    this.containerElement.innerHTML = `
      <section class="forecast-error" role="alert" aria-live="assertive">
        <div class="error-icon" aria-hidden="true">⚠️</div>
        <div class="error-content">
          <h2 class="error-title">Unable to load forecast</h2>
          <p class="error-message">${this.escapeHtml(errorMessage)}</p>
        </div>
      </section>
    `;
  }

  /**
   * Renders or updates the 5-day weather forecast table for the selected city.
   *
   * @param {object} params
   * @param {{name: string, country: string}} params.city
   * @param {Array<{date: Date, minimumTemperature: number, maximumTemperature: number, condition: string, weatherIcon: string}>} params.dailyForecastList
   * @param {() => void} [params.onChartTabActivated]
   */
  renderForecast({ city, dailyForecastList, onChartTabActivated = undefined }) {
    if (dailyForecastList.length === 0) {
      this.renderErrorState('No forecast data available for this location.');
      return;
    }

    const cityDisplayName = city.country && city.country.length > 0
      ? `${city.name}, ${city.country}`
      : city.name;

    let tableRowsHtml = '';

    for (let index = 0; index < dailyForecastList.length; index += 1) {
      const dailyForecast = dailyForecastList[index];
      const formattedDate = this.localeFormatter.formatDate(dailyForecast.date);
      const formattedMinTemp = this.localeFormatter.formatTemperature(dailyForecast.minimumTemperature);
      const formattedMaxTemp = this.localeFormatter.formatTemperature(dailyForecast.maximumTemperature);
      const iconUrl = `https://openweathermap.org/img/wn/${dailyForecast.weatherIcon}@2x.png`;

      tableRowsHtml += `
        <tr>
          <td class="table-cell-date">${this.escapeHtml(formattedDate)}</td>
          <td class="table-cell-min-temp">${this.escapeHtml(formattedMinTemp)}</td>
          <td class="table-cell-max-temp">${this.escapeHtml(formattedMaxTemp)}</td>
          <td class="table-cell-weather">
            <div class="weather-condition-wrapper">
              <img
                src="${iconUrl}"
                alt="${this.escapeHtml(dailyForecast.condition)}"
                class="weather-icon"
                width="40"
                height="40"
                loading="lazy"
              />
              <span class="weather-condition-label">${this.escapeHtml(dailyForecast.condition)}</span>
            </div>
          </td>
        </tr>
      `;
    }

    const existingResultElement = this.containerElement.querySelector('.forecast-result');

    // In-place update: reuse existing DOM elements, preserving canvas and active tab
    if (existingResultElement !== null) {
      existingResultElement.classList.remove('forecast-result--loading');
      const cityTitleElement = existingResultElement.querySelector('.forecast-city-title');
      const citySubtitleElement = existingResultElement.querySelector('.forecast-city-subtitle');
      const tableBodyElement = existingResultElement.querySelector('tbody');

      if (cityTitleElement !== null) {
        cityTitleElement.textContent = cityDisplayName;
      }
      if (citySubtitleElement !== null) {
        citySubtitleElement.textContent = '5-Day Weather Forecast';
      }
      if (tableBodyElement !== null) {
        tableBodyElement.innerHTML = tableRowsHtml;
      }
      return;
    }

    // Initial mount of the forecast result shell
    this.containerElement.innerHTML = `
      <section class="forecast-result" aria-live="polite">
        <header class="forecast-result-header">
          <div class="forecast-result-header-main">
            <h2 class="forecast-city-title">${this.escapeHtml(cityDisplayName)}</h2>
            <p class="forecast-city-subtitle">5-Day Weather Forecast</p>
          </div>
          <div class="view-toggle-group" role="tablist" aria-label="Forecast view mode">
            <button
              type="button"
              id="view-toggle-table"
              class="view-toggle-button view-toggle-button--active"
              role="tab"
              aria-selected="true"
              aria-controls="forecast-table-panel"
            >
              📋 Table
            </button>
            <button
              type="button"
              id="view-toggle-chart"
              class="view-toggle-button"
              role="tab"
              aria-selected="false"
              aria-controls="forecast-chart-panel"
            >
              📈 Chart
            </button>
          </div>
        </header>

        <div id="forecast-table-panel" class="forecast-view-panel" role="tabpanel" aria-labelledby="view-toggle-table">
          <div class="forecast-table-container">
            <table class="forecast-table" aria-label="5-Day Weather Forecast for ${this.escapeHtml(cityDisplayName)}">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Min Temperature</th>
                  <th scope="col">Max Temperature</th>
                  <th scope="col">Weather</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <div id="forecast-chart-panel" class="forecast-view-panel" role="tabpanel" aria-labelledby="view-toggle-chart" hidden>
          <div class="forecast-chart-wrapper">
            <canvas id="forecast-chart-canvas"></canvas>
          </div>
        </div>
      </section>
    `;

    this.bindViewTabs(onChartTabActivated);
  }

  /**
   * Binds click events to view toggle tab buttons.
   *
   * @param {() => void} [onChartTabActivated]
   */
  bindViewTabs(onChartTabActivated) {
    const tableButton = this.containerElement.querySelector('#view-toggle-table');
    const chartButton = this.containerElement.querySelector('#view-toggle-chart');
    const tablePanel = this.containerElement.querySelector('#forecast-table-panel');
    const chartPanel = this.containerElement.querySelector('#forecast-chart-panel');

    if (tableButton === null || chartButton === null || tablePanel === null || chartPanel === null) {
      return;
    }

    tableButton.addEventListener('click', () => {
      tableButton.classList.add('view-toggle-button--active');
      tableButton.setAttribute('aria-selected', 'true');
      chartButton.classList.remove('view-toggle-button--active');
      chartButton.setAttribute('aria-selected', 'false');

      tablePanel.hidden = false;
      chartPanel.hidden = true;
    });

    chartButton.addEventListener('click', () => {
      chartButton.classList.add('view-toggle-button--active');
      chartButton.setAttribute('aria-selected', 'true');
      tableButton.classList.remove('view-toggle-button--active');
      tableButton.setAttribute('aria-selected', 'false');

      chartPanel.hidden = false;
      tablePanel.hidden = true;

      if (typeof onChartTabActivated === 'function') {
        onChartTabActivated();
      }
    });
  }

  /**
   * Helper to escape HTML characters in strings for safe rendering.
   *
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    if (typeof text !== 'string') {
      return '';
    }
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
