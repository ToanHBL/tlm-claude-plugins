import UserListScreen from '@/_modules/pages/User/UserListScreen';
import { fetchUsersAction } from '@/_modules/server/actions/user';

export default async function Page() {
  const initialUsers = await fetchUsersAction();
  return <UserListScreen initialUsers={initialUsers} />;
}
