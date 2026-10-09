/* ========================================================
   TITAN WATCH STORE - AI ASSISTANT CHATBOT SCRIPT
   Provides floating assistant, chat panel, Groq API backend
   integration, and interactive watch recommendations.
   ======================================================== */

(function () {
  'use strict';

  // =====================================================
  // TITAN WATCH AI CHATBOT
  // =====================================================

  // Load chatbot CSS
  if (!document.querySelector('link[data-titan-chatbot-css]')) {
    const css = document.createElement('link');

    css.rel = 'stylesheet';
    css.href = 'css/chatbot.css';
    css.dataset.titanChatbotCss = 'true';

    document.head.appendChild(css);
  }

  // =====================================================
  // CHATBOT HTML
  // =====================================================

  const chatbotHTML = `
    <button
      class="titan-chat-launcher"
      id="titanChatLauncher"
      aria-label="Open Titan Watch AI Assistant"
      title="Titan Watch AI Assistant"
    >
      <span class="titan-chat-launcher-icon">⌚</span>
    </button>

    <div
      class="titan-chat-window"
      id="titanChatWindow"
      aria-hidden="true"
    >

      <div class="titan-chat-header">

        <div class="titan-chat-header-left">

          <div class="titan-chat-avatar">
            ⌚
          </div>

          <div>
            <div class="titan-chat-title">
              Titan Watch AI
            </div>

            <div class="titan-chat-status">
              ● Online
            </div>
          </div>

        </div>

        <div class="titan-chat-header-actions">

  <button
    class="titan-chat-clear"
    id="titanChatClear"
    type="button"
    aria-label="Clear chat"
  >
    Clear
  </button>

  <button
    class="titan-chat-close"
    id="titanChatClose"
    type="button"
    aria-label="Close chatbot"
  >
    ×
  </button>

</div>

      </div>

      <div
        class="titan-chat-messages"
        id="titanChatMessages"
      ></div>

      <div class="titan-chat-input-area">

        <input
          type="text"
          id="titanChatInput"
          class="titan-chat-input"
          placeholder="Ask about Titan watches..."
          autocomplete="off"
        />

        <button
          id="titanChatSend"
          class="titan-chat-send"
          aria-label="Send message"
        >
          ➤
        </button>

      </div>  

    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', chatbotHTML);

  // =====================================================
  // ELEMENTS
  // =====================================================

  const launcher =
    document.getElementById('titanChatLauncher');

  const chatWindow =
    document.getElementById('titanChatWindow');

  const closeButton =
    document.getElementById('titanChatClose');

    const clearButton =
  document.getElementById('titanChatClear');

  const messagesContainer =
    document.getElementById('titanChatMessages');

  const input =
    document.getElementById('titanChatInput');

  const sendButton =
    document.getElementById('titanChatSend');

  const suggestionButtons =
    document.querySelectorAll('.titan-chat-suggestion');

  // =====================================================
  // CONVERSATION HISTORY
  // =====================================================

  let conversationHistory = [];

  // =====================================================
  // OPEN / CLOSE CHAT
  // =====================================================

  function openChat() {
    chatWindow.classList.add('open');
    chatWindow.setAttribute('aria-hidden', 'false');

    input.focus();
  }

  function closeChat() {
    chatWindow.classList.remove('open');
    chatWindow.setAttribute('aria-hidden', 'true');
  }

  launcher.addEventListener('click', openChat);
  closeButton.addEventListener('click', closeChat);
  clearButton.addEventListener('click', () => {
  messagesContainer.innerHTML = '';

  conversationHistory = [];

  appendMessage(
    'bot',
    'Hello! I’m Titan Watch AI. How can I help you find the perfect watch?'
  );

  input.focus();
});

  // =====================================================
  // ESCAPE HTML
  // =====================================================

  function escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =====================================================
  // SIMPLE MARKDOWN
  // =====================================================

  function formatMessage(text) {
    let html = escapeHTML(text);

    // Bold
    html = html.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  // =====================================================
  // ADD CHAT MESSAGE
  // =====================================================

  function appendMessage(type, text) {

    const message = document.createElement('div');

    message.className =
      `titan-chat-message ${type}`;

    message.innerHTML = `
      <div class="titan-chat-message-bubble">
        ${formatMessage(text)}
      </div>
    `;

    messagesContainer.appendChild(message);

    scrollToBottom();

    return message;
  }

  // =====================================================
  // TYPING INDICATOR
  // =====================================================

  function showTyping() {

    const typing = document.createElement('div');

    typing.className =
      'titan-chat-message bot titan-chat-typing-message';

    typing.id = 'titanChatTyping';

    typing.innerHTML = `
      <div class="titan-chat-message-bubble titan-chat-typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;

    messagesContainer.appendChild(typing);

    scrollToBottom();
  }

  function hideTyping() {

    const typing =
      document.getElementById('titanChatTyping');

    if (typing) {
      typing.remove();
    }
  }

  // =====================================================
  // PRODUCT CARDS
  // =====================================================

 function appendProductCards(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'titan-chat-products';

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'titan-chat-product-card';

    const image = product.image || product.image2 || '';

    const price = Number(product.price || 0)
      .toLocaleString('en-IN');

    const mrp = Number(product.mrp || 0)
      .toLocaleString('en-IN');

    const discount =
      product.discount
        ? `${product.discount}% OFF`
        : '';

    card.innerHTML = `
      <div class="titan-chat-product-image-wrap">
        <img
          class="titan-chat-product-image"
          src="${escapeHTML(image)}"
          alt="${escapeHTML(product.name || 'Titan watch')}"
          loading="lazy"
          onerror="this.style.display='none'"
        >
      </div>

      <div class="titan-chat-product-info">

        <div class="titan-chat-product-name">
          ${escapeHTML(product.name || 'Titan Watch')}
        </div>

        <div class="titan-chat-product-rating">
          ★ ${escapeHTML(product.rating ?? 'N/A')}
          <span>
            (${escapeHTML(product.reviews ?? 0)} reviews)
          </span>
        </div>

        <div class="titan-chat-product-pricing">
          <span class="titan-chat-product-price">
            ₹${price}
          </span>

          ${
            product.mrp && product.mrp > product.price
              ? `
                <span class="titan-chat-product-mrp">
                  ₹${mrp}
                </span>
              `
              : ''
          }

          ${
            discount
              ? `
                <span class="titan-chat-product-discount">
                  ${discount}
                </span>
              `
              : ''
          }
        </div>

        ${
          product.description
            ? `
              <div class="titan-chat-product-description">
                ${escapeHTML(product.description)}
              </div>
            `
            : ''
        }

        <div class="titan-chat-product-details">

          ${
            product.strap
              ? `<span>⌚ ${escapeHTML(product.strap)}</span>`
              : ''
          }

          ${
            product.movement
              ? `<span>⚙ ${escapeHTML(product.movement)}</span>`
              : ''
          }

          ${
            product.gender
              ? `<span> ${escapeHTML(product.gender)}</span>`
              : ''
          }

        </div>

      </div>
    `;

    wrapper.appendChild(card);
  });

  messagesContainer.appendChild(wrapper);

  scrollToBottom();
}
  // =====================================================
  // SCROLL
  // =====================================================

  function scrollToBottom() {

    messagesContainer.scrollTop =
      messagesContainer.scrollHeight;
  }

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  async function sendMessage(messageText) {

    const message =
      String(messageText || '').trim();

    if (!message) {
      return;
    }

    appendMessage('user', message);

    input.value = '';

    sendButton.disabled = true;

    conversationHistory.push({
      role: 'user',
      content: message
    });

    showTyping();

    try {

      const response =
        await fetch('/api/chat', {

          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            message,
            history: conversationHistory.slice(-10)
          })

        });

      const result =
        await response.json();

      hideTyping();

      if (!response.ok) {
        throw new Error(
          result.reply || 'Chat request failed'
        );
      }

      const reply =
        result.reply ||
        'Sorry, I could not generate a response.';

      appendMessage('bot', reply);

      // Show real catalog watch images
      if (
        Array.isArray(result.products) &&
        result.products.length > 0
      ) {
        appendProductCards(result.products);
      }

      conversationHistory.push({
        role: 'assistant',
        content: reply
      });

    } catch (error) {

      console.error(
        'Titan chatbot error:',
        error
      );

      hideTyping();

      appendMessage(
        'bot',
        'Sorry, I could not connect to the watch assistant. Please try again.'
      );

    } finally {

      sendButton.disabled = false;

      input.focus();
    }
  }

  // =====================================================
  // SEND BUTTON
  // =====================================================

  sendButton.addEventListener(
    'click',
    () => sendMessage(input.value)
  );

  // =====================================================
  // ENTER KEY
  // =====================================================

  input.addEventListener(
    'keydown',
    event => {

      if (
        event.key === 'Enter' &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage(input.value);
      }
    }
  );

  // =====================================================
  // SUGGESTIONS
  // =====================================================

  suggestionButtons.forEach(button => {

    button.addEventListener(
      'click',
      () => {

        sendMessage(button.textContent);

      }
    );

  });

  // =====================================================
  // WELCOME MESSAGE
  // =====================================================

  appendMessage(
    'bot',
    'Hi! 👋 I’m the Titan Watch AI assistant. I can help you find the right watch from our catalog.'
  );

})();