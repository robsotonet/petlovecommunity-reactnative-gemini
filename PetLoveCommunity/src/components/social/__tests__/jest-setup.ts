// Jest setup for social components tests
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
  useSelector: jest.fn(),
  useStore: () => ({
    getState: jest.fn(),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
    replaceReducer: jest.fn(),
    [Symbol.observable]: jest.fn(),
  }),
}));

jest.mock('@reduxjs/toolkit/query/react', () => ({
  ...jest.requireActual('@reduxjs/toolkit/query/react'),
  createApi: jest.fn(() => ({
    reducerPath: 'api',
    reducer: jest.fn(),
    middleware: [],
    util: {
      updateQueryData: jest.fn(),
      invalidateTags: jest.fn(),
    },
    endpoints: {},
    useGetFeedQuery: jest.fn(),
    useCreatePostMutation: jest.fn(),
    useToggleLikeMutation: jest.fn(),
  })),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    addListener: jest.fn(),
  }),
  NavigationContainer: ({ children }: any) => children,
}));