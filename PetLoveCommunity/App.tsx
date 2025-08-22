import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/hooks/AuthProvider';
import ErrorBoundary from './src/components/ErrorBoundary';
import LoadingScreen from './src/components/LoadingScreen';
import { clearAllStoredData, logStoredCredentials } from './src/utils/devUtils';

function App() {
  console.log('App: Component rendering...');
  
  useEffect(() => {
    // Development: Clear stored credentials on app start to ensure clean state
    const initializeApp = async () => {
      if (__DEV__) {
        console.log('App: Development mode - clearing stored credentials for clean test state');
        await clearAllStoredData();
        await logStoredCredentials();
      }
    };
    initializeApp();
  }, []);
  
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen message="Initializing app..." />} persistor={persistor}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;