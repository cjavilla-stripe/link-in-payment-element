const express = require('express');
const cookieParser = require('cookie-parser')
const app = express();
const {resolve} = require('path');
// Replace if using a different env file or config
const env = require('dotenv').config({path: './.env'});

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-08-27;link_beta=v1',
});
const LINK_PERSISTENT_TOKEN_COOKIE_NAME = 'stripe.link.persistent_token';

app.use(express.static(process.env.STATIC_DIR));
app.use(cookieParser());
app.use(
  express.json({
    // We need the raw body to verify webhook signatures.
    // Let's compute it only when hitting the Stripe webhook endpoint.
    verify: function (req, res, buf) {
      if (req.originalUrl.startsWith('/webhook')) {
        req.rawBody = buf.toString();
      }
    },
  })
);

app.get('/', (req, res) => {
  const path = resolve(process.env.STATIC_DIR + '/index.html');
  res.sendFile(path);
});

app.get('/config', (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.get('/create-payment-intent', async (req, res) => {
  // Create a PaymentIntent with the amount, currency, and a payment method type.
  //
  // See the documentation [0] for the full list of supported parameters.
  //
  // [0] https://stripe.com/docs/api/payment_intents/create
  console.log(req.cookies);
  try {
    const ephemeralKey = await stripe.ephemeralKeys.create(
      {customer: 'cus_Lexth1xyUzOfhc'},
      {apiVersion: '2020-08-27'}
    );

    const paymentIntent = await stripe.paymentIntents.create({
      currency: 'usd',
      amount: 5999,
      customer: 'cus_Lexth1xyUzOfhc',
      payment_method_types: ['card', 'us_bank_account', 'link'],
      payment_method_options: {
        link: {
          persistent_token: req.cookies[LINK_PERSISTENT_TOKEN_COOKIE_NAME],
        }
      }
      // automatic_payment_methods: { enabled: true }
    });

    // Send publishable key and PaymentIntent details to client
    res.send({
      clientSecret: paymentIntent.client_secret,
      customerOptions: {
        customer: 'cus_Lexth1xyUzOfhc',
        ephemeralKey: ephemeralKey.secret
      }
    });
  } catch (e) {
    console.error(e)
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});

app.get('/retrieve-payment-intent', async (req, res) => {
  console.log("Payment next route");
  try {
    const intent = await stripe.paymentIntents.retrieve(
      req.query.payment_intent,
      {
        expand: ["payment_method"],
      }
    );

    if(intent.status == 'succeeded' || intent.status == 'processing') {
      const token = intent.payment_method?.link?.persistent_token
      console.log({ token })
      if(!!token) {
        res.cookie(
          LINK_PERSISTENT_TOKEN_COOKIE_NAME,
          token,
          {
            sameSite: 'strict',
            secure: process.env.NODE_ENV !== "development",
            httpOnly: true,
            expires: new Date(Date.now() + 90 * 24 * 3600 * 1000),
          }
        )
      }
    }

    res.send(intent);
  } catch(e) {
    console.error(e)
    return res.render({
      error: {
        message: e.message
      }
    })
  }
})

// Expose a endpoint as a webhook handler for asynchronous events.
// Configure your webhook in the stripe developer dashboard
// https://dashboard.stripe.com/test/webhooks
app.post('/webhook', async (req, res) => {
  let data, eventType;

  // Check if webhook signing is configured.
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`??????  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    data = event.data;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // we can retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }

  if (eventType === 'payment_intent.succeeded') {
    // Funds have been captured
    // Fulfill any orders, e-mail receipts, etc
    // To cancel the payment after capture you will need to issue a Refund (https://stripe.com/docs/api/refunds)
    console.log('???? Payment captured!');
  } else if (eventType === 'payment_intent.payment_failed') {
    console.log('??? Payment failed.');
  }
  res.sendStatus(200);
});

app.listen(4242, () =>
  console.log(`Node server listening at http://localhost:4242`)
);
