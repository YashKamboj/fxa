import React from 'react';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import {
  setupFluentLocalizationTest,
  getLocalizedMessage,
} from '../../lib/test-utils';

import { PaymentError } from './index';

afterEach(cleanup);
describe('Fluent Localized Text', () => {
  const bundle = setupFluentLocalizationTest('en-US');

  it('renders as expected', () => {
    const { queryByTestId } = render(<PaymentError />);
    const spinner = queryByTestId('error-icon');
    expect(spinner).toBeInTheDocument();

    const mainBlock = queryByTestId('payment-error');
    expect(mainBlock).toBeInTheDocument();

    const expected =
      'An unexpected error has occured while processing your payment, please try again.';
    const actual = getLocalizedMessage(bundle, 'payment-error-message', {});
    expect(actual).toEqual(expected);
  });
});
