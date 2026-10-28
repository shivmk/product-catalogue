/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of our API. Defaults to the same-origin "/api" proxy. */
  readonly VITE_API_BASE_URL?: string;
}
