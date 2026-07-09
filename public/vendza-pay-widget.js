/**
 * Vendza:Pay Autonomous Payment Widget
 * Fully self-contained JavaScript widget for client applications.
 * No external CSS or JS dependencies required.
 */
(function () {
  // 1. Inject Stylesheets
  const style = document.createElement('style');
  style.innerHTML = `
    /* Widget container styles */
    .vendza-pay-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      font-weight: 600;
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
      transition: all 0.2s ease-in-out;
      text-decoration: none;
    }
    .vendza-pay-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
      filter: brightness(1.05);
    }
    .vendza-pay-btn:active {
      transform: translateY(1px);
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
    }
    .vendza-pay-btn svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }

    /* Modal Overlay Styles */
    .vendza-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .vendza-modal-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }

    /* Modal Card */
    .vendza-modal-card {
      background: #ffffff;
      width: 100%;
      max-width: 440px;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      transform: translateY(20px);
      transition: transform 0.3s ease;
      overflow: hidden;
      display: flex;
      flex-col: column;
      flex-direction: column;
      color: #1e293b;
    }
    .vendza-modal-overlay.active .vendza-modal-card {
      transform: translateY(0);
    }

    /* Modal Header */
    .vendza-modal-header {
      padding: 18px 24px;
      border-b: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #fafbfd;
      border-bottom: 1px solid #e2e8f0;
    }
    .vendza-modal-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .vendza-modal-logo {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 800;
      font-size: 14px;
    }
    .vendza-modal-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .vendza-modal-close {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 20px;
      padding: 4px;
      line-height: 1;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      transition: background 0.2s;
    }
    .vendza-modal-close:hover {
      background: #f1f5f9;
      color: #475569;
    }

    /* Price tag section */
    .vendza-price-section {
      padding: 20px 24px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      text-align: center;
    }
    .vendza-price-desc {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .vendza-price-amount {
      font-size: 28px;
      font-weight: 800;
      color: #2563eb;
    }

    /* Tabs list */
    .vendza-tabs {
      display: flex;
      border-bottom: 1px solid #e2e8f0;
      background: #fafbfd;
    }
    .vendza-tab-btn {
      flex: 1;
      padding: 14px 10px;
      border: none;
      background: none;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      text-align: center;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .vendza-tab-btn.active {
      color: #2563eb;
      border-bottom-color: #2563eb;
      background: #ffffff;
    }
    .vendza-tab-btn img {
      height: 16px;
      object-fit: contain;
    }

    /* Forms */
    .vendza-modal-body {
      padding: 24px;
      position: relative;
    }
    .vendza-form-group {
      margin-bottom: 16px;
    }
    .vendza-form-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .vendza-input {
      width: 100%;
      padding: 10px 12px;
      font-size: 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      outline: none;
      background-color: #ffffff;
      color: #1e293b;
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .vendza-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    .vendza-input::placeholder {
      color: #94a3b8;
    }
    .vendza-input-row {
      display: flex;
      gap: 12px;
    }
    .vendza-input-row .vendza-form-group {
      flex: 1;
      margin-bottom: 0;
    }

    /* Actions button */
    .vendza-pay-submit-btn {
      width: 100%;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff;
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
      transition: all 0.2s;
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .vendza-pay-submit-btn:hover {
      box-shadow: 0 6px 14px rgba(37, 99, 235, 0.35);
      filter: brightness(1.05);
    }
    .vendza-pay-submit-btn:disabled {
      background: #cbd5e1 !important;
      color: #94a3b8 !important;
      cursor: not-allowed;
      box-shadow: none !important;
    }

    /* Screen loader */
    .vendza-loader-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      z-index: 10;
    }
    .vendza-loader-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .vendza-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top: 3px solid #2563eb;
      border-radius: 50%;
      animation: vendza-spin 0.8s linear infinite;
      margin-bottom: 12px;
    }
    @keyframes vendza-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .vendza-loader-text {
      font-size: 14px;
      font-weight: 600;
      color: #475569;
    }

    /* Success / Error Views */
    .vendza-result-view {
      text-align: center;
      padding: 16px 0;
    }
    .vendza-result-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .vendza-success-icon {
      background: #dcfce7;
      color: #16a34a;
    }
    .vendza-error-icon {
      background: #fee2e2;
      color: #dc2626;
    }
    .vendza-result-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .vendza-result-msg {
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .vendza-footer {
      text-align: center;
      padding: 12px;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
    }
    .vendza-footer a {
      color: #64748b;
      text-decoration: none;
      font-weight: 600;
    }
  `;
  document.head.appendChild(style);

  // 2. Main Module object
  const VendzaPay = {
    // Default Host URL targeting this applet
    host: window.location.origin,

    // Open Checkout Modal
    open: function (options) {
      const config = {
        apiKey: options.apiKey || '',
        siteId: options.siteId || 'site-1',
        amount: parseFloat(options.amount) || 0,
        currency: options.currency || 'EUR',
        customerName: options.customerName || '',
        customerEmail: options.customerEmail || '',
        description: options.description || 'Achat de service',
        onSuccess: options.onSuccess || function() {},
        onError: options.onError || function() {},
        onClose: options.onClose || function() {}
      };

      if (!config.apiKey) {
        alert("Vendza:Pay - Clé API manquante dans la configuration.");
        return;
      }

      // Create modal elements
      let overlay = document.getElementById('vendza-pay-overlay');
      if (overlay) {
        overlay.remove();
      }

      overlay = document.createElement('div');
      overlay.id = 'vendza-pay-overlay';
      overlay.className = 'vendza-modal-overlay';

      const currencySymbol = config.currency === 'HTG' ? 'HTG' : '€';

      overlay.innerHTML = `
        <div class="vendza-modal-card">
          <!-- Header -->
          <div class="vendza-modal-header">
            <div class="vendza-modal-brand">
              <div class="vendza-modal-logo">V</div>
              <span class="vendza-modal-title">Vendza:Pay Checkout</span>
            </div>
            <button class="vendza-modal-close" id="vendza-close-btn">&times;</button>
          </div>

          <!-- Price -->
          <div class="vendza-price-section">
            <div class="vendza-price-desc">${escapeHtml(config.description)}</div>
            <div class="vendza-price-amount">${config.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currencySymbol}</div>
          </div>

          <!-- Tabs -->
          <div class="vendza-tabs">
            <button class="vendza-tab-btn active" id="tab-stripe">
              <svg viewBox="0 0 24 24" style="width:14px;height:14px;"><path fill="currentColor" d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" /></svg>
              Carte Bancaire
            </button>
            <button class="vendza-tab-btn" id="tab-moncash">
              <span style="font-weight: 800; color: #eab308;">M</span>
              MonCash (Haïti)
            </button>
          </div>

          <!-- Body containing forms -->
          <div class="vendza-modal-body">
            <!-- Loader -->
            <div class="vendza-loader-overlay" id="vendza-loader">
              <div class="vendza-spinner"></div>
              <div class="vendza-loader-text" id="vendza-loader-text">Traitement en cours...</div>
            </div>

            <!-- Card Form -->
            <div id="form-stripe-container">
              <form id="vendza-stripe-form">
                <div class="vendza-form-group">
                  <label class="vendza-form-label">Nom sur la carte</label>
                  <input type="text" id="stripe-cardname" required class="vendza-input" placeholder="Ex. Marie Dupont" value="${escapeHtml(config.customerName)}">
                </div>
                <div class="vendza-form-group">
                  <label class="vendza-form-label">Email du client</label>
                  <input type="email" id="stripe-email" required class="vendza-input" placeholder="Ex. marie@dupont.com" value="${escapeHtml(config.customerEmail)}">
                </div>
                <div class="vendza-form-group">
                  <label class="vendza-form-label">Numéro de Carte</label>
                  <input type="text" id="stripe-cardnumber" required class="vendza-input" placeholder="4242 4242 4242 4242" maxlength="19">
                </div>
                <div class="vendza-input-row">
                  <div class="vendza-form-group">
                    <label class="vendza-form-label">Expiration</label>
                    <input type="text" id="stripe-expiry" required class="vendza-input" placeholder="MM/YY" maxlength="5">
                  </div>
                  <div class="vendza-form-group">
                    <label class="vendza-form-label">CVC</label>
                    <input type="password" id="stripe-cvc" required class="vendza-input" placeholder="123" maxlength="3">
                  </div>
                </div>
                <button type="submit" class="vendza-pay-submit-btn" style="margin-top: 20px;">
                  Payer sécurisé (${config.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currencySymbol})
                </button>
              </form>
            </div>

            <!-- MonCash Form -->
            <div id="form-moncash-container" style="display: none;">
              <form id="vendza-moncash-form">
                <div class="vendza-form-group">
                  <label class="vendza-form-label">Nom complet</label>
                  <input type="text" id="moncash-name" required class="vendza-input" placeholder="Ex. Jean Cadet" value="${escapeHtml(config.customerName)}">
                </div>
                <div class="vendza-form-group">
                  <label class="vendza-form-label">Adresse Email</label>
                  <input type="email" id="moncash-email" required class="vendza-input" placeholder="Ex. jean.cadet@gmail.com" value="${escapeHtml(config.customerEmail)}">
                </div>
                <div class="vendza-form-group">
                  <label class="vendza-form-label">Numéro de téléphone MonCash</label>
                  <input type="tel" id="moncash-phone" required class="vendza-input" placeholder="Ex. 50937123456" value="">
                  <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">Format international requis (ex: 50937123456)</p>
                </div>
                <button type="submit" class="vendza-pay-submit-btn" style="margin-top: 20px; background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%); box-shadow: 0 4px 10px rgba(234, 179, 8, 0.25);">
                  Transférer via MonCash Payout
                </button>
              </form>
            </div>

            <!-- Success Outcome View -->
            <div id="vendza-success-view" class="vendza-result-view" style="display: none;">
              <div class="vendza-result-icon vendza-success-icon">
                <svg viewBox="0 0 24 24" style="width:28px;height:28px;"><path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" /></svg>
              </div>
              <div class="vendza-result-title">Paiement Réussi !</div>
              <div class="vendza-result-msg" id="vendza-success-msg">Votre transaction a été validée avec succès. Merci pour votre règlement.</div>
              <button class="vendza-pay-submit-btn" id="vendza-success-close">Fermer</button>
            </div>

            <!-- Error Outcome View -->
            <div id="vendza-error-view" class="vendza-result-view" style="display: none;">
              <div class="vendza-result-icon vendza-error-icon">
                <svg viewBox="0 0 24 24" style="width:28px;height:28px;"><path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>
              </div>
              <div class="vendza-result-title">Échec du Règlement</div>
              <div class="vendza-result-msg" id="vendza-error-msg">Une erreur est survenue lors de l'appel aux serveurs de paiement.</div>
              <button class="vendza-pay-submit-btn" id="vendza-error-retry" style="background: #475569;">Réessayer</button>
            </div>
          </div>

          <!-- Footer -->
          <div class="vendza-footer">
            Propulsé par <a href="${this.host}" target="_blank">Vendza & Weel-Tech</a>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Trigger transition
      setTimeout(() => {
        overlay.classList.add('active');
      }, 10);

      // --- Variables & Elements ---
      let selectedMethod = 'Stripe';
      const stripeTabBtn = document.getElementById('tab-stripe');
      const moncashTabBtn = document.getElementById('tab-moncash');
      const stripeFormContainer = document.getElementById('form-stripe-container');
      const moncashFormContainer = document.getElementById('form-moncash-container');
      const loader = document.getElementById('vendza-loader');
      const loaderText = document.getElementById('vendza-loader-text');
      const stripeForm = document.getElementById('vendza-stripe-form');
      const moncashForm = document.getElementById('vendza-moncash-form');
      const successView = document.getElementById('vendza-success-view');
      const successMsg = document.getElementById('vendza-success-msg');
      const errorView = document.getElementById('vendza-error-view');
      const errorMsg = document.getElementById('vendza-error-msg');

      // --- Masking Inputs ---
      const cardNumInput = document.getElementById('stripe-cardnumber');
      const expiryInput = document.getElementById('stripe-expiry');
      const cvcInput = document.getElementById('stripe-cvc');

      cardNumInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        let formatted = '';
        for (let i = 0; i < value.length; i++) {
          if (i > 0 && i % 4 === 0) {
            formatted += ' ';
          }
          formatted += value[i];
        }
        e.target.value = formatted;
      });

      expiryInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\//g, '').replace(/[^0-9]/gi, '');
        if (value.length > 2) {
          e.target.value = value.substr(0, 2) + '/' + value.substr(2, 2);
        } else {
          e.target.value = value;
        }
      });

      cvcInput.addEventListener('input', function (e) {
        e.target.value = e.target.value.replace(/[^0-9]/gi, '');
      });

      // --- Tab Management ---
      stripeTabBtn.addEventListener('click', () => {
        selectedMethod = 'Stripe';
        stripeTabBtn.classList.add('active');
        moncashTabBtn.classList.remove('active');
        stripeFormContainer.style.display = 'block';
        moncashFormContainer.style.display = 'none';
      });

      moncashTabBtn.addEventListener('click', () => {
        selectedMethod = 'MonCash';
        moncashTabBtn.classList.add('active');
        stripeTabBtn.classList.remove('active');
        stripeFormContainer.style.display = 'none';
        moncashFormContainer.style.display = 'block';
      });

      // --- Close Buttons ---
      const closeModal = () => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
        }, 300);
        config.onClose();
      };

      document.getElementById('vendza-close-btn').addEventListener('click', closeModal);
      document.getElementById('vendza-success-close').addEventListener('click', closeModal);
      document.getElementById('vendza-error-retry').addEventListener('click', () => {
        errorView.style.display = 'none';
        if (selectedMethod === 'Stripe') {
          stripeFormContainer.style.display = 'block';
        } else {
          moncashFormContainer.style.display = 'block';
        }
      });

      // Close on clicking backdrop
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal();
        }
      });

      // --- Handle Submit Actions ---
      const handlePaymentSubmission = async (customerNameValue, customerEmailValue, phoneValue) => {
        loaderText.textContent = "Validation du règlement...";
        loader.classList.add('active');

        try {
          const body = {
            apiKey: config.apiKey,
            siteId: config.siteId,
            amount: config.amount,
            currency: config.currency,
            customerName: customerNameValue,
            customerEmail: customerEmailValue,
            description: config.description,
            method: selectedMethod,
            phone: phoneValue || undefined
          };

          const response = await fetch(`${VendzaPay.host}/api/widget/pay`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          });

          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.error || "Une erreur est survenue lors du traitement.");
          }

          const result = await response.json();

          if (result.success) {
            // Show Success screen
            loader.classList.remove('active');
            stripeFormContainer.style.display = 'none';
            moncashFormContainer.style.display = 'none';
            successView.style.display = 'block';

            if (selectedMethod === 'MonCash') {
              successMsg.textContent = `Virement MonCash effectué vers ${result.transferDetails.receiver} (${result.transferDetails.transferAmount.toFixed(2)} ${config.currency} crédités, après retenue de commission de 10%).`;
            } else {
              successMsg.textContent = `Votre règlement de ${config.amount.toFixed(2)} ${currencySymbol} par Carte Bancaire a été simulé et enregistré avec succès.`;
            }

            config.onSuccess(result.transaction);
          } else {
            throw new Error("La passerelle de paiement a refusé la transaction.");
          }

        } catch (error) {
          console.error("VendzaPay Error:", error);
          loader.classList.remove('active');
          stripeFormContainer.style.display = 'none';
          moncashFormContainer.style.display = 'none';
          errorView.style.display = 'block';
          errorMsg.textContent = error.message || "Impossible de joindre les serveurs Weel-Tech.";
          config.onError(error);
        }
      };

      stripeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cardname = document.getElementById('stripe-cardname').value.trim();
        const email = document.getElementById('stripe-email').value.trim();
        handlePaymentSubmission(cardname, email, null);
      });

      moncashForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('moncash-name').value.trim();
        const email = document.getElementById('moncash-email').value.trim();
        const phone = document.getElementById('moncash-phone').value.trim();
        handlePaymentSubmission(name, email, phone);
      });
    },

    // Auto-discover buttons marked for inclusion
    init: function () {
      const targets = document.querySelectorAll('.vendza-pay-button, #vendza-pay-button');
      targets.forEach(el => {
        if (el.getAttribute('data-rendered')) return;
        el.setAttribute('data-rendered', 'true');

        // Render button
        const btn = document.createElement('button');
        btn.className = 'vendza-pay-btn';
        btn.innerHTML = `
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>
          Payer avec Vendza:Pay
        `;

        el.appendChild(btn);

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.open({
            apiKey: el.getAttribute('data-api-key'),
            siteId: el.getAttribute('data-site-id'),
            amount: el.getAttribute('data-amount'),
            currency: el.getAttribute('data-currency') || 'EUR',
            customerName: el.getAttribute('data-customer-name') || '',
            customerEmail: el.getAttribute('data-customer-email') || '',
            description: el.getAttribute('data-description') || 'Achat de service'
          });
        });
      });
    }
  };

  // Helper to escape HTML to prevent XSS in data attributes
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Attach to global window
  window.VendzaPay = VendzaPay;

  // Auto initialize on DOM Content loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    VendzaPay.init();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      VendzaPay.init();
    });
  }
})();
