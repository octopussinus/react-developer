import type common from '@/locales/en/common.json';
import type nav from '@/locales/en/nav.json';

/**
 * Makes `t()` keys autocomplete and makes a typo a compile error. Without this,
 * a renamed key fails silently at runtime and no test catches it.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    returnNull: false;
    resources: {
      common: typeof common;
      nav: typeof nav;
    };
  }
}
