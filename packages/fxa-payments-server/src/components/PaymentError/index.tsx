import React from 'react';
import { Localized } from '@fluent/react';

import errorIcon from '../../../images/error.svg';

import './index.scss';

const retryUrl = 'http://example.com';

export const PaymentError = () => {
  return (
    <section
      className={`container card payment-error`}
      data-testid="payment-error"
    >
      <div className="wrapper">
        <img id="error-icon" src={errorIcon} alt="error icon" />
        <Localized id="payment-error-message">
          <p></p>
        </Localized>
      </div>

      <div className="footer" data-testid="footer">
        <Localized id="payment-error-retry-button">
          <a
            data-testid="retry-link"
            className="button retry-link"
            href={retryUrl}
          >
            Try Again
          </a>
        </Localized>
      </div>
    </section>
  );
};

export default PaymentError;
