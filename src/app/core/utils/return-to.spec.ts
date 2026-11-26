import { safeReturnUrl } from './return-to';

describe('safeReturnUrl', () => {
  it('accepts app-internal paths', () => {
    expect(safeReturnUrl('/shows/show_abc')).toBe('/shows/show_abc');
    expect(safeReturnUrl('/')).toBe('/');
  });

  it('rejects missing values, other sites and odd input', () => {
    expect(safeReturnUrl(undefined)).toBeNull();
    expect(safeReturnUrl('')).toBeNull();
    expect(safeReturnUrl('shows')).toBeNull();
    expect(safeReturnUrl('https://example.com')).toBeNull();
    expect(safeReturnUrl('//example.com')).toBeNull();
    expect(safeReturnUrl('/\\example.com')).toBeNull();
    expect(safeReturnUrl('/shows\nx')).toBeNull();
  });
});
