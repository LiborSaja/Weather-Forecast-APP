import Chart from "chart.js/auto";
import { TRANSLATION_KEYS } from "../constants/TranslationKeys.js";

export class ForecastChartView {
    /**
     * @param {object} options
     * @param {HTMLCanvasElement} options.canvasElement
     * @param {HTMLElement} options.containerElement
     * @param {import('../localization/TranslationService.js').TranslationService|null} [options.translationService]
     */
    constructor({
        canvasElement,
        containerElement,
        translationService = null,
    }) {
        this.canvasElement = canvasElement;
        this.containerElement = containerElement;
        this.translationService = translationService;
        /** @type {Chart|null} */
        this.chartInstance = null;
    }

    destroy() {
        if (this.chartInstance !== null) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }

    /**
     * @param {object} params
     * @param {Array<{date: Date, minimumTemperature: number, maximumTemperature: number, condition: string, weatherIcon: string}>} params.dailyForecastList
     * @param {import('../localization/LocaleFormatter.js').LocaleFormatter} params.localeFormatter
     */
    renderChart({ dailyForecastList, localeFormatter }) {
        if (dailyForecastList.length === 0) {
            return;
        }

        const labelList = [];
        const minimumTemperatureList = [];
        const maximumTemperatureList = [];

        for (let index = 0; index < dailyForecastList.length; index += 1) {
            const forecastItem = dailyForecastList[index];
            const formattedDate = localeFormatter.formatDate(forecastItem.date);

            labelList.push(formattedDate);
            minimumTemperatureList.push(
                Math.round(forecastItem.minimumTemperature),
            );
            maximumTemperatureList.push(
                Math.round(forecastItem.maximumTemperature),
            );
        }

        const maxDatasetLabel =
            this.translationService !== null
                ? this.translationService.t(TRANSLATION_KEYS.CHART_MAX_DATASET)
                : "Max Temperature (°C)";
        const minDatasetLabel =
            this.translationService !== null
                ? this.translationService.t(TRANSLATION_KEYS.CHART_MIN_DATASET)
                : "Min Temperature (°C)";

        // If chart already exists, update data and labels in place without destroying or re allocating memory
        if (this.chartInstance !== null) {
            this.chartInstance.data.labels = labelList;
            this.chartInstance.data.datasets[0].label = maxDatasetLabel;
            this.chartInstance.data.datasets[0].data = maximumTemperatureList;
            this.chartInstance.data.datasets[1].label = minDatasetLabel;
            this.chartInstance.data.datasets[1].data = minimumTemperatureList;
            this.chartInstance.update();
            return;
        }

        const chartContext = this.canvasElement.getContext("2d");

        if (chartContext === null) {
            return;
        }

        this.chartInstance = new Chart(chartContext, {
            type: "line",
            data: {
                labels: labelList,
                datasets: [
                    {
                        label: maxDatasetLabel,
                        data: maximumTemperatureList,
                        borderColor: "#ef4444",
                        backgroundColor: "rgba(239, 68, 68, 0.12)",
                        tension: 0.35,
                        fill: true,
                        pointBackgroundColor: "#ef4444",
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        borderWidth: 2.5,
                    },
                    {
                        label: minDatasetLabel,
                        data: minimumTemperatureList,
                        borderColor: "#3b82f6",
                        backgroundColor: "rgba(59, 130, 246, 0.12)",
                        tension: 0.35,
                        fill: true,
                        pointBackgroundColor: "#3b82f6",
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        borderWidth: 2.5,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "index",
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: "top",
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            boxHeight: 8,
                            font: {
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                size: 13,
                                weight: "500",
                            },
                            color: "#475569",
                        },
                    },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.92)",
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: {
                            size: 13,
                            weight: "600",
                        },
                        bodyFont: {
                            size: 12,
                        },
                        callbacks: {
                            label: (tooltipContext) => {
                                const datasetLabel =
                                    tooltipContext.dataset.label || "";
                                const parsedValue = tooltipContext.parsed.y;
                                return ` ${datasetLabel}: ${parsedValue} °C`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: {
                            color: "rgba(226, 232, 240, 0.6)",
                        },
                        ticks: {
                            color: "#64748b",
                            font: {
                                size: 12,
                            },
                        },
                    },
                    y: {
                        grid: {
                            color: "rgba(226, 232, 240, 0.6)",
                        },
                        ticks: {
                            color: "#64748b",
                            font: {
                                size: 12,
                            },
                            callback: (tickValue) => {
                                return `${tickValue} °C`;
                            },
                        },
                    },
                },
            },
        });
    }
}
