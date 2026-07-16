// Polyfills for jsdom (used by vitest).
// `boneyard-js` and other browser-only libs expect these globals.

// Use loose types for the polyfills — these are test-only stubs.

/* eslint-disable @typescript-eslint/no-explicit-any */

if (typeof window !== "undefined") {
  const w = window as any;
  // matchMedia — required by boneyard-js Skeleton effect.
  if (!w.matchMedia) {
    w.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
  // ResizeObserver — used by some libs in tests.
  if (!w.ResizeObserver) {
    w.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  // IntersectionObserver — used by some libs in tests.
  if (!w.IntersectionObserver) {
    w.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    };
  }
}
