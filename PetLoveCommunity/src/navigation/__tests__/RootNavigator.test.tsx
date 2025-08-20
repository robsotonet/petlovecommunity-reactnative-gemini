import React from 'react';
import { render } from '@testing-library/react-native';
import RootNavigator from '../RootNavigator';
import { Provider } from 'react-redux';
import { store } from '../../store';

jest.mock('../../features/counter/Counter', () => 'Counter');

describe('RootNavigator', () => {
  it('renders without crashing', () => {
    render(
      <Provider store={store}>
        <RootNavigator />
      </Provider>
    );
  });
});
