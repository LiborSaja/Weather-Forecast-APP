import {
    DOM_IDS,
    CSS_CLASSES,
    DOM_SELECTORS,
} from "../constants/DomSelectors.js";
import { APP_CONFIG } from "../constants/AppConfig.js";
import { TRANSLATION_KEYS } from "../constants/TranslationKeys.js";
import { ForecastView } from "../weather/ForecastView.js";

export class CityAutocomplete {
    /**
     * @param {object} options
     * @param {HTMLInputElement} options.inputElement
     * @param {HTMLElement} options.resultsContainerElement
     * @param {HTMLButtonElement|null} [options.clearButtonElement]
     * @param {import('./CityRepository.js').CityRepository} options.cityRepository
     * @param {import('../localization/TranslationService.js').TranslationService|null} [options.translationService]
     * @param {(city: {id: number, name: string, country: string, coord: {lat: number, lon: number}}) => void} options.onCitySelected
     */
    constructor({
        inputElement,
        resultsContainerElement,
        clearButtonElement = null,
        cityRepository,
        translationService = null,
        onCitySelected,
    }) {
        this.inputElement = inputElement;
        this.resultsContainerElement = resultsContainerElement;
        this.clearButtonElement = clearButtonElement;
        this.cityRepository = cityRepository;
        this.translationService = translationService;
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
        this.handleResultsClick = this.handleResultsClick.bind(this);
        this.handleResultsMouseOver = this.handleResultsMouseOver.bind(this);

        this.initialize();
    }

    initialize() {
        this.inputElement.setAttribute("role", "combobox");
        this.inputElement.setAttribute("aria-autocomplete", "list");
        this.inputElement.setAttribute("aria-expanded", "false");
        this.inputElement.setAttribute("aria-haspopup", "listbox");

        this.resultsContainerElement.setAttribute("role", "listbox");
        this.resultsContainerElement.id = DOM_IDS.AUTOCOMPLETE_LISTBOX;
        this.inputElement.setAttribute(
            "aria-controls",
            this.resultsContainerElement.id,
        );

        this.inputElement.addEventListener("input", this.handleInput);
        this.inputElement.addEventListener("keydown", this.handleKeyDown);
        this.resultsContainerElement.addEventListener(
            "click",
            this.handleResultsClick,
        );
        this.resultsContainerElement.addEventListener(
            "mouseover",
            this.handleResultsMouseOver,
        );
        document.addEventListener("click", this.handleClickOutside);

        if (this.clearButtonElement !== null) {
            this.clearButtonElement.addEventListener(
                "click",
                this.handleClearClick,
            );
        }

        this.updateClearButtonVisibility();
    }

    destroy() {
        this.inputElement.removeEventListener("input", this.handleInput);
        this.inputElement.removeEventListener("keydown", this.handleKeyDown);
        this.resultsContainerElement.removeEventListener(
            "click",
            this.handleResultsClick,
        );
        this.resultsContainerElement.removeEventListener(
            "mouseover",
            this.handleResultsMouseOver,
        );
        document.removeEventListener("click", this.handleClickOutside);

        if (this.clearButtonElement !== null) {
            this.clearButtonElement.removeEventListener(
                "click",
                this.handleClearClick,
            );
        }

        if (this.debounceTimerId !== null) {
            clearTimeout(this.debounceTimerId);
            this.debounceTimerId = null;
        }
    }

    handleInput() {
        this.updateClearButtonVisibility();

        if (this.debounceTimerId !== null) {
            clearTimeout(this.debounceTimerId);
        }

        // If text was modified after a selection, reset selected city reference
        if (this.selectedCity !== null) {
            const formattedSelectedCity = ForecastView.formatCityDisplayName(
                this.selectedCity,
            );
            if (this.inputElement.value !== formattedSelectedCity) {
                this.selectedCity = null;
            }
        }

        this.debounceTimerId = window.setTimeout(() => {
            this.performSearch();
        }, APP_CONFIG.SEARCH_DEBOUNCE_DELAY_MS);
    }

    performSearch() {
        const searchQuery = this.inputElement.value.trim();

        if (searchQuery.length < APP_CONFIG.SEARCH_MIN_QUERY_LENGTH) {
            this.closeResults();
            return;
        }

        this.currentResultList = this.cityRepository.search(
            searchQuery,
            APP_CONFIG.SEARCH_MAX_RESULTS,
        );
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
     * @param {KeyboardEvent} event
     */
    handleKeyDown(event) {
        if (!this.isOpen) {
            if (
                event.key === "ArrowDown" &&
                this.inputElement.value.trim().length >=
                    APP_CONFIG.SEARCH_MIN_QUERY_LENGTH
            ) {
                event.preventDefault();
                this.performSearch();
            }
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            this.navigateResults(1);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            this.navigateResults(-1);
        } else if (event.key === "Enter") {
            event.preventDefault();
            if (
                this.highlightedIndex >= 0 &&
                this.highlightedIndex < this.currentResultList.length
            ) {
                const cityToSelect =
                    this.currentResultList[this.highlightedIndex];
                this.selectCity(cityToSelect);
            }
        } else if (event.key === "Escape") {
            event.preventDefault();
            this.closeResults();
        }
    }

    /**
     * @param {number} direction 1 for next, -1 for previous
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

    updateHighlightState() {
        const optionElementList = this.resultsContainerElement.querySelectorAll(
            DOM_SELECTORS.OPTION_ROLE,
        );

        optionElementList.forEach((optionElement, index) => {
            const isHighlighted = index === this.highlightedIndex;
            if (isHighlighted) {
                optionElement.classList.add(
                    CSS_CLASSES.AUTOCOMPLETE_OPTION_HIGHLIGHTED,
                );
                optionElement.setAttribute("aria-selected", "true");
                this.inputElement.setAttribute(
                    "aria-activedescendant",
                    optionElement.id,
                );
                optionElement.scrollIntoView({ block: "nearest" });
            } else {
                optionElement.classList.remove(
                    CSS_CLASSES.AUTOCOMPLETE_OPTION_HIGHLIGHTED,
                );
                optionElement.setAttribute("aria-selected", "false");
            }
        });

        if (this.highlightedIndex === -1) {
            this.inputElement.removeAttribute("aria-activedescendant");
        }
    }

    renderResults() {
        this.resultsContainerElement.innerHTML = "";

        const listElement = document.createElement("ul");
        listElement.className = CSS_CLASSES.AUTOCOMPLETE_LIST;

        this.currentResultList.forEach((city, index) => {
            const itemElement = document.createElement("li");
            itemElement.id = `city-option-${index}`;
            itemElement.className = CSS_CLASSES.AUTOCOMPLETE_OPTION;
            itemElement.setAttribute("role", "option");
            itemElement.setAttribute("aria-selected", "false");
            itemElement.dataset.index = String(index);

            const cityNameSpan = document.createElement("span");
            cityNameSpan.className = CSS_CLASSES.AUTOCOMPLETE_OPTION_NAME;
            cityNameSpan.textContent = city.name;

            const countrySpan = document.createElement("span");
            countrySpan.className = CSS_CLASSES.AUTOCOMPLETE_OPTION_COUNTRY;
            countrySpan.textContent = city.country;

            itemElement.appendChild(cityNameSpan);
            itemElement.appendChild(countrySpan);

            listElement.appendChild(itemElement);
        });

        this.resultsContainerElement.appendChild(listElement);
    }

    /**
     * @param {MouseEvent} event
     */
    handleResultsClick(event) {
        const optionElement = event.target.closest(DOM_SELECTORS.OPTION_ROLE);
        if (
            optionElement !== null &&
            optionElement.dataset.index !== undefined
        ) {
            const index = parseInt(optionElement.dataset.index, 10);
            if (
                !isNaN(index) &&
                index >= 0 &&
                index < this.currentResultList.length
            ) {
                this.selectCity(this.currentResultList[index]);
            }
        }
    }

    /**
     * @param {MouseEvent} event
     */
    handleResultsMouseOver(event) {
        const optionElement = event.target.closest(DOM_SELECTORS.OPTION_ROLE);
        if (
            optionElement !== null &&
            optionElement.dataset.index !== undefined
        ) {
            const index = parseInt(optionElement.dataset.index, 10);
            if (!isNaN(index) && index !== this.highlightedIndex) {
                this.highlightedIndex = index;
                this.updateHighlightState();
            }
        }
    }

    renderNoResults() {
        this.resultsContainerElement.innerHTML = "";
        const emptyNoticeElement = document.createElement("div");
        emptyNoticeElement.className = CSS_CLASSES.AUTOCOMPLETE_EMPTY;
        const noResultsMessage =
            this.translationService !== null
                ? this.translationService.t(TRANSLATION_KEYS.SEARCH_NO_RESULTS)
                : "No matching cities found";
        emptyNoticeElement.textContent = noResultsMessage;
        this.resultsContainerElement.appendChild(emptyNoticeElement);
    }

    /**
     * @param {{id: number, name: string, country: string, coord: {lat: number, lon: number}}} city
     */
    selectCity(city) {
        this.selectedCity = city;
        this.inputElement.value = ForecastView.formatCityDisplayName(city);
        this.updateClearButtonVisibility();
        this.closeResults();

        if (typeof this.onCitySelected === "function") {
            this.onCitySelected(city);
        }
    }

    /**
     * @param {MouseEvent} event
     */
    handleClearClick(event) {
        event.preventDefault();
        this.clearSearch();
    }

    clearSearch() {
        this.inputElement.value = "";
        this.selectedCity = null;
        this.updateClearButtonVisibility();
        this.closeResults();
        this.inputElement.focus();
    }

    updateClearButtonVisibility() {
        if (this.clearButtonElement === null) {
            return;
        }
        const hasText = this.inputElement.value.trim().length > 0;
        this.clearButtonElement.hidden = !hasText;
    }

    openResults() {
        this.isOpen = true;
        this.resultsContainerElement.hidden = false;
        this.inputElement.setAttribute("aria-expanded", "true");
    }

    closeResults() {
        this.isOpen = false;
        this.resultsContainerElement.hidden = true;
        this.inputElement.setAttribute("aria-expanded", "false");
        this.inputElement.removeAttribute("aria-activedescendant");
        this.highlightedIndex = -1;
    }

    /**
     * @param {MouseEvent} event
     */
    handleClickOutside(event) {
        const isClickedInsideInput = this.inputElement.contains(event.target);
        const isClickedInsideDropdown = this.resultsContainerElement.contains(
            event.target,
        );

        if (!isClickedInsideInput && !isClickedInsideDropdown) {
            this.closeResults();
        }
    }
}
