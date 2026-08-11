'use server';

import { revalidatePath } from 'next/cache';
import { API_CONFIG, ApiUrl } from '@/_modules/config/apiUrl';
import { userFormSchema, type UserFormData } from '@/_modules/common/schemas/userSchemas';
import type { ModelUser } from '@/_modules/common/interfaces/ModelUser';
import type { ModelBaseResponse } from '@/_modules/common/interfaces/ModelBaseResponse';

const USERS_PATH = '/users';

// Small server-only fetch helper that unwraps the standard REST envelope.
async function requestApi<T>(endpoint: string, init?: RequestInit): Promise<ModelBaseResponse<T>> {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'api-version': API_CONFIG.VERSION,
      ...init?.headers,
    },
  });

  const json: ModelBaseResponse<T> = await res.json();

  if (!res.ok || !json.succeeded) {
    const fieldErrors = json.errors ? Object.values(json.errors).flat().join('. ') : '';
    throw new Error(fieldErrors || json.message || 'Request failed');
  }

  return json;
}

// READ — called from the Server Component (list page) and the React Query hook.
export async function fetchUsersAction(): Promise<ModelUser[]> {
  const json = await requestApi<ModelUser[]>(ApiUrl.USER_LIST);
  return json.data;
}

// CREATE — Zod-validated on the server before hitting the REST API.
export async function createUserAction(input: UserFormData): Promise<ModelUser> {
  const parsed = userFormSchema.parse(input);

  const json = await requestApi<ModelUser>(ApiUrl.USER_CREATE, {
    method: 'POST',
    body: JSON.stringify(parsed),
  });

  revalidatePath(USERS_PATH);
  return json.data;
}

// UPDATE
export async function updateUserAction(id: string, input: UserFormData): Promise<ModelUser> {
  const parsed = userFormSchema.parse(input);

  const json = await requestApi<ModelUser>(ApiUrl.USER_UPDATE(id), {
    method: 'PUT',
    body: JSON.stringify(parsed),
  });

  revalidatePath(USERS_PATH);
  return json.data;
}

// DELETE
export async function deleteUserAction(id: string): Promise<void> {
  await requestApi<null>(ApiUrl.USER_DELETE(id), {
    method: 'DELETE',
  });

  revalidatePath(USERS_PATH);
}
