// Uniwind turns className into styles at bundle time, which Jest does not run.
// Components still render; assertions are about content and behaviour.
jest.mock('uniwind', () => ({
  Uniwind: { setTheme: jest.fn(), updateInsets: jest.fn() },
  useUniwind: () => ({ theme: 'light', hasAdaptiveThemes: true }),
  withUniwind: (component) => component,
}));
