import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/hooks/AuthProvider';
import ErrorBoundary from './src/components/ErrorBoundary';
import LoadingScreen from './src/components/LoadingScreen';

function App() {
  console.log('App: Component rendering...');
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