import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import Card from '../Card';

describe('Card', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <Card>
        <Text>Test Child</Text>
      </Card>
    );
    expect(getByText('Test Child')).toBeTruthy();
  });
});
