// Thin fetch wrapper — prefixes the env base URL and sets JSON headers.
// Static-export SPA: all data flows through client fetch (no getServerSideProps).
export async function baseFetch(path: string, init?: RequestInit): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}
