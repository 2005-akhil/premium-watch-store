    // ===== CHECKOUT PAGE =====

const checkoutParams = new URLSearchParams(window.location.search);
const checkoutProductId = parseInt(checkoutParams.get('id'));


// Load product information from the server
async function loadCheckoutProduct() {

  try {

    const response = await fetch('/api/products');

    if (!response.ok) {
      throw new Error('Could not load products');
    }

    const products = await response.json();

    const product = products.find(
      p => Number(p.id) === checkoutProductId
    );

    if (!product) {
      throw new Error('Product not found');
    }


    // Show product image
    document.getElementById('checkoutImage').src =
      product.image;

    // Show product name
    document.getElementById('checkoutName').textContent =
      product.name;

    // Show price
    document.getElementById('checkoutPrice').textContent =
      `₹${Number(product.price).toLocaleString('en-IN')}`;


    // Save product for Place Order
    window.checkoutProduct = product;

  } catch (error) {

    console.error('Checkout error:', error);

    document.getElementById('checkoutName').textContent =
      'Unable to load product';

    document.getElementById('checkoutPrice').textContent =
      '';

  }

}


// ===== PLACE ORDER =====

document
  .getElementById('checkoutForm')
  .addEventListener('submit', async function(event) {

    event.preventDefault();

    const product = window.checkoutProduct;

    if (!product) {
      alert('Product information is not loaded yet.');
      return;
    }


    const orderData = {

      productId: product.id,

      customerName:
        document.getElementById('customerName').value.trim(),

      customerEmail:
        document.getElementById('customerEmail').value.trim(),

      customerPhone:
        document.getElementById('customerPhone').value.trim(),

      customerAddress:
        document.getElementById('customerAddress').value.trim()

    };


    const button =
      document.querySelector('.place-order-btn');

    const messageBox =
      document.getElementById('orderMessage');


    button.disabled = true;

    button.textContent = 'Processing...';


    try {

      const response = await fetch('/api/orders', {

        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify(orderData)

      });


      const result = await response.json();


      if (!response.ok) {
        throw new Error(
          result.message || 'Order failed'
        );
      }


      messageBox.style.display = 'block';

      messageBox.style.background = '#e8f5e9';

      messageBox.innerHTML = `
        <strong>Order placed successfully!</strong>
        <br><br>
        Order ID: ${result.orderId}
        <br>
        Confirmation email sent to
        ${orderData.customerEmail}.
      `;


      document
        .getElementById('checkoutForm')
        .reset();


    } catch (error) {

      console.error('Order error:', error);

      messageBox.style.display = 'block';

      messageBox.style.background = '#ffebee';

      messageBox.innerHTML =
        `❌ ${error.message}`;

    } finally {

      button.disabled = false;

      button.innerHTML =
        '<i class="fas fa-shopping-bag"></i> Place Order';

    }

  });


// Start loading product
loadCheckoutProduct();