import { lookupAddress } from './maps';

it('Can find my building', async () => {
    const results = await lookupAddress('4900 Cartier St, Vancouver');
    expect(results.length).toBeGreaterThan(0);
    const result = results[0];
    expect(result.formatted_address).toContain('Vancouver');
});