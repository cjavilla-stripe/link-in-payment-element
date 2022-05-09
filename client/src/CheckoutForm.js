import {
  PaymentElement
} from '@stripe/react-stripe-js'
import {useState} from 'react'
import {useStripe, useElements} from '@stripe/react-stripe-js';

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        return_url: `${window.location.origin}/completion`,
      },
    });

    // This point will only be reached if there is an immediate error when
    // confirming the payment. Otherwise, your customer will be redirected to
    // your `return_url`. For some payment methods like iDEAL, your customer will
    // be redirected to an intermediate site first to authorize the payment, then
    // redirected to the `return_url`.
    if (error.type === "card_error" || error.type === "validation_error") {
      setMessage(error.message);
    } else {
      setMessage("An unexpected error occured.");
    }

    setIsLoading(false);
  }

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <div>
        <label>Email</label>
        <input type="email" />
      </div>

      <h4>Shipping details</h4>
      <div>
        <label>Address</label>
        <input type="text" autoComplete="address_line1" name="line1" />
      </div>
      <div>
        <label>City</label>
        <input type="text" autoComplete="address_level2" name="city" />
      </div>
      <div>
        <label>State</label>
        <input type="text" autoComplete="address_level1" name="state" />
      </div>
      <div>
        <label>Postal code</label>
        <input type="text" autoComplete="postal-code" name="postal_code" />
      </div>
      <div>
        <label>Country</label>
        <input type="text" autoComplete="country" name="country" />
      </div>

      <h4>Payment details</h4>
      <PaymentElement  />
      <button disabled={isLoading || !stripe || !elements} id="submit">
        <span id="button-text">
          {isLoading ? <div className="spinner" id="spinner">...</div> : "Buy today"}
        </span>
      </button>
      {/* Show any error or success messages */}
      {message && <div id="payment-message">{message}</div>}
    </form>
  )
}
