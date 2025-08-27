// Pet Love Community - Enterprise Redux Store Configuration
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { petApi } from './services/petApi';
import counterReducer from './features/counter/counterSlice';
import petReducer from './features/pets/petSlice';

// Persist configuration - simplified to avoid createTransform issues
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['counter', 'pets'], // Persist counter and pets state
  blacklist: ['petApi'], // Don't persist API cache
};

// Root reducer combining all feature reducers
const rootReducer = combineReducers({
  counter: counterReducer,
  pets: petReducer,
  [petApi.reducerPath]: petApi.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
        ],
      },
    }).concat(petApi.middleware), // Add RTK Query middleware
  devTools: __DEV__,
});

export const persistor = persistStore(store);

// Infer types from the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Utility type for RTK Query hooks
export type AppStore = typeof store;