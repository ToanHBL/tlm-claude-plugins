import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { baseFetch } from '@/_modules/_api/baseFetch';
import { toast } from '@/_modules/common/components/Toast';
import { ApiUrl } from '@/_modules/config/apiUrl';
import { ModelBaseResponse, ModelUser } from '@/_modules/config/models';
import { UserFormData } from '@/_modules/common/schemas/userSchemas';

// Domain implicit from filename: call as apiClientUser.useQueryUsers(),
// apiClientUser.useMutationCreate(), etc.

// Re-export enums/types for convenience (shared/04).
export { EUserRole, EUserStatus } from '@/_modules/config/enums';
export type { ModelUser } from '@/_modules/config/models';

// ============================================================
// QUERIES
// ============================================================
export const useQueryUsers = () => {
  return useQuery({
    queryKey: [ApiUrl.USER_LIST],
    queryFn: async () => {
      const res = await baseFetch(ApiUrl.USER_LIST);
      const json: ModelBaseResponse<ModelUser[]> = await res.json();
      if (!res.ok || !json.succeeded) {
        throw new Error(json?.message || 'Failed to load users');
      }
      return json.data;
    },
  });
};

// ============================================================
// MUTATIONS — toast on error, invalidate list on success.
// ============================================================
export const useMutationCreate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: UserFormData) => {
      const res = await baseFetch(ApiUrl.USER_CREATE, {
        method: 'POST',
        body: JSON.stringify(params),
      });
      const json: ModelBaseResponse<ModelUser> = await res.json();
      if (!res.ok || !json.succeeded) {
        toast({
          title: json.errors ? Object.values(json.errors).join('. ') : json.message,
          color: 'danger',
        });
        throw new Error(json.message);
      }
      toast({ title: json.message || 'User created', color: 'success' });
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ApiUrl.USER_LIST] });
    },
  });
};

export const useMutationUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...params }: { id: string } & UserFormData) => {
      const res = await baseFetch(ApiUrl.USER_UPDATE(id), {
        method: 'PUT',
        body: JSON.stringify(params),
      });
      const json: ModelBaseResponse<ModelUser> = await res.json();
      if (!res.ok || !json.succeeded) {
        toast({
          title: json.errors ? Object.values(json.errors).join('. ') : json.message,
          color: 'danger',
        });
        throw new Error(json.message);
      }
      toast({ title: json.message || 'User updated', color: 'success' });
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ApiUrl.USER_LIST] });
    },
  });
};

export const useMutationDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await baseFetch(ApiUrl.USER_DELETE(id), { method: 'DELETE' });
      const json: ModelBaseResponse<null> = await res.json();
      if (!res.ok || !json.succeeded) {
        toast({
          title: json.errors ? Object.values(json.errors).join('. ') : json.message,
          color: 'danger',
        });
        throw new Error(json.message);
      }
      toast({ title: json.message || 'User deleted', color: 'success' });
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ApiUrl.USER_LIST] });
    },
  });
};
