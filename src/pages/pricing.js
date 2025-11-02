// Pricing Page Logic
// Handles tier selection, checkout flow, and subscription management

document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentPlan();
  setupEventListeners();
});

// Load and display current plan
async function loadCurrentPlan() {
  try {
    const subscription = await window.subscriptionManager.getSubscription();
    const tier = subscription.tier || 'free';

    // Update header badge
    document.getElementById('current-tier').textContent = tier.charAt(0).toUpperCase() + tier.slice(1);

    // Update button states
    const buttons = document.querySelectorAll('.btn-plan');
    buttons.forEach(button => {
      const buttonTier = button.dataset.tier;

      if (buttonTier === tier) {
        button.textContent = 'Current Plan';
        button.classList.add('current');
        button.disabled = true;
      } else {
        button.classList.remove('current');
        button.disabled = false;

        // Update button text based on tier
        if (buttonTier === 'free') {
          button.textContent = 'Downgrade to Free';
        } else if (buttonTier === 'enterprise') {
          button.textContent = 'Contact Sales';
        } else {
          button.textContent = `Upgrade to ${buttonTier.charAt(0).toUpperCase() + buttonTier.slice(1)}`;
        }
      }
    });

    // Show usage stats if free tier
    if (tier === 'free') {
      await showUsageStats(subscription);
    }
  } catch (error) {
    console.error('Failed to load current plan:', error);
  }
}

// Show usage statistics for free tier
async function showUsageStats(subscription) {
  const usage = subscription.usage || { analysesThisWeek: 0 };
  const limit = window.subscriptionManager.TIERS.FREE.limits.analysesPerWeek;

  // Create usage banner
  const usageBanner = document.createElement('div');
  usageBanner.className = 'usage-banner';
  usageBanner.innerHTML = `
    <div class="usage-content">
      <span class="usage-icon">📊</span>
      <div class="usage-text">
        <strong>Usage this week:</strong> ${usage.analysesThisWeek} / ${limit} analyses
        <div class="usage-bar">
          <div class="usage-fill" style="width: ${(usage.analysesThisWeek / limit) * 100}%"></div>
        </div>
      </div>
    </div>
  `;

  // Add CSS for usage banner
  const style = document.createElement('style');
  style.textContent = `
    .usage-banner {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      margin: 24px auto;
      max-width: 600px;
    }
    .usage-content {
      display: flex;
      align-items: center;
      gap: 16px;
      color: white;
    }
    .usage-icon {
      font-size: 32px;
    }
    .usage-text {
      flex: 1;
    }
    .usage-text strong {
      display: block;
      margin-bottom: 8px;
      font-size: 16px;
    }
    .usage-bar {
      height: 8px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }
    .usage-fill {
      height: 100%;
      background: linear-gradient(90deg, #4ade80 0%, #22c55e 100%);
      border-radius: 4px;
      transition: width 0.3s;
    }
  `;
  document.head.appendChild(style);

  // Insert after current plan badge
  const currentPlan = document.getElementById('current-plan');
  currentPlan.parentNode.insertBefore(usageBanner, currentPlan.nextSibling);
}

// Setup event listeners
function setupEventListeners() {
  // Plan selection buttons
  const planButtons = document.querySelectorAll('.btn-plan:not(.current)');
  planButtons.forEach(button => {
    button.addEventListener('click', handlePlanSelection);
  });

  // Manage subscription link
  document.getElementById('manage-subscription')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await handleManageSubscription();
  });

  // Back to extension
  document.getElementById('back-to-extension')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.close();
  });
}

// Handle plan selection
async function handlePlanSelection(e) {
  const tier = e.target.dataset.tier;

  try {
    if (tier === 'free') {
      await handleDowngrade();
    } else if (tier === 'enterprise') {
      await handleEnterpriseContact();
    } else {
      await handleUpgrade(tier);
    }
  } catch (error) {
    console.error('Plan selection error:', error);
    showError('Failed to process plan change. Please try again.');
  }
}

// Handle upgrade to Pro/Team
async function handleUpgrade(tier) {
  const confirmed = confirm(
    `Upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)}?\n\n` +
    `You'll be redirected to secure checkout powered by Stripe.`
  );

  if (!confirmed) return;

  try {
    // Show loading state
    const button = document.querySelector(`[data-tier="${tier}"]`);
    const originalText = button.textContent;
    button.textContent = 'Opening checkout...';
    button.disabled = true;

    // Open Stripe Checkout
    await window.subscriptionManager.openCheckout(tier);

    console.log(`💳 Opened checkout for ${tier} tier`);
  } catch (error) {
    console.error('Checkout error:', error);
    showError('Failed to open checkout. Please contact support.');

    // Reset button
    const button = document.querySelector(`[data-tier="${tier}"]`);
    button.textContent = `Upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)}`;
    button.disabled = false;
  }
}

// Handle downgrade to Free
async function handleDowngrade() {
  const confirmed = confirm(
    'Downgrade to Free tier?\n\n' +
    'Your subscription will be cancelled at the end of the current billing period.\n' +
    'You\'ll lose access to premium features but keep your data.'
  );

  if (!confirmed) return;

  try {
    // In production, this would call backend to cancel subscription
    console.log('⬇️ Initiating downgrade to free tier');
    alert('Please use the "Manage Subscription" link to cancel your subscription in the Stripe Customer Portal.');

    await window.subscriptionManager.openCustomerPortal();
  } catch (error) {
    console.error('Downgrade error:', error);
    showError('Failed to process downgrade. Please contact support.');
  }
}

// Handle enterprise contact
async function handleEnterpriseContact() {
  const subscription = await window.subscriptionManager.getSubscription();

  // Compose email
  const subject = encodeURIComponent('GitHub PR Assistant - Enterprise Inquiry');
  const body = encodeURIComponent(
    `Hi there,\n\n` +
    `I'm interested in the Enterprise plan for GitHub PR Review Assistant.\n\n` +
    `Current Plan: ${subscription.tier}\n` +
    `GitHub User: ${subscription.githubUser || 'N/A'}\n\n` +
    `Please contact me with more information.\n\n` +
    `Thanks!`
  );

  // Open email client
  window.location.href = `mailto:sales@pr-assistant.com?subject=${subject}&body=${body}`;

  console.log('📧 Opening enterprise contact email');
}

// Handle manage subscription
async function handleManageSubscription() {
  try {
    const subscription = await window.subscriptionManager.getSubscription();

    if (subscription.tier === 'free') {
      alert('You are currently on the Free plan. Upgrade to Pro or Team to manage your subscription.');
      return;
    }

    // Open Stripe Customer Portal
    await window.subscriptionManager.openCustomerPortal();

    console.log('🔧 Opening customer portal');
  } catch (error) {
    console.error('Portal error:', error);
    showError('Failed to open customer portal. Please contact support.');
  }
}

// Show error message
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;

  // Add CSS for error message
  const style = document.createElement('style');
  style.textContent = `
    .error-message {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #dc2626;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      animation: slideDown 0.3s ease-out;
    }
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(errorDiv);

  // Remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// Listen for subscription updates from background script
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.subscription) {
    console.log('💳 Subscription updated, refreshing page');
    loadCurrentPlan();
  }
});
