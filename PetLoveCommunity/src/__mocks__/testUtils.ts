// Custom testing utilities to replace React Native Testing Library
// Uses react-test-renderer with a similar API surface
import React from 'react';
import renderer, { ReactTestRenderer, ReactTestInstance } from 'react-test-renderer';

interface TestQueries {
  getByTestID: (testID: string) => ReactTestInstance;
  getByText: (text: string) => ReactTestInstance;
  queryByTestID: (testID: string) => ReactTestInstance | null;
  queryByText: (text: string) => ReactTestInstance | null;
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
    getByText,
    queryByTestID,
    queryByText,
    toJSON,
    unmount,
  };
}

// Mock fireEvent utility
export const fireEvent = {
  press: (element: ReactTestInstance) => {
    // Try different possible press handlers
    if (element.props.onPress) {
      element.props.onPress();
    } else if (element.props.onPressIn) {
      element.props.onPressIn();
    } else if (element.props.onTouchEnd) {
      element.props.onTouchEnd();
    } else {
      // Some elements might not have press handlers (like Text components)
      // Don't throw error, just log warning
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
  });
  
  return result;
}