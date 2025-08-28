// Pet Love Community - Enterprise Redux Store Configuration
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { petApi } from './services/petApi';
import { socialApi } from './services/socialApi';
import counterReducer from './features/counter/counterSlice';
import petReducer from './features/pets/petSlice';
import socialReducer from './features/social/socialSlice';

// Persist configuration - simplified to avoid createTransform issues
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['counter', 'pets', 'social'], // Persist counter, pets, and social state
  blacklist: ['petApi', 'socialApi'], // Don't persist API caches
};

// Root reducer combining all feature reducers
const rootReducer = combineReducers({
  counter: counterReducer,
  pets: petReducer,
  social: socialReducer,
  [petApi.reducerPath]: petApi.reducer,
  [socialApi.reducerPath]: socialApi.reducer,
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
    }).concat(petApi.middleware, socialApi.middleware), // Add RTK Query middleware
  devTools: __DEV__,
});

export const persistor = persistStore(store);

// Infer types from the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Utility type for RTK Query hooks
export type AppStore = typeof store;