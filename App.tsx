import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AdminApp } from './src/features/admin';

/**
 * Standalone host. To embed the admin in the Wantiss app, mount <AdminApp /> from a screen
 * (as goodiesHomeScreen.tsx mounts GoodiesApp). It brings its own state and does not create
 * a NavigationContainer.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AdminApp />
    </SafeAreaProvider>
  );
}
