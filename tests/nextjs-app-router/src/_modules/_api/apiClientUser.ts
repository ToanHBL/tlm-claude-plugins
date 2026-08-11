'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchUsersAction,
  createUserAction,
  updateUserAction,
  deleteUserAction,
} from '@/_modules/server/actions/user';
import { toast } from '@/_modules/common/components/Toast';
import { QueryKeys } from '@/_modules/config/queryKeys';
import type { ModelUser } from '@/_modules/common/interfaces/ModelUser';
import type { UserFormData } from '@/_modules/common/schemas/userSchemas';

// Domain is implicit from the filename — hooks do not repeat "User" (see shared/07).

// LIST — accepts server-fetched initialData for the hybrid Server/Client pattern.
export const useQueryList = (initialData?: ModelUser[]) => {
  return useQuery({
    queryKey: [QueryKeys.USER_LIST],
    queryFn: () => fetchUsersAction(),
    initialData,
  });
};

// CREATE
export const useMutationCreate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserFormData) => createUserAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.USER_LIST] });
      toast({ title: 'User created', color: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create user', description: error.message, color: 'danger' });
    },
  });
};

// UPDATE
export const useMutationUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UserFormData) => updateUserAction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.USER_LIST] });
      toast({ title: 'User updated', color: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update user', description: error.message, color: 'danger' });
    },
  });
};

// DELETE
export const useMutationDelete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUserAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.USER_LIST] });
      toast({ title: 'User deleted', color: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete user', description: error.message, color: 'danger' });
    },
  });
};
