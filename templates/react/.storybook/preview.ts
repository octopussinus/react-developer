import type { Preview } from '@storybook/react-vite';
import { setupWorker } from 'msw/browser';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { handlers } from '@/testing/mocks/handlers';
import '@/styles/index.css';

/**
 * Storybook uses the SAME handler list as dev and tests, so a story cannot show
 * data the app would never receive.
 *
 * msw-storybook-addon 3 removed the `initialize` + bare `mswLoader` pair: the
 * root entrypoint now exports only a CSF Next addon, and CSF 3 projects import
 * `mswLoader` from `/csf3`, where it is a FACTORY taking the worker setup.
 *
 * The setup is supplied rather than defaulted because the addon's own default
 * passes `onUnhandledRequest`, which msw 3 renamed to `onUnhandledFrame` -- so
 * the default silently fails to configure anything.
 */
const startWorker = async () => {
  const worker = setupWorker();
  await worker.start({ onUnhandledFrame: 'bypass' });
  return worker;
};

/**
 * Dark mode is the `.dark` class (shadcn's convention), so the toolbar toggles
 * that class rather than emulating a media query.
 */

declare const __PROJECT_ROOT__: string;

/**
 * Where is this component on disk?
 *
 * Storybook knows the STORY file as `./src/.../badge.stories.tsx` relative to
 * the project. The component sits next to it by convention, so stripping
 * `.stories` gives the file you actually want to open. The absolute prefix is
 * injected in main.ts, because a path you cannot paste into an editor does not
 * save you the hunt.
 */
function sourcePaths(fileName: unknown): { relative: string; absolute: string } | null {
  if (typeof fileName !== 'string' || fileName === '') return null;
  const relative = fileName.replace(/^\.\//, '').replace(/\.stories\.(tsx?|jsx?)$/, '.tsx');
  const root = typeof __PROJECT_ROOT__ === 'string' ? __PROJECT_ROOT__ : '';
  return { relative, absolute: root ? `${root.replace(/\/$/, '')}/${relative}` : relative };
}

function pathBar(paths: { relative: string; absolute: string }): HTMLElement {
  const bar = document.createElement('div');
  bar.setAttribute('data-sb-source', paths.absolute);
  Object.assign(bar.style, {
    position: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 9px',
    background: '#111827',
    color: '#e5e7eb',
    font: '400 11px ui-monospace, SFMono-Regular, Menlo, monospace',
    zIndex: '2147483647',
  });

  const text = document.createElement('span');
  text.textContent = paths.relative;
  text.style.flex = '1';
  text.style.overflow = 'hidden';
  text.style.textOverflow = 'ellipsis';
  text.style.whiteSpace = 'nowrap';
  text.title = paths.absolute;

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.textContent = 'Copy path';
  Object.assign(copy.style, {
    border: '0',
    borderRadius: '5px',
    padding: '3px 8px',
    background: '#2563eb',
    color: '#fff',
    font: 'inherit',
    cursor: 'pointer',
  });
  copy.addEventListener('click', () => {
    void navigator.clipboard?.writeText(paths.absolute).then(
      () => {
        copy.textContent = 'Copied ✓';
        window.setTimeout(() => (copy.textContent = 'Copy path'), 1200);
      },
      () => {
        copy.textContent = 'Press ⌘C';
      },
    );
  });

  bar.append(text, copy);
  return bar;
}

const SOURCE_BAR_ID = 'sb-source-bar';

const preview: Preview = {
  loaders: [mswLoader(startWorker)],
  parameters: {
    controls: { expanded: true },
    backgrounds: { disable: true },
    msw: { handlers },
  },
  globalTypes: {
    theme: {
      description: 'Colour scheme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      document.documentElement.classList.toggle('dark', context.globals['theme'] === 'dark');

      // Rendered outside the story's own tree so it cannot affect layout,
      // snapshots or anything a play function queries.
      document.getElementById(SOURCE_BAR_ID)?.remove();
      const paths = sourcePaths((context.parameters as Record<string, unknown>)['fileName']);
      if (paths) {
        const bar = pathBar(paths);
        bar.id = SOURCE_BAR_ID;
        document.body.appendChild(bar);
      }

      return Story();
    },
  ],
};

export default preview;
