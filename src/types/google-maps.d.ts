/* Minimal Google Maps Places type declarations for address autocomplete */
declare namespace google.maps.places {
  interface AutocompleteOptions {
    types?: string[];
    fields?: string[];
    componentRestrictions?: { country: string | string[] };
  }
  class Autocomplete {
    constructor(input: HTMLInputElement, options?: AutocompleteOptions);
    addListener(event: string, handler: () => void): void;
    getPlace(): PlaceResult;
  }
  interface PlaceResult {
    address_components?: AddressComponent[];
    formatted_address?: string;
  }
  interface AddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }
}
