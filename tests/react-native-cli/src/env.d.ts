// Minimal ambient typing for the env vars this app reads.
// Bare RN exposes process.env at build time (see PROJECT-NOTES for wiring).
declare const process: {
  env: {
    RN_API_BASE_URL?: string;
    [key: string]: string | undefined;
  };
};
