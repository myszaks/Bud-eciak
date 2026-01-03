import React, { Profiler } from "react";

export function withProfiler(Component, name) {
  const Wrapped = (props) =>
    React.createElement(
      Profiler,
      {
        id: name,
        onRender: (id, phase, actualDuration) => {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log(`[Profiler:${id}] ${phase} — ${actualDuration.toFixed(2)}ms`);
          }
        },
      },
      React.createElement(Component, props)
    );
  Wrapped.displayName = `WithProfiler(${name})`;
  return Wrapped;
}

// why-did-you-render can be enabled manually by installing it as a dev dep
// and uncommenting the code below. We avoid importing it here to prevent
// Vite from attempting to pre-resolve the optional dependency.
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log(
    "why-did-you-render not enabled. Install with `npm i -D why-did-you-render` and enable in src/lib/perf.js if desired."
  );
}
