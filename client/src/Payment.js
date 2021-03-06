import {useEffect, useState} from 'react';

import {Elements} from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm'

function Payment(props) {
  const { stripePromise } = props;
  const [ clientSecret, setClientSecret ] = useState('');
  const [ customerOptions, setCustomerOptions ] = useState({});
  const [ loading, setLoading ] = useState(true);

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    fetch("/create-payment-intent")
      .then((res) => res.json())
      .then(({clientSecret, customerOptions}) => {
        setClientSecret(clientSecret)
        setCustomerOptions(customerOptions)
        setLoading(false)
      });
  }, []);

  const appearance = {
    theme: 'stripe',
    variables: {
      borderRadius: '0px',
      fontFamily: '"IBM Plex Serif"'
    }
  }
  const fonts = [{
    cssSrc: "https://fonts.googleapis.com/css2?family=IBM+Plex+Serif"
  }]

  return (
    <>
      <h1 style={{fontFamily: "Pacifico"}}>Pasha Book</h1>
      <p>Learn photography: <strong>USD 59.99</strong></p>
      {clientSecret && !loading && stripePromise && (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance, fonts, customerOptions }}>
          <CheckoutForm />
        </Elements>
      )}
    </>
  );
}

export default Payment;
