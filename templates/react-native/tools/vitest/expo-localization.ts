/**
 * Vitest stand-in for expo-localization: a translated platform file imports it,
 * copied logic imports that file, and the copied logic's web tests run in Node,
 * where an Expo native module cannot load. The device reports one locale here:
 * the one the web tests were written for runs through their own parameters.
 */
export function getLocales() {
  return [{ languageTag: 'en-US', languageCode: 'en', regionCode: 'US', textDirection: 'ltr' }];
}

export function getCalendars() {
  return [{ calendar: 'gregory', timeZone: 'UTC', uses24hourClock: true, firstWeekday: 2 }];
}
