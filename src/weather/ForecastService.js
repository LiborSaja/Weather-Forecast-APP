/**
 * Service responsible for transforming raw OpenWeather 5 Day / 3 Hour forecast data
 * into aggregate daily forecasts tailored for the UI.
 */
export class ForecastService {
    /**
     * Transforms raw OpenWeather forecast response into an array of up to 5 daily forecast objects.
     *
     * @param {object} rawForecastResponse Raw JSON data from OpenWeather API
     * @returns {Array<{date: Date, minimumTemperature: number, maximumTemperature: number, condition: string, weatherIcon: string}>}
     */
    transformToDailyForecast(rawForecastResponse) {
        if (
            rawForecastResponse === null ||
            typeof rawForecastResponse !== "object" ||
            !Array.isArray(rawForecastResponse.list) ||
            rawForecastResponse.list.length === 0
        ) {
            return [];
        }

        // Timezone offset in seconds from UTC provided by OpenWeather for the city
        const timezoneOffsetInSeconds =
            typeof rawForecastResponse.city?.timezone === "number"
                ? rawForecastResponse.city.timezone
                : 0;

        const groupedDaysMap = new Map();

        for (
            let index = 0;
            index < rawForecastResponse.list.length;
            index += 1
        ) {
            const forecastItem = rawForecastResponse.list[index];

            if (
                typeof forecastItem.dt !== "number" ||
                typeof forecastItem.main?.temp !== "number"
            ) {
                continue;
            }

            // Convert UTC timestamp to local timestamp using the city's timezone offset
            const localTimestampMilliseconds =
                (forecastItem.dt + timezoneOffsetInSeconds) * 1000;
            const localDateRepresentation = new Date(
                localTimestampMilliseconds,
            );

            const localYear = localDateRepresentation.getUTCFullYear();
            const localMonth = localDateRepresentation.getUTCMonth();
            const localDay = localDateRepresentation.getUTCDate();
            const localHour = localDateRepresentation.getUTCHours();

            const dayKey = `${localYear}-${String(localMonth + 1).padStart(2, "0")}-${String(localDay).padStart(2, "0")}`;

            if (!groupedDaysMap.has(dayKey)) {
                groupedDaysMap.set(dayKey, {
                    localYear: localYear,
                    localMonth: localMonth,
                    localDay: localDay,
                    items: [],
                });
            }

            groupedDaysMap.get(dayKey).items.push({
                temperature: forecastItem.main.temp,
                localHour: localHour,
                condition:
                    forecastItem.weather && forecastItem.weather.length > 0
                        ? forecastItem.weather[0].main
                        : "Unknown",
                weatherIcon:
                    forecastItem.weather && forecastItem.weather.length > 0
                        ? forecastItem.weather[0].icon
                        : "01d",
            });
        }

        const dailyForecastList = [];

        for (const [, dayGroup] of groupedDaysMap.entries()) {
            if (dayGroup.items.length === 0) {
                continue;
            }

            let minimumTemperature = Number.POSITIVE_INFINITY;
            let maximumTemperature = Number.NEGATIVE_INFINITY;
            let representativePoint = dayGroup.items[0];
            let smallestHourDifferenceFromNoon = Number.POSITIVE_INFINITY;

            for (
                let itemIndex = 0;
                itemIndex < dayGroup.items.length;
                itemIndex += 1
            ) {
                const point = dayGroup.items[itemIndex];

                if (point.temperature < minimumTemperature) {
                    minimumTemperature = point.temperature;
                }

                if (point.temperature > maximumTemperature) {
                    maximumTemperature = point.temperature;
                }

                // Distance from 12:00 (noon) in local city time
                const hourDifferenceFromNoon = Math.abs(point.localHour - 12);
                if (hourDifferenceFromNoon < smallestHourDifferenceFromNoon) {
                    smallestHourDifferenceFromNoon = hourDifferenceFromNoon;
                    representativePoint = point;
                }
            }

            // Construct a Date object representing the local calendar day
            const calendarDate = new Date(
                dayGroup.localYear,
                dayGroup.localMonth,
                dayGroup.localDay,
                12,
                0,
                0,
            );

            dailyForecastList.push({
                date: calendarDate,
                minimumTemperature: minimumTemperature,
                maximumTemperature: maximumTemperature,
                condition: representativePoint.condition,
                weatherIcon: representativePoint.weatherIcon,
            });

            // OpenWeather 5-day forecast limit
            if (dailyForecastList.length >= 5) {
                break;
            }
        }

        return dailyForecastList;
    }
}
