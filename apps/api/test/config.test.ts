import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('applies safe defaults when nothing is set', () => {
    const config = loadConfig({});
    expect(config.PORT).toBe(3000);
    expect(config.MAIL_TRANSPORT).toBe('console');
    expect(config.FEATURED_PRODUCT_IDS).toEqual([1, 5, 9, 13, 18]);
  });

  it('parses featured product ids from a comma-separated list', () => {
    expect(loadConfig({ FEATURED_PRODUCT_IDS: '4, 2,7' }).FEATURED_PRODUCT_IDS).toEqual([4, 2, 7]);
  });

  it('treats empty values as unset', () => {
    expect(loadConfig({ SMTP_USER: '', PORT: '' }).PORT).toBe(3000);
  });

  it('fails fast with a readable message for invalid values', () => {
    expect(() => loadConfig({ FEATURED_PRODUCT_IDS: '1,abc' })).toThrow(/FEATURED_PRODUCT_IDS/);
    expect(() => loadConfig({ SALES_INBOX: 'not-an-email' })).toThrow(/SALES_INBOX/);
  });
});
