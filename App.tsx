import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AdminApp } from './src/features/admin';

/** Standalone host; can be embedded by mounting AdminApp without a NavigationContainer. */
export default function App() {
  return (
    <SafeAreaProvider>
      <AdminApp />
    </SafeAreaProvider>
  );
}
