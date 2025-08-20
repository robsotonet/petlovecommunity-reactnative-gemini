// Pet Love Community - Enterprise Redux Store Configuration
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, createTransform } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { petApi } from './services/petApi';
import counterReducer from './features/counter/counterSlice';

// Transform to handle API cache persistence selectively
const apiCacheTransform = createTransform(
  // Transform state on its way to being serialized and persisted
  (inboundState: any) => {
    // Only persist certain API data to avoid large cache
    const { queries, mutations, ...otherState } = inboundState;
    return {
      ...otherState,
      queries: {}, // Don't persist query cache
      mutations: {}, // Don't persist mutation cache
    };
  },
  // Transform state being rehydrated
  (outboundState: any) => {
    return {
      ...outboundState,
      queries: {},
      mutations: {},
    };
  },
  { whitelist: ['petApi'] }
);

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  transforms: [apiCacheTransform],
  whitelist: ['counter'], // Only persist specific reducers
  blacklist: ['petApi'], // Don't persist API cache
};

// Root reducer combining all feature reducers
const rootReducer = combineReducers({
  counter: counterReducer,
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
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

// Infer types from the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Utility type for RTK Query hooks
export type AppStore = typeof store;