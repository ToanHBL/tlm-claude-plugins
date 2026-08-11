import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import UserListScreen from './src/_modules/screens/User/UserListScreen';

// Thin entry — providers only; all logic lives in the Screen (ai/shared/01).
// Bare RN CLI: no app/ dir, no expo-router — render the single screen directly.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20000, retry: 2 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" />
          <UserListScreen />
        </SafeAreaView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});
