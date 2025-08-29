// Redux mocks for testing
// Import this in test files that need Redux functionality

export const mockStore = {
  getState: jest.fn(),
  dispatch: jest.fn(),
  subscribe: jest.fn(),
};

export const mockDispatch = jest.fn();
export const mockSelector = jest.fn();

// Complete Redux mock for jest.mock usage
export const reduxMock = {
  useSelector: mockSelector,
  useDispatch: () => mockDispatch,
  useStore: () => mockStore,
};

// Reset function for cleanup
export const resetReduxMocks = () => {
  mockDispatch.mockClear();
  mockSelector.mockClear();
  mockStore.getState.mockClear();
  mockStore.dispatch.mockClear();
  mockStore.subscribe.mockClear();
};