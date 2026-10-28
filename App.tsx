import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AdminApp } from './src/features/admin';

/** Standalone host; AdminApp owns its state and does not create a NavigationContainer. */
export default function App() {
  return (
    <SafeAreaProvider>
      <AdminApp />
    </SafeAreaProvider>
  );
}
