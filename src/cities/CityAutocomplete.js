/**
 * Manages the autocomplete UI component for city searching and selection.
 */
export class CityAutocomplete {
  /**
   * @param {object} options
   * @param {HTMLInputElement} options.inputElement
   * @param {HTMLElement} options.resultsContainerElement
   * @param {HTMLButtonElement|null} [options.clearButtonElement]
   * @param {import('./CityRepository.js').CityRepository} options.cityRepository
   * @param {(city: {id: number, name: string, country: string, coord: {lat: number, lon: number}}) => void} options.onCitySelected
   */
  constructor({ inputElement, resultsContainerElement, clearButtonElement = null, cityRepository, onCitySelected }) {
    this.inputElement = inputElement;
    this.resultsContainerElement = resultsContainerElement;
    this.clearButtonElement = clearButtonElement;
    this.cityRepository = cityRepository;
    this.onCitySelected = onCitySelected;

    this.isOpen = false;
    this.currentResultList = [];
    this.highlightedIndex = -1;
    this.debounceTimerId = null;
    this.selectedCity = null;

    this.handleInput = this.handleInput.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
    this.handleClearClick = this.handleClearClick.bind(this);

    this.initialize();
  }

  /**
   * Sets up event listeners and ARIA accessibility attributes.
   */
  initialize() {
    this.inputElement.setAttribute('role', 'combobox');
    this.inputElement.setAttribute('aria-autocomplete', 'list');
    this.inputElement.setAttribute('aria-expanded', 'false');
    this.inputElement.setAttribute('aria-haspopup', 'listbox');

    this.resultsContainerElement.setAttribute('role', 'listbox');
    this.resultsContainerElement.id = 'city-autocomplete-listbox';
    this.inputElement.setAttribute('aria-controls', this.resultsContainerElement.id);

    this.inputElement.addEventListener('input', this.handleInput);
    this.inputElement.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('click', this.handleClickOutside);

    if (this.clearButtonElement !== null) {
      this.clearButtonElement.addEventListener('click', this.handleClearClick);
    }

    this.updateClearButtonVisibility();
  }

  /**
   * Cleans up event listeners when component is destroyed.
   */
  destroy() {
    this.inputElement.removeEventListener('input', this.handleInput);
    this.inputElement.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('click', this.handleClickOutside);

    if (this.clearButtonElement !== null) {
      this.clearButtonElement.removeEventListener('click', this.handleClearClick);
    }

    if (this.debounceTimerId !== null) {
      clearTimeout(this.debounceTimerId);
      this.debounceTimerId = null;
    }
  }

  /**
   * Handles user typing inside the search input with debounce.
   */
  handleInput() {
    this.updateClearButtonVisibility();

    if (this.debounceTimerId !== null) {
      clearTimeout(this.debounceTimerId);
    }

    // If text was modified after a selection, reset selected city reference
    if (this.selectedCity !== null) {
      const formattedSelectedCity = this.formatCityLabel(this.selectedCity);
      if (this.inputElement.value !== formattedSelectedCity) {
        this.selectedCity = null;
      }
    }

    this.debounceTimerId = window.setTimeout(() => {
      this.performSearch();
    }, 180);
  }

  /**
   * Executes the search against the city repository and updates the dropdown.
   */
  performSearch() {
    const searchQuery = this.inputElement.value.trim();

    if (searchQuery.length < 3) {
      this.closeResults();
      return;
    }

    this.currentResultList = this.cityRepository.search(searchQuery, 10);
    this.highlightedIndex = -1;

    if (this.currentResultList.length > 0) {
      this.renderResults();
      this.openResults();
    } else {
      this.renderNoResults();
      this.openResults();
    }
  }

  /**
   * Handles keyboard navigation inside the combobox.
   *
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    if (!this.isOpen) {
      if (event.key === 'ArrowDown' && this.inputElement.value.trim().length >= 3) {
        event.preventDefault();
        this.performSearch();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.navigateResults(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.navigateResults(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.highlightedIndex >= 0 && this.highlightedIndex < this.currentResultList.length) {
        const cityToSelect = this.currentResultList[this.highlightedIndex];
        this.selectCity(cityToSelect);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeResults();
    }
  }

  /**
   * Moves the highlight index up or down through the list of results.
   *
   * @param {number} direction - 1 for next, -1 for previous
   */
  navigateResults(direction) {
    if (this.currentResultList.length === 0) {
      return;
    }

    const newIndex = this.highlightedIndex + direction;

    if (newIndex >= this.currentResultList.length) {
      this.highlightedIndex = 0;
    } else if (newIndex < 0) {
      this.highlightedIndex = this.currentResultList.length - 1;
    } else {
      this.highlightedIndex = newIndex;
    }

    this.updateHighlightState();
  }

  /**
   * Updates visual and ARIA highlight state on options.
   */
  updateHighlightState() {
    const optionElementList = this.resultsContainerElement.querySelectorAll('[role="option"]');

    optionElementList.forEach((optionElement, index) => {
      const isHighlighted = index === this.highlightedIndex;
      if (isHighlighted) {
        optionElement.classList.add('autocomplete-option--highlighted');
        optionElement.setAttribute('aria-selected', 'true');
        this.inputElement.setAttribute('aria-activedescendant', optionElement.id);
        optionElement.scrollIntoView({ block: 'nearest' });
      } else {
        optionElement.classList.remove('autocomplete-option--highlighted');
        optionElement.setAttribute('aria-selected', 'false');
      }
    });

    if (this.highlightedIndex === -1) {
      this.inputElement.removeAttribute('aria-activedescendant');
    }
  }

  /**
   * Renders the list of matched city options into the dropdown.
   */
  renderResults() {
    this.resultsContainerElement.innerHTML = '';

    const listElement = document.createElement('ul');
    listElement.className = 'autocomplete-list';

    this.currentResultList.forEach((city, index) => {
      const itemElement = document.createElement('li');
      itemElement.id = `city-option-${index}`;
      itemElement.className = 'autocomplete-option';
      itemElement.setAttribute('role', 'option');
      itemElement.setAttribute('aria-selected', 'false');

      const cityNameSpan = document.createElement('span');
      cityNameSpan.className = 'autocomplete-option-name';
      cityNameSpan.textContent = city.name;

      const countrySpan = document.createElement('span');
      countrySpan.className = 'autocomplete-option-country';
      countrySpan.textContent = city.country;

      itemElement.appendChild(cityNameSpan);
      itemElement.appendChild(countrySpan);

      itemElement.addEventListener('mouseenter', () => {
        this.highlightedIndex = index;
        this.updateHighlightState();
      });

      itemElement.addEventListener('click', () => {
        this.selectCity(city);
      });

      listElement.appendChild(itemElement);
    });

    this.resultsContainerElement.appendChild(listElement);
  }

  /**
   * Renders a message when no cities match the search query.
   */
  renderNoResults() {
    this.resultsContainerElement.innerHTML = '';
    const emptyNoticeElement = document.createElement('div');
    emptyNoticeElement.className = 'autocomplete-empty';
    emptyNoticeElement.textContent = 'No matching cities found';
    this.resultsContainerElement.appendChild(emptyNoticeElement);
  }

  /**
   * Selects a city, updates input value, closes dropdown and triggers callback.
   *
   * @param {{id: number, name: string, country: string, coord: {lat: number, lon: number}}} city
   */
  selectCity(city) {
    this.selectedCity = city;
    this.inputElement.value = this.formatCityLabel(city);
    this.updateClearButtonVisibility();
    this.closeResults();

    if (typeof this.onCitySelected === 'function') {
      this.onCitySelected(city);
    }
  }

  /**
   * Handles click on the clear button.
   *
   * @param {MouseEvent} event
   */
  handleClearClick(event) {
    event.preventDefault();
    this.clearSearch();
  }

  /**
   * Clears the input field, resets selected city state, and focuses the input.
   */
  clearSearch() {
    this.inputElement.value = '';
    this.selectedCity = null;
    this.updateClearButtonVisibility();
    this.closeResults();
    this.inputElement.focus();
  }

  /**
   * Updates clear button visibility based on whether the input has text.
   */
  updateClearButtonVisibility() {
    if (this.clearButtonElement === null) {
      return;
    }
    const hasText = this.inputElement.value.trim().length > 0;
    this.clearButtonElement.hidden = !hasText;
  }

  /**
   * Formats a city object into standard "City, Country" display text.
   *
   * @param {{name: string, country: string}} city
   * @returns {string}
   */
  formatCityLabel(city) {
    if (city === null || city === undefined) {
      return '';
    }
    if (city.country && city.country.length > 0) {
      return `${city.name}, ${city.country}`;
    }
    return city.name;
  }

  /**
   * Opens the dropdown container and updates ARIA expanded attribute.
   */
  openResults() {
    this.isOpen = true;
    this.resultsContainerElement.hidden = false;
    this.inputElement.setAttribute('aria-expanded', 'true');
  }

  /**
   * Closes the dropdown container and resets highlight state.
   */
  closeResults() {
    this.isOpen = false;
    this.resultsContainerElement.hidden = true;
    this.inputElement.setAttribute('aria-expanded', 'false');
    this.inputElement.removeAttribute('aria-activedescendant');
    this.highlightedIndex = -1;
  }

  /**
   * Closes dropdown when user clicks outside the autocomplete component.
   *
   * @param {MouseEvent} event
   */
  handleClickOutside(event) {
    const isClickedInsideInput = this.inputElement.contains(event.target);
    const isClickedInsideDropdown = this.resultsContainerElement.contains(event.target);

    if (!isClickedInsideInput && !isClickedInsideDropdown) {
      this.closeResults();
    }
  }
}
