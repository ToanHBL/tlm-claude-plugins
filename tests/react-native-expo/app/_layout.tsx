import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Root layout — the single place to mount providers (ai/reactnative/03 §Root layout).
// Thin: providers + the Stack navigator only; all logic lives in _modules/screens.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20000, retry: 2 } },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Users' }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
