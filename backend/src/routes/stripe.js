// Stripe payment routes
const express = require('express');
const Stripe = require('stripe');
const { verifyToken } = require('../middleware/auth');

// Use PostgreSQL for production (Railway), SQLite for local development
const databaseModule = process.env.DATABASE_URL ? '../database' : '../database-sqlite';
const {
  updateUserTier,
  upsertSubscription,
  getSubscriptionByStripeId,
  getUserByEmail
} = require(databaseModule);

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session
router.post('/create-checkout', verifyToken, async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;

    if (!priceId) {
      return res.status(400).json({
        error: 'Missing price ID',
        message: 'Stripe price ID is required'
      });
    }

    const user = req.user;

    // Create or retrieve Stripe customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id.toString()
        }
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: successUrl || `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.origin}/pricing`,
      metadata: {
        userId: user.id.toString()
      }
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message
    });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Stripe Webhook] Event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = parseInt(session.metadata.userId);
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        // Determine plan tier based on price ID
        let plan = 'pro';
        if (priceId === process.env.STRIPE_TEAM_PRICE_ID) {
          plan = 'team';
        }

        // Update user tier
        updateUserTier(userId, plan);

        // Create subscription record
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        upsertSubscription(userId, customerId, subscriptionId, 'active', plan, periodEnd);

        console.log(`[Stripe] User ${userId} subscribed to ${plan} plan`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const subscriptionRecord = getSubscriptionByStripeId(subscription.id);

        if (subscriptionRecord) {
          const status = subscription.status;
          const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

          upsertSubscription(
            subscriptionRecord.user_id,
            subscription.customer,
            subscription.id,
            status,
            subscriptionRecord.plan,
            periodEnd
          );

          console.log(`[Stripe] Subscription ${subscription.id} updated: ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subscriptionRecord = getSubscriptionByStripeId(subscription.id);

        if (subscriptionRecord) {
          // Downgrade to free tier
          updateUserTier(subscriptionRecord.user_id, 'free');

          // Update subscription status
          upsertSubscription(
            subscriptionRecord.user_id,
            subscription.customer,
            subscription.id,
            'canceled',
            subscriptionRecord.plan,
            null
          );

          console.log(`[Stripe] User ${subscriptionRecord.user_id} subscription canceled`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        const subscriptionRecord = getSubscriptionByStripeId(subscriptionId);

        if (subscriptionRecord) {
          upsertSubscription(
            subscriptionRecord.user_id,
            invoice.customer,
            subscriptionId,
            'past_due',
            subscriptionRecord.plan,
            null
          );

          console.log(`[Stripe] Payment failed for subscription ${subscriptionId}`);
        }
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get Stripe publishable key
router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

module.exports = router;
