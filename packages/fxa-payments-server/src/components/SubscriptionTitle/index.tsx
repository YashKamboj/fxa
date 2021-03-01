import React from 'react';
import { Localized } from '@fluent/react';

import './index.scss';

type SubscriptionTitleProps = {
  screenType: 'create' | 'success' | 'processing';
  className?: string;
};

export const SubscriptionTitle = ({
  screenType,
  className = '',
}: SubscriptionTitleProps) => {
  const defaultHeaders: { [index: string]: string } = {
    create: 'Set up your subscription',
    success: 'Subscription confirmation',
    processing: 'Confirming subscription...',
  };
  return (
    <div
      className={`subscription-title ${className}`}
      data-testid={`subscription-${screenType}-title`}
    >
      <Localized id={`subscription-${screenType}-title`}>
        <h3 className="title">{defaultHeaders[screenType]}</h3>
      </Localized>
      <Localized id="sub-guarantee">
        <p className="subtitle">30-day money-back guarantee</p>
      </Localized>
    </div>
  );
};

export default SubscriptionTitle;
