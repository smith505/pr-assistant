// Subscription & Tier Management System
// Manages user subscription status, tier checking, and feature gating

// Tier Configuration
const TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    limits: {
      analysesPerWeek: 5,
      customKeywords: false,
      advancedMetrics: false,
      exportData: false,
      prioritySupport: false
    }
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 9,
    priceId: 'price_1SPA3A2MNNechcXydfRwQkcG',
    limits: {
      analysesPerWeek: Infinity,
      customKeywords: true,
      advancedMetrics: true,
      exportData: true,
      prioritySupport: false
    }
  },
  TEAM: {
    id: 'team',
    name: 'Team',
    price: 29,
    priceId: 'price_team_monthly', // Replace with actual Stripe Price ID
    limits: {
      analysesPerWeek: Infinity,
      customKeywords: true,
      advancedMetrics: true,
      exportData: true,
      prioritySupport: true,
      teamFeatures: true
    }
  }
};

// Stripe Configuration
const STRIPE_CONFIG = {
  publishableKey: 'pk_test_51SLZ7C2MNNechcXybk5GE03plcAkOFck6njYBZ9jBApNio0bcSdbMdCiTHqGWoKpZIqLhHR1HsSYeZWi6XA7pVN70029rcJE3Z',
  checkoutSuccessUrl: chrome.runtime.getURL('src/pages/checkout-success.html'),
  checkoutCancelUrl: chrome.runtime.getURL('src/pages/checkout-cancel.html'),
  customerPortalUrl: 'https://billing.stripe.com/p/login/test_placeholder', // Will update after first customer
  backendUrl: 'https://pr-assistant-production.up.railway.app' // Will update to production URL after deployment
};

// Initialize subscription system
async function initializeSubscription() {
  const result = await chrome.storage.local.get(['subscription']);

  if (!result.subscription) {
    // First time user - initialize with free tier
    const subscription = {
      tier: 'free',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usage: {
        analysesThisWeek: 0,
        weekStart: getWeekStart(new Date()).toISOString()
      }
    };

    await chrome.storage.local.set({ subscription });
    console.log('🎁 Initialized free tier subscription');
    return subscription;
  }

  return result.subscription;
}

// Get current subscription
async function getSubscription() {
  const result = await chrome.storage.local.get(['subscription']);
  return result.subscription || await initializeSubscription();
}

// Get current tier
async function getCurrentTier() {
  const subscription = await getSubscription();
  return TIERS[subscription.tier.toUpperCase()] || TIERS.FREE;
}

// Check if feature is available
async function canUseFeature(featureName) {
  const tier = await getCurrentTier();

  // Check usage limits
  if (featureName === 'analyze') {
    const subscription = await getSubscription();
    const usage = subscription.usage || { analysesThisWeek: 0 };

    // Reset weekly counter if new week
    const weekStart = getWeekStart(new Date()).toISOString();
    if (usage.weekStart !== weekStart) {
      usage.analysesThisWeek = 0;
      usage.weekStart = weekStart;
      await updateSubscription({ usage });
    }

    // Check if under limit
    if (usage.analysesThisWeek >= tier.limits.analysesPerWeek) {
      return {
        allowed: false,
        reason: 'weekly_limit',
        limit: tier.limits.analysesPerWeek,
        used: usage.analysesThisWeek
      };
    }

    return { allowed: true };
  }

  // Check feature flags
  const featureMap = {
    'customKeywords': 'customKeywords',
    'advancedMetrics': 'advancedMetrics',
    'exportData': 'exportData',
    'prioritySupport': 'prioritySupport',
    'teamFeatures': 'teamFeatures'
  };

  const limitKey = featureMap[featureName];
  if (limitKey && tier.limits[limitKey]) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'tier_limit',
    requiredTier: featureName === 'teamFeatures' ? 'team' : 'pro'
  };
}

// Increment usage counter
async function incrementUsage(usageType = 'analyze') {
  const subscription = await getSubscription();
  const usage = subscription.usage || { analysesThisWeek: 0 };

  // Reset weekly counter if new week
  const weekStart = getWeekStart(new Date()).toISOString();
  if (usage.weekStart !== weekStart) {
    usage.analysesThisWeek = 0;
    usage.weekStart = weekStart;
  }

  if (usageType === 'analyze') {
    usage.analysesThisWeek += 1;
  }

  await updateSubscription({ usage });

  console.log(`📊 Usage updated: ${usage.analysesThisWeek} analyses this week`);

  return usage;
}

// Update subscription
async function updateSubscription(updates) {
  const subscription = await getSubscription();
  const updated = {
    ...subscription,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await chrome.storage.local.set({ subscription: updated });
  return updated;
}

// Open Stripe Checkout
async function openCheckout(tierId) {
  try {
    const tier = TIERS[tierId.toUpperCase()];
    if (!tier || !tier.priceId) {
      throw new Error('Invalid tier or missing price ID');
    }

    const subscription = await getSubscription();

    // In production, this would call your backend to create a checkout session
    // For now, we'll use a direct Stripe Checkout link approach
    const checkoutUrl = await createCheckoutSession(tier.priceId, subscription);

    // Open checkout in new tab
    chrome.tabs.create({ url: checkoutUrl });

    console.log(`💳 Opening checkout for ${tier.name} tier`);
  } catch (error) {
    console.error('Failed to open checkout:', error);
    throw error;
  }
}

// Create checkout session (backend call)
async function createCheckoutSession(priceId, subscription) {
  try {
    // Get API token from storage
    const result = await chrome.storage.local.get(['apiToken']);
    if (!result.apiToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    const response = await fetch(`${STRIPE_CONFIG.backendUrl}/api/stripe/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${result.apiToken}`
      },
      body: JSON.stringify({
        priceId,
        successUrl: STRIPE_CONFIG.checkoutSuccessUrl,
        cancelUrl: STRIPE_CONFIG.checkoutCancelUrl
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Checkout session creation failed:', error);
    throw error;
  }
}

// Open customer portal
async function openCustomerPortal() {
  try {
    const subscription = await getSubscription();

    if (subscription.tier === 'free') {
      console.log('Free tier user - no portal access');
      return;
    }

    // In production, call backend to create portal session
    // const portalUrl = await createPortalSession(subscription.customerId);

    // For now, open placeholder
    chrome.tabs.create({ url: STRIPE_CONFIG.customerPortalUrl });

    console.log('🔧 Opening customer portal');
  } catch (error) {
    console.error('Failed to open customer portal:', error);
    throw error;
  }
}

// Handle webhook update (called by background script)
async function handleWebhookUpdate(event) {
  try {
    console.log('📬 Processing webhook event:', event.type);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await updateSubscription({
          tier: event.data.tier,
          status: event.data.status,
          customerId: event.data.customerId,
          subscriptionId: event.data.subscriptionId,
          currentPeriodEnd: event.data.currentPeriodEnd
        });
        console.log(`✅ Subscription updated to ${event.data.tier}`);
        break;

      case 'customer.subscription.deleted':
        await updateSubscription({
          tier: 'free',
          status: 'active',
          customerId: event.data.customerId
        });
        console.log('⬇️ Subscription downgraded to free');
        break;

      case 'invoice.payment_succeeded':
        console.log('💰 Payment succeeded');
        break;

      case 'invoice.payment_failed':
        console.log('❌ Payment failed');
        await updateSubscription({ status: 'past_due' });
        break;

      default:
        console.log('ℹ️ Unhandled webhook event:', event.type);
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
  }
}

// Get week start date (Monday)
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Export functions (use globalThis for both service worker and window contexts)
globalThis.subscriptionManager = {
  initializeSubscription,
  getSubscription,
  getCurrentTier,
  canUseFeature,
  incrementUsage,
  updateSubscription,
  openCheckout,
  openCustomerPortal,
  handleWebhookUpdate,
  TIERS,
  STRIPE_CONFIG
};

// Initialize on load
initializeSubscription();
