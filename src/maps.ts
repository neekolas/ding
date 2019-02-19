const { MAPS_API_KEY } = process.env;
if (!MAPS_API_KEY) {
    console.error('Maps API Key Missing');
    process.exit(1);
}
import {
    createClient,
    PlaceDetailsResult,
    PlaceSearchResult,
    AddressComponent
} from '@google/maps';
const client = createClient({
    key: MAPS_API_KEY || '',
    Promise: Promise,
    timeout: 10000,
    retryOptions: {
        interval: 100
    }
});

export async function lookupPlace(
    placeID: string
): Promise<PlaceDetailsResult> {
    const response = await client.place({ placeid: placeID }).asPromise();
    const { result } = response.json;
    return result;
}

export function findCountry(addressComponents: AddressComponent[]): string {
    const countryComponent = addressComponents.find(
        comp => comp.types.indexOf('country') > -1
    );
    if (!countryComponent) {
        console.log('Could not find country');
        return 'US';
    }
    return countryComponent.short_name;
}

export async function lookupAddress(
    address: string
): Promise<PlaceSearchResult[]> {
    const response = await client.places({ query: address }).asPromise();

    const { results } = response.json;

    return results;
}

export async function lookupPhoto(
    obj: PlaceSearchResult
): Promise<string | null> {
    if (obj.photos && obj.photos.length) {
        let photoref = obj.photos[0].photo_reference;

        const result = await client
            .placesPhoto({ photoreference: photoref, maxheight: 250 })
            .asPromise();
        return result.json;
    }
    return null;
}
