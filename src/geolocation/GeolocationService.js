/**
 * Service responsible for accessing device geographic coordinates via the native Geolocation API.
 */
export class GeolocationService {
  /**
   * Retrieves the current geographic coordinates (latitude and longitude) of the device.
   *
   * @param {PositionOptions} [options]
   * @returns {Promise<{latitude: number, longitude: number}>}
   */
  async getCurrentCoordinates(options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }) {
    if (typeof navigator === 'undefined' || navigator.geolocation === undefined || navigator.geolocation === null) {
      throw new Error('Geolocation is not supported by your current web browser.');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (position !== null && position.coords !== null && position.coords !== undefined) {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          } else {
            reject(new Error('Invalid geolocation position data received from device.'));
          }
        },
        (geolocationError) => {
          let errorMessage = 'Failed to retrieve your current location.';

          if (geolocationError.code === geolocationError.PERMISSION_DENIED) {
            errorMessage = 'Location access was denied. Please allow location permissions in your browser.';
          } else if (geolocationError.code === geolocationError.POSITION_UNAVAILABLE) {
            errorMessage = 'Your current location is currently unavailable. Please check your connection or GPS.';
          } else if (geolocationError.code === geolocationError.TIMEOUT) {
            errorMessage = 'Location request timed out. Please try again.';
          }

          reject(new Error(errorMessage));
        },
        options
      );
    });
  }
}
