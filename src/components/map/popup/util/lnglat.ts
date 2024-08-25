export class LngLat {
  lng: number;
  lat: number;

  /**
   * @param lng - Longitude, measured in degrees.
   * @param lat - Latitude, measured in degrees.
   */
  constructor(lng: number, lat: number) {
    if (isNaN(lng) || isNaN(lat)) {
      throw new Error(`Invalid LngLat object: (${lng}, ${lat})`);
    }
    this.lng = +lng;
    this.lat = +lat;
    if (this.lat > 90 || this.lat < -90) {
      throw new Error("Invalid LngLat latitude value: must be between -90 and 90");
    }
  }

  static convert(input: any): LngLat {
    if (input instanceof LngLat) {
      return input;
    }
    if (Array.isArray(input) && (input.length === 2 || input.length === 3)) {
      return new LngLat(Number(input[0]), Number(input[1]));
    }
    if (!Array.isArray(input) && typeof input === "object" && input !== null) {
      return new LngLat(
        // flow can't refine this to have one of lng or lat, so we have to cast to any
        Number("lng" in input ? (input as any).lng : (input as any).lon),
        Number(input.lat),
      );
    }
    throw new Error(
      "`LngLatLike` argument must be specified as a LngLat instance, an object {lng: <lng>, lat: <lat>}, an object {lon: <lng>, lat: <lat>}, or an array of [<lng>, <lat>]",
    );
  }
}
