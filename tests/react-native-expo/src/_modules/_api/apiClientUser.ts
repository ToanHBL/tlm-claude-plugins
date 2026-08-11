import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { ApiUrl, QueryKeys } from './apiUrl';
import { baseFetch } from './baseFetch';
import { EUserRole, EUserStatus } from '../values/enums';
import { ApiEnvelope, ModelUser } from '../values/interfaces';

// Re-export enums/model for convenience (ai/shared/04 §Re-export).
export { EUserRole, EUserStatus };
export type { ModelUser };

// Create/update payload — enums, not string literals.
export interface UserMutationInput {
  name: string;
  email: string;
  role: EUserRole;
  status: EUserStatus;
}

export interface UserUpdateInput extends UserMutationInput {
  id: string;
}

// Unwrap the REST envelope; Alert.alert on any failure, then throw so
// React Query records the error (ai/reactnative/04 §Error handling).
const parseEnvelope = async <T>(res: Response): Promise<T> => {
  const json: ApiEnvelope<T> = await res.json();
  if (!res.ok || !json.succeeded) {
    const message = json?.message || 'Something went wrong';
    Alert.alert('Error', message);
    throw new Error(message);
  }
  return json.data;
};

export const useQueryUsers = () =>
  useQuery({
    queryKey: [QueryKeys.USER_LIST],
    queryFn: async () => parseEnvelope<ModelUser[]>(await baseFetch(ApiUrl.USER_LIST)),
  });

export const useMutationCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UserMutationInput) =>
      parseEnvelope<ModelUser>(
        await baseFetch(ApiUrl.USER_CREATE, { method: 'POST', body: JSON.stringify(input) }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKeys.USER_LIST] }),
    onError: (error: Error) => console.warn('Create user failed:', error.message),
  });
};

export const useMutationUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UserUpdateInput) =>
      parseEnvelope<ModelUser>(
        await baseFetch(ApiUrl.USER_UPDATE(input.id), {
          method: 'PUT',
          body: JSON.stringify({
            name: input.name,
            email: input.email,
            role: input.role,
            status: input.status,
          }),
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKeys.USER_LIST] }),
    onError: (error: Error) => console.warn('Update user failed:', error.message),
  });
};

export const useMutationDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      parseEnvelope<ModelUser | null>(
        await baseFetch(ApiUrl.USER_DELETE(id), { method: 'DELETE' }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKeys.USER_LIST] }),
    onError: (error: Error) => console.warn('Delete user failed:', error.message),
  });
};
