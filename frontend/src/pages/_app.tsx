/*
 * Order matters:
 *   1. diagram-js.css        — core diagram canvas styles
 *   2. bpmn-js.css           — BPMN-specific overrides on top of diagram-js
 *   3. bpmn-embedded.css     — BPMN icon font with base64-embedded glyphs
 *   4. properties-panel      — side-panel layout
 *   5. globals.scss          — Tailwind + our own chrome, last so it wins
 *
 * These imports go in _app.tsx (not globals.scss) because Next.js's sass-loader
 * rewrites relative font URLs during SCSS `@import`, which breaks the bundled
 * bpmn-font assets. Plain CSS imports from _app.tsx bypass that rewrite.
 */
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';

/*
 * dmn-js stylesheets. Order matters here too — shared first, then per-view
 * stylesheets (DRD, decision table, literal expression). The DMN modeler
 * dynamically swaps active views when the user clicks into a decision; all
 * three view stylesheets need to be present from the start.
 */
import 'dmn-js/dist/assets/dmn-js-shared.css';
import 'dmn-js/dist/assets/dmn-js-drd.css';
import 'dmn-js/dist/assets/dmn-js-decision-table.css';
import 'dmn-js/dist/assets/dmn-js-decision-table-controls.css';
import 'dmn-js/dist/assets/dmn-js-literal-expression.css';
import 'dmn-js/dist/assets/dmn-font/css/dmn.css';

/*
 * IMPORTANT: import GuiProvider from `@sk-web-gui/theme`, NOT `@sk-web-gui/react`.
 *
 * The `@sk-web-gui/core` Tailwind preset (see tailwind.config.js) remaps
 * Tailwind's default spacing/color/radius scales to `var(--sk-spacing-*)` etc.
 * Those CSS custom properties are populated at runtime by <GuiProvider>, which
 * calls `updateThemeVariables(...)` on `document.documentElement.style` inside
 * a client-side effect. Without the provider mounted, every utility that
 * references those variables (h-14, px-6, bg-blue-700, border-gray-300, …)
 * compiles fine but resolves to nothing in the browser, which is why the
 * editor toolbar previously rendered as an unstyled strip.
 *
 * We cannot import GuiProvider from `@sk-web-gui/react` because that package's
 * module graph loads `@lottiefiles/react-lottie-player`, which touches
 * `document` at module-evaluation time and crashes Next.js's SSR page-data
 * collection with `ReferenceError: document is not defined`. This is a known
 * issue with `@sk-web-gui/react` < 1.3.1 — we're on 1.2.30 (copied from
 * `web-app-demo`). The working Sundsvall apps (`web-app-dispatch-portal`,
 * `web-app-starter`) are on newer versions where the lottie chain is
 * isolated.
 *
 * `@sk-web-gui/theme` is where `GuiProvider` is actually defined. Its runtime
 * deps are only `@sk-web-gui/utils`, `lodash.set`, `usehooks-ts` — no lottie,
 * no React components, nothing that touches `document` at module top-level.
 * All document access is inside `useSafeEffect` / `useMemo` callbacks guarded
 * by an `isBrowser` check.
 */
import { ColorSchemeMode, GuiProvider } from '@sk-web-gui/theme';

import type { AppProps } from 'next/app';
import '@styles/globals.scss';
import { UserProvider } from '@services/user-service';
import LoginGuard from '@components/LoginGuard/LoginGuard';

export default function MyApp({ Component, pageProps }: AppProps) {
  /*
   * Force light color scheme. Without this, GuiProvider defaults to
   * `ColorSchemeMode.System` which reads `prefers-color-scheme: dark` and
   * swaps in the sk dark-mode palette — `bg-white` resolves to a dark
   * background color, `text-dark-primary` to a light text color, and the
   * whole toolbar bleeds into the bpmn-js canvas behind it. Dark-mode
   * support is a future polish pass; V1 is light-only.
   *
   * UserProvider fetches the session from the BFF on mount. LoginGuard gates
   * everything but /login on a non-null user and redirects unauthenticated
   * traffic to /login with the original path as ?path=...
   */
  return (
    <GuiProvider colorScheme={ColorSchemeMode.Light}>
      <UserProvider>
        <LoginGuard>
          <Component {...pageProps} />
        </LoginGuard>
      </UserProvider>
    </GuiProvider>
  );
}
