// Custom testing utilities to replace React Native Testing Library
// Uses react-test-renderer with a similar API surface
import React from 'react';
import renderer, { ReactTestRenderer, ReactTestInstance } from 'react-test-renderer';

interface TestQueries {
  getByTestID: (testID: string) => ReactTestInstance;
  getByTestId: (testID: string) => ReactTestInstance; // Alias for React Native Testing Library compatibility
  getByText: (text: string) => ReactTestInstance;
  queryByTestID: (testID: string) => ReactTestInstance | null;
  queryByTestId: (testID: string) => ReactTestInstance | null; // Alias for React Native Testing Library compatibility
  queryByText: (text: string) => ReactTestInstance | null;
  getAllByTestID: (testID: string) => ReactTestInstance[];
  getAllByTestId: (testID: string) => ReactTestInstance[]; // Alias for React Native Testing Library compatibility
  getAllByText: (text: string) => ReactTestInstance[];
  queryAllByTestID: (testID: string) => ReactTestInstance[];
  queryAllByTestId: (testID: string) => ReactTestInstance[]; // Alias for React Native Testing Library compatibility
  queryAllByText: (text: string) => ReactTestInstance[];
  getByDisplayValue: (value: string) => ReactTestInstance;
  getByRole: (role: string) => ReactTestInstance;
}

interface CustomRenderResult extends TestQueries {
  component: ReactTestRenderer;
  root: ReactTestInstance;
  toJSON: () => any;
  unmount: () => void;
}

export function render(element: React.ReactElement): CustomRenderResult {
  const component = renderer.create(element);
  const root = component.root;

  const getByTestID = (testID: string): ReactTestInstance => {
    try {
      return root.findByProps({ testID });
    } catch (error) {
      throw new Error(`Unable to find element with testID: ${testID}`);
    }
  };

  const getByText = (text: string): ReactTestInstance => {
    try {
      return root.find(node => {
        if (typeof node.props?.children === 'string') {
          return node.props.children === text;
        }
        if (Array.isArray(node.props?.children)) {
          return node.props.children.some((child: any) => 
            typeof child === 'string' && child === text
          );
        }
        return false;
      });
    } catch (error) {
      throw new Error(`Unable to find element with text: ${text}`);
    }
  };

  const queryByTestID = (testID: string): ReactTestInstance | null => {
    try {
      return getByTestID(testID);
    } catch {
      return null;
    }
  };

  const queryByText = (text: string): ReactTestInstance | null => {
    try {
      return getByText(text);
    } catch {
      return null;
    }
  };

  const getAllByTestID = (testID: string): ReactTestInstance[] => {
    try {
      return root.findAllByProps({ testID });
    } catch (error) {
      return [];
    }
  };

  const getAllByText = (text: string): ReactTestInstance[] => {
    try {
      return root.findAll(node => {
        if (typeof node.props?.children === 'string') {
          return node.props.children === text;
        }
        if (Array.isArray(node.props?.children)) {
          return node.props.children.some((child: any) => 
            typeof child === 'string' && child === text
          );
        }
        return false;
      });
    } catch (error) {
      return [];
    }
  };

  const queryAllByTestID = (testID: string): ReactTestInstance[] => {
    return getAllByTestID(testID);
  };

  const queryAllByText = (text: string): ReactTestInstance[] => {
    return getAllByText(text);
  };

  const getByDisplayValue = (value: string): ReactTestInstance => {
    try {
      return root.find(node => 
        node.props?.value === value || node.props?.defaultValue === value
      );
    } catch (error) {
      throw new Error(`Unable to find element with display value: ${value}`);
    }
  };

  const getByRole = (role: string): ReactTestInstance => {
    try {
      return root.find(node => 
        node.props?.accessibilityRole === role || node.props?.role === role
      );
    } catch (error) {
      throw new Error(`Unable to find element with role: ${role}`);
    }
  };

  const unmount = () => {
    component.unmount();
  };

  const toJSON = () => {
    return component.toJSON();
  };

  return {
    component,
    root,
    getByTestID,
    getByTestId: getByTestID, // Alias for React Native Testing Library compatibility
    getByText,
    queryByTestID,
    queryByTestId: queryByTestID, // Alias for React Native Testing Library compatibility
    queryByText,
    getAllByTestID,
    getAllByTestId: getAllByTestID, // Alias for React Native Testing Library compatibility
    getAllByText,
    queryAllByTestID,
    queryAllByTestId: queryAllByTestID, // Alias for React Native Testing Library compatibility
    queryAllByText,
    getByDisplayValue,
    getByRole,
    toJSON,
    unmount,
  };
}

// Mock fireEvent utility with comprehensive React Native events
export const fireEvent = {
  press: (element: ReactTestInstance) => {
    if (element.props.onPress) {
      element.props.onPress();
    } else if (element.props.onPressIn) {
      element.props.onPressIn();
    } else if (element.props.onTouchEnd) {
      element.props.onTouchEnd();
    } else {
      console.warn(`Element with testID "${element.props.testID || 'unknown'}" does not have a press handler`);
    }
  },
  
  changeText: (element: ReactTestInstance, text: string) => {
    if (element.props.onChangeText) {
      element.props.onChangeText(text);
    } else {
      console.warn(`Element with testID "${element.props.testID || 'unknown'}" does not have an onChangeText handler`);
    }
  },

  focus: (element: ReactTestInstance) => {
    if (element.props.onFocus) {
      element.props.onFocus();
    }
  },

  blur: (element: ReactTestInstance) => {
    if (element.props.onBlur) {
      element.props.onBlur();
    }
  },

  scroll: (element: ReactTestInstance, eventData = {}) => {
    if (element.props.onScroll) {
      element.props.onScroll({ nativeEvent: eventData });
    }
  },

  swipeLeft: (element: ReactTestInstance) => {
    if (element.props.onSwipeLeft) {
      element.props.onSwipeLeft();
    }
  },

  swipeRight: (element: ReactTestInstance) => {
    if (element.props.onSwipeRight) {
      element.props.onSwipeRight();
    }
  },

  longPress: (element: ReactTestInstance) => {
    if (element.props.onLongPress) {
      element.props.onLongPress();
    }
  },

  pressIn: (element: ReactTestInstance) => {
    if (element.props.onPressIn) {
      element.props.onPressIn();
    }
  },

  pressOut: (element: ReactTestInstance) => {
    if (element.props.onPressOut) {
      element.props.onPressOut();
    }
  },

  endEditing: (element: ReactTestInstance) => {
    if (element.props.onEndEditing) {
      element.props.onEndEditing();
    }
  },

  submitEditing: (element: ReactTestInstance) => {
    if (element.props.onSubmitEditing) {
      element.props.onSubmitEditing();
    }
  },
};

// Mock waitFor utility
export const waitFor = async (callback: () => void, options: { timeout?: number } = {}) => {
  const timeout = options.timeout || 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      await callback();
      return;
    } catch (error) {
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  // Final attempt
  await callback();
};

// Global screen object similar to React Native Testing Library
export const screen: TestQueries = {
  getByTestID: () => { throw new Error('screen object requires a rendered component. Use render() first.'); },
  getByText: () => { throw new Error('screen object requires a rendered component. Use render() first.'); },
  queryByTestID: () => { throw new Error('screen object requires a rendered component. Use render() first.'); },
  queryByText: () => { throw new Error('screen object requires a rendered component. Use render() first.'); },
  getAllByTestID: () => { throw new Error('screen object requires a rendered component. Use render() first.'); },
  getAllByText: () => { throw new Error('screen object requires a rendered component. Use render() first.'); },
  queryAllByTestID: () => { throw new Error('screen object requires a rendered component. Use render() first.'); },
  queryAllByText: () => { throw new Error('screen object requires a rendered component. Use render() first.'); },
  getByDisplayValue: () => { throw new Error('screen object requires a rendered component. Use render() first.'); },
  getByRole: () => { throw new Error('screen object requires a rendered component. Use render() first.'); },
};

// Update screen object after render (this is a simplified version)
let currentRenderResult: CustomRenderResult | null = null;

const originalRender = render;
export { originalRender };

// Override render to update global screen
export function renderWithScreen(element: React.ReactElement): CustomRenderResult {
  const result = originalRender(element);
  currentRenderResult = result;
  
  // Update screen object
  Object.assign(screen, {
    getByTestID: result.getByTestID,
    getByText: result.getByText,
    queryByTestID: result.queryByTestID,
    queryByText: result.queryByText,
    getAllByTestID: result.getAllByTestID,
    getAllByText: result.getAllByText,
    queryAllByTestID: result.queryAllByTestID,
    queryAllByText: result.queryAllByText,
    getByDisplayValue: result.getByDisplayValue,
    getByRole: result.getByRole,
  });
  
  return result;
}