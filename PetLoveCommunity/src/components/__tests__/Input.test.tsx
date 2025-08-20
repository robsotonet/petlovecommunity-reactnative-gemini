import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Input from '../Input';

describe('Input', () => {
  it('renders the label', () => {
    const { getByText } = render(<Input label="Test Label" onChangeText={() => {}} />);
    expect(getByText('Test Label')).toBeTruthy();
  });

  it('calls onChangeText when the text is changed', () => {
    const onChangeTextMock = jest.fn();
    const { getByLabelText } = render(
      <Input label="Test Label" onChangeText={onChangeTextMock} accessibilityLabel="Test Label" />
    );
    fireEvent.changeText(getByLabelText('Test Label'), 'test text');
    expect(onChangeTextMock).toHaveBeenCalledWith('test text');
  });
});
