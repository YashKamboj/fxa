import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';

import * as apiClient from '../../../lib/apiClient';
import { Customer } from '../../../store/types';
import { SubscriptionCreateAuthServerAPIs } from '../SubscriptionCreate';

declare var paypal: {
  Buttons: {
    driver: Function;
  };
};

export type PaypalButtonProps = {
  apiClientOverrides?: Partial<SubscriptionCreateAuthServerAPIs>;
  currencyCode: string;
  customer: Customer | null;
  idempotencyKey: string;
  priceId: string;
  refreshSubscriptions: () => void;
  setPaymentError: Function;
  setOnClick: Function;
  ButtonBase?: React.ElementType;
};

export type ButtonBaseProps = {
  createOrder?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onApprove?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onError?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export const PaypalButtonBase =
  typeof paypal !== 'undefined'
    ? paypal.Buttons.driver('react', {
        React,
        ReactDOM,
      })
    : null;

export const PaypalButton = ({
  apiClientOverrides,
  currencyCode,
  customer,
  idempotencyKey,
  priceId,
  refreshSubscriptions,
  setPaymentError,
  setOnClick,
  ButtonBase = PaypalButtonBase,
}: PaypalButtonProps) => {
  const createOrder = useCallback(async () => {
    try {
      const { apiCreateCustomer, apiGetPaypalCheckoutToken } = {
        ...apiClient,
        ...apiClientOverrides,
      };
      if (!customer) {
        await apiCreateCustomer({
          idempotencyKey,
        });
      }
      const { token } = await apiGetPaypalCheckoutToken({ currencyCode });
      return token;
    } catch (error) {
      setPaymentError(error);
    }
    return null;
  }, [
    apiClient.apiCreateCustomer,
    apiClient.apiGetPaypalCheckoutToken,
    customer,
    idempotencyKey,
    setPaymentError,
  ]);

  const onApprove = useCallback(
    async (data: { orderID: string }) => {
      try {
        const { apiCapturePaypalPayment } = {
          ...apiClient,
          ...apiClientOverrides,
        };
        // This is the same token as obtained in createOrder
        const token = data.orderID;
        await apiCapturePaypalPayment({
          idempotencyKey,
          priceId,
          token,
        });
        refreshSubscriptions();
      } catch (error) {
        setPaymentError(error);
      }
      return null;
    },
    [
      apiClient.apiCreateCustomer,
      apiClient.apiGetPaypalCheckoutToken,
      customer,
      idempotencyKey,
      setPaymentError,
    ]
  );

  const onError = useCallback(
    (error) => {
      setPaymentError(error);
    },
    [setPaymentError]
  );

  const onClick = useCallback(
    (event) => {
      setOnClick(event);
    },
    [setOnClick]
  );

  // Style docs: https://developer.paypal.com/docs/business/checkout/reference/style-guide/
  const styleOptions = {
    layout: 'horizontal',
    color: 'gold',
    shape: 'pill',
    label: 'paypal',
    height: 48,
    tagline: 'false',
  };

  return (
    <>
      {ButtonBase && (
        <ButtonBase
          style={styleOptions}
          data-testid="paypal-button"
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onError}
          onClick={onClick}
        />
      )}
    </>
  );
};

export default PaypalButton;
