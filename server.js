const http = require('http')
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Groq = require('groq-sdk');
const nodemailer = require('nodemailer');

const { searchProducts } = require('./rag');
// your .env loading code here
// ...

// ======================================================
// TITAN WATCH CATALOG FOR AI CHATBOT
// ======================================================

const catalogPath = path.join(__dirname, 'data', 'products.js');

let products = [];

try {
  products = require(catalogPath);

  if (!Array.isArray(products)) {
    products = [];
  }

  console.log(`🤖 Chatbot catalog loaded: ${products.length} products`);
} catch (catalogError) {
  console.error('❌ Could not load products catalog:', catalogError.message);
  products = [];
}

// Load environment variables from .env file if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const value = trimmed.substring(eqIdx + 1).trim();
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';


const groq = GROQ_API_KEY
  ? new Groq({ apiKey: GROQ_API_KEY })
  : null;

// Local fallback database file (used if MongoDB URI is not configured yet)
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}

// Check if optional Mongoose is installed
try {
  mongoose = require('mongoose');
} catch (e) {
  
}

let isDbConnected = false;
let UserModel = null;

// Initialize MongoDB Atlas connection if Mongoose & MONGODB_URI are available
async function initMongo() {
  if (!MONGODB_URI || MONGODB_URI.includes('<username>') || MONGODB_URI.includes('<password>')) {
    console.log('\n📌 [MongoDB Status] MONGODB_URI is not set in .env.');
    console.log('👉 Add your MongoDB Atlas connection string to .env to store users directly in the cloud.');
    console.log('📁 Currently running with local persistence in data/users.json\n');
    return;
  }

  if (mongoose) {
    try {
      console.log('⏳ Connecting to MongoDB Atlas...');
      await mongoose.connect(MONGODB_URI);
      isDbConnected = true;
      console.log('✅ Connected successfully to MongoDB Atlas database!');

      const userSchema = new mongoose.Schema(
        {
          name: { type: String, required: true },
          email: { type: String, required: true, unique: true },
          password: { type: String, required: true },
          phone: { type: String, default: '' },
          salt: { type: String }
        },
        { timestamps: true }
      );

      UserModel = mongoose.models.User || mongoose.model('User', userSchema);
    } catch (err) {
      isDbConnected = false;
      console.error('❌ MongoDB Atlas Connection Error:', err.message);
      console.log('👉 Verify your username, password, and whitelist 0.0.0.0/0 in MongoDB Atlas Network Access.\n');
    }
  } else {
    console.log('ℹ️ Mongoose module not found. Run "npm install mongoose" on your terminal to enable Mongoose driver.');
  }
}

initMongo();

// Password hashing helper (Uses standard SHA-256 with salt)
function hashPassword(password, salt = null) {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 1000, 64, 'sha512').toString('hex');
  return { salt: generatedSalt, hash };
}

function verifyPassword(password, salt, storedHash) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === storedHash;
}

// User Storage Functions
async function findUserByEmail(email) {
  const normalized = email.trim().toLowerCase();

  // Try MongoDB first if connected
  if (isDbConnected && UserModel) {
    try {
      const user = await UserModel.findOne({ email: normalized });
      return user;
    } catch (e) {
      console.error('MongoDB find error:', e.message);
    }
  }

  // Fallback to local users.json
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8') || '[]');
  return users.find(u => u.email.toLowerCase() === normalized);
}

async function createUser(name, email, password, phone = '') {
  const normalized = email.trim().toLowerCase();
  const { salt, hash } = hashPassword(password);

  // Try MongoDB if connected
  if (isDbConnected && UserModel) {
    try {
      const newUser = new UserModel({
        name: name.trim(),
        email: normalized,
        password: hash,
        salt: salt,
        phone: phone.trim()
      });
      const saved = await newUser.save();
      return {
        id: saved._id,
        name: saved.name,
        email: saved.email,
        phone: saved.phone,
        storage: 'MongoDB Atlas'
      };
    } catch (e) {
      console.error('MongoDB save error, falling back to local storage:', e.message);
    }
  }

  // Fallback to local storage
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8') || '[]');
  const newUser = {
    id: 'user_' + Date.now(),
    name: name.trim(),
    email: normalized,
    password: hash,
    salt: salt,
    phone: phone.trim(),
    createdAt: new Date().toISOString(),
    storage: 'Local Database (Awaiting MongoDB URI)'
  };
  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    phone: newUser.phone,
    storage: newUser.storage
  };
}

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Request Parser Helper
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Main HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // API ROUTE: Database & Server Status
  if (pathname === '/api/auth/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        server: 'Titan Watch API',
        databaseConnected: isDbConnected,
        storageMode: isDbConnected ? 'MongoDB Atlas' : 'Local Fallback (data/users.json)',
        message: isDbConnected
          ? 'MongoDB Atlas is actively connected!'
          : 'Ready! Configure MONGODB_URI in .env to connect to your Atlas cluster.'
      })
    );
    return;
  }

  // API ROUTE: Register
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const data = await parseBody(req);
    const { name, email, password, phone } = data;

    if (!name || !email || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Please fill in all required fields (Name, Email, Password).' }));
      return;
    }

    if (password.length < 6) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Password must be at least 6 characters.' }));
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'An account with this email already exists. Please sign in.' }));
      return;
    }

    try {
      const user = await createUser(name, email, password, phone);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          message: 'Account created successfully! Welcome to Titan.',
          user: user
        })
      );
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: err.message || 'Error creating account.' }));
    }
    return;
  }

  // API ROUTE: Login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const data = await parseBody(req);
    const { email, password } = data;

    if (!email || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Please provide both email and password.' }));
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid email or password.' }));
      return;
    }

    const isValid = verifyPassword(password, user.salt, user.password);
    if (!isValid) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Invalid email or password.' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        message: `Welcome back, ${user.name}!`,
        user: {
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || ''
        }
      })
    );
    return;
  }

  // API ROUTE: Products
if (pathname === '/api/products' && req.method === 'GET') {

  res.writeHead(200, {
    'Content-Type': 'application/json; charset=UTF-8'
  });

  res.end(JSON.stringify(products));

  return;
}
  // API ROUTE: AI Shopping Chatbot
  if (pathname === '/api/chat' && req.method === 'POST') {
    const data = await parseBody(req);

    const userMessage = String(data.message || '').trim();
    const history = Array.isArray(data.history) ? data.history : [];

    if (!userMessage) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        reply: 'Please enter a message so I can help you find a watch.'
      }));
      return;
    }

    if (!groq) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        reply: 'The AI assistant is not configured yet. Please check the GROQ_API_KEY in your .env file.'
      }));
      return;
    }

    try {
      // ======================================================
// API ROUTE: CREATE ORDER + SEND EMAIL
// ======================================================

if (pathname === '/api/orders' && req.method === 'POST') {

  try {

    const data = await parseBody(req);

    const productId = parseInt(data.productId);

    const customerName =
      String(data.customerName || '').trim();

    const customerEmail =
      String(data.customerEmail || '').trim();

    const customerPhone =
      String(data.customerPhone || '').trim();

    const customerAddress =
      String(data.customerAddress || '').trim();


    // Validate customer details

    if (
      !productId ||
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !customerAddress
    ) {

      res.writeHead(400, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        success: false,
        message: 'Please fill in all customer details.'
      }));

      return;
    }


    // Find the real product from our catalog

    const product = products.find(
      item => Number(item.id) === productId
    );


    if (!product) {

      res.writeHead(404, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        success: false,
        message: 'Product not found.'
      }));

      return;
    }


    // Create order ID

    const orderId =
      'TW-' +
      Date.now().toString().slice(-8);


    // Email content

    const emailHtml = `

      <div style="
        font-family: Arial, sans-serif;
        max-width: 650px;
        margin: auto;
        padding: 20px;
      ">

        <h1 style="color:#b08d2c;">
          Titan Watch Store
        </h1>

        <h2>
          Order Confirmation
        </h2>

        <p>
          Hello <strong>${customerName}</strong>,
        </p>

        <p>
          Thank you for shopping with Titan Watch Store.
          Your order has been received successfully.
        </p>

        <hr>

        <h3>Watch Details</h3>

        <div style="text-align:center;">

          <img
            src="${product.image}"
            alt="${product.name}"
            style="
              width:280px;
              height:280px;
              object-fit:contain;
            "
          >

        </div>

        <h3>${product.name}</h3>

        <p>
          <strong>Price:</strong>
          ₹${Number(product.price).toLocaleString('en-IN')}
        </p>

        <p>
          <strong>Brand:</strong>
          ${product.brand || 'Titan'}
        </p>

        <p>
          <strong>Collection:</strong>
          ${product.collection || 'Titan Watches'}
        </p>

        <hr>

        <h3>Order Details</h3>

        <p>
          <strong>Order ID:</strong>
          ${orderId}
        </p>

        <p>
          <strong>Customer:</strong>
          ${customerName}
        </p>

        <p>
          <strong>Phone:</strong>
          ${customerPhone}
        </p>

        <p>
          <strong>Delivery Address:</strong><br>
          ${customerAddress}
        </p>

        <hr>

        <p>
          Thank you for choosing Titan Watch Store.
        </p>

      </div>

    `;


    // Send email

    if (!EMAIL_USER || !EMAIL_PASS) {

      throw new Error(
        'Email service is not configured.'
      );

    }


    await emailTransporter.sendMail({

      from: `"Titan Watch Store" <${EMAIL_USER}>`,

      to: customerEmail,

      subject:
        `Titan Watch Order Confirmation - ${orderId}`,

      html: emailHtml

    });


    // Send success response

    res.writeHead(200, {
      'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({

      success: true,

      message:
        'Order placed and confirmation email sent.',

      orderId: orderId

    }));

    return;


  } catch (error) {

    console.error(
      '❌ Order/email error:',
      error
    );

    res.writeHead(500, {
      'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({

      success: false,

      message:
        'Could not place the order. Please try again.'

    }));

    return;

  }

}
      // Load the existing Titan Watch catalog
const catalogPath = path.join(__dirname, 'data', 'products.js');

let products = [];

try {
  products = require(catalogPath);

  if (!Array.isArray(products)) {
    products = [];
  }
} catch (catalogError) {
  console.error('Could not load products catalog:', catalogError.message);
  products = [];
}

console.log(`🤖 Chatbot catalog loaded: ${products.length} products`);

const retrievedResults = await searchProducts(
  userMessage,
  products.length
);

// Apply exact budget filtering when the customer specifies "under ₹X"
const underPriceMatch = userMessage.match(
  /(?:under|below|less than)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i
);

if (underPriceMatch) {
  const maxPrice = Number(
    underPriceMatch[1].replace(/,/g, '')
  );

  console.log(`💰 Budget filter detected: ₹${maxPrice}`);

  const filteredResults = retrievedResults.filter(
    ({ product }) => Number(product.price) <= maxPrice
  );

  retrievedResults.splice(
    0,
    retrievedResults.length,
    ...filteredResults
  );

  console.log(
    '💰 Products within budget:',
    filteredResults.map(({ product }) => product.name)
  );
}

const retrievedProducts = retrievedResults.map(({ product, score }) => ({
  id: product.id,
  name: product.name,
  brand: product.brand,
  collection: product.collection,
  price: product.price,
  mrp: product.mrp,
  discount: product.discount,
  rating: product.rating,
  reviews: product.reviews,
  strap: product.strap,
  movement: product.movement,
  gender: product.gender,
  priceRange: product.priceRange,
  isNew: product.isNew,
  isBestseller: product.isBestseller,
  description: product.description,
  features: product.features,
  relevanceScore: score
}));

console.log(
  '🔎 RAG retrieved:',
  retrievedProducts.map(product => product.name)
);

const systemPrompt = `
You are Titan Watch Store's AI shopping assistant.

Your job is to help customers discover watches from the Titan Watch Store catalog.

IMPORTANT RULES:
- Recommend watches ONLY from the products retrieved from the Titan catalog below.
- Do not invent products, prices, ratings, features, discounts, or availability.
- Use Indian Rupees (₹) for prices.
- Use the retrieved products to answer the customer's request.
- If the retrieved products do not match the request, say so honestly.
- Keep answers friendly, concise, and useful.
- When recommending a watch, mention its exact name and price.
- Do not claim that a product is in stock unless the catalog explicitly provides stock information.

RETRIEVED TITAN WATCH PRODUCTS:
${JSON.stringify(retrievedProducts, null, 2)}
`;

      // Keep only a reasonable amount of previous conversation
      const safeHistory = history
        .filter(item =>
          item &&
          (item.role === 'user' || item.role === 'assistant') &&
          typeof item.content === 'string'
        )
        .slice(-10);

      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-20b',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...safeHistory,
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.4,
        max_tokens: 1000
      });

      const reply =
  completion.choices?.[0]?.message?.content ||
  'Sorry, I could not generate a response right now.';

// Use RAG results directly for product cards
const recommendedProducts = retrievedResults
  .slice(0, 4)
  .map(({ product }) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    mrp: product.mrp,
    discount: product.discount,
    rating: product.rating,
    reviews: product.reviews,
    image: product.image,
    image2: product.image2,
    description: product.description,
    strap: product.strap,
    movement: product.movement,
    gender: product.gender
  }));

console.log(
  '🛍️ Product cards from RAG:',
  recommendedProducts.map(product => product.name)
);

console.log(
  '🛍️ Recommended products:',
  recommendedProducts.map(product => product.name)
);

res.writeHead(200, { 'Content-Type': 'application/json' });

res.end(JSON.stringify({
  reply: reply,
  products: recommendedProducts
}));

} catch (err) {
  console.error('❌ Groq chatbot error:', err);
  console.error('Error message:', err?.message);
  console.error('Error status:', err?.status);

  // your existing code below...
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        reply: 'Sorry, I am having trouble connecting to the AI assistant right now. Please try again.'
      }));
    }

    return;
  }
  // ======================================================
  // API ROUTE: AI SHOPPING CHATBOT
  // ======================================================

  if (pathname === '/api/chat' && req.method === 'POST') {
    try {
      const data = await parseBody(req);

      const userMessage = String(data.message || '').trim();
      const history = Array.isArray(data.history) ? data.history : [];

      if (!userMessage) {
        res.writeHead(400, {
          'Content-Type': 'application/json; charset=UTF-8'
        });

        res.end(JSON.stringify({
          reply: 'Please tell me what kind of watch you are looking for.',
          products: []
        }));

        return;
      }

      if (!groq) {
        res.writeHead(500, {
          'Content-Type': 'application/json; charset=UTF-8'
        });

        res.end(JSON.stringify({
          reply: 'The AI assistant is not configured yet. Please check your GROQ_API_KEY in the .env file.',
          products: []
        }));

        return;
      }

      // --------------------------------------------------
      // Prepare catalog for the AI
      // --------------------------------------------------

      const catalogText = products.map(product => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        collection: product.collection,
        price: product.price,
        mrp: product.mrp,
        discount: product.discount,
        rating: product.rating,
        reviews: product.reviews,
        strap: product.strap,
        movement: product.movement,
        gender: product.gender,
        priceRange: product.priceRange,
        isNew: product.isNew,
        isBestseller: product.isBestseller,
        description: product.description,
        features: product.features
      }));

      // --------------------------------------------------
      // AI instructions
      // --------------------------------------------------

      const systemPrompt = `
You are the Titan Watch Store AI shopping assistant.

You help customers choose watches ONLY from the Titan Watch Store catalog provided below.

IMPORTANT RULES:

1. Only recommend watches that exist in the catalog.
2. Never invent a watch, price, feature, rating, discount, availability, or specification.
3. Always use Indian Rupees (₹).
4. When recommending a watch, ALWAYS write its exact catalog name.
5. Keep answers helpful and concise.
6. If the customer asks for watches under a specific price, only recommend watches whose catalog price meets that requirement.
7. If the customer asks for a particular style, gender, strap, movement, collection, or feature, use the catalog information.
8. If no catalog watch matches the request, clearly say that there is no exact match and offer the closest available catalog options.
9. Do not claim that a product is in stock unless the catalog explicitly provides stock information.

CATALOG:

${JSON.stringify(catalogText, null, 2)}
`;

      // --------------------------------------------------
      // Keep only safe conversation history
      // --------------------------------------------------

      const safeHistory = history
        .filter(item =>
          item &&
          typeof item.role === 'string' &&
          typeof item.content === 'string'
        )
        .slice(-10)
        .map(item => ({
          role: item.role === 'assistant' ? 'assistant' : 'user',
          content: item.content
        }));

      // --------------------------------------------------
      // Ask Groq
      // --------------------------------------------------

      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-20b',

        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...safeHistory,
          {
            role: 'user',
            content: userMessage
          }
        ],

        temperature: 0.4,
        max_tokens: 1000
      });

      const reply =
        completion.choices?.[0]?.message?.content ||
        'Sorry, I could not generate a response right now.';

      // --------------------------------------------------
      // Find REAL catalog products mentioned by the AI
      // --------------------------------------------------

      const replyLower = reply.toLowerCase();

      const recommendedProducts = products
        .filter(product => {
          if (!product.name) return false;

          return replyLower.includes(
            String(product.name).toLowerCase()
          );
        })
        .slice(0, 4)
        .map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          mrp: product.mrp,
          discount: product.discount,
          rating: product.rating,
          reviews: product.reviews,
          image: product.image,
          image2: product.image2,
          description: product.description
        }));

      // --------------------------------------------------
      // Send response to chatbot frontend
      // --------------------------------------------------

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=UTF-8'
      });

      res.end(JSON.stringify({
        reply,
        products: recommendedProducts
      }));

      return;

    } catch (error) {

      console.error('❌ AI Chat Error:', error);

      res.writeHead(500, {
        'Content-Type': 'application/json; charset=UTF-8'
      });

      res.end(JSON.stringify({
        reply: 'Sorry, I ran into a problem while talking to the AI assistant. Please try again.',
        products: []
      }));

      return;
    }
  }
  // ======================================================
// PLACE ORDER + SEND EMAIL
// ======================================================

if (pathname === '/api/orders' && req.method === 'POST') {

  try {
    const data = await parseBody(req);

    const {
      productId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress
    } = data;

    const product = products.find(
      p => Number(p.id) === Number(productId)
    );

    if (!product) {
      res.writeHead(404, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        success: false,
        message: 'Product not found.'
      }));

      return;
    }

    const orderId = 'TW-' + Date.now();

    await emailTransporter.sendMail({
      from: `"Titan Watch Store" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: `Order Confirmation - ${orderId}`,

      html: `
        <div style="font-family:Arial;max-width:650px;margin:auto">

          <h1 style="color:#c9a227">
            Titan Watch Store
          </h1>

          <h2>Order Confirmed 🎉</h2>

          <p>Hello ${customerName},</p>

          <p>Thank you for your order.</p>

          <hr>

          <h2>${product.name}</h2>

          <img
            src="${product.image}"
            alt="${product.name}"
            style="width:300px;max-width:100%;"
          >

          <h2>
            Price: ₹${Number(product.price).toLocaleString('en-IN')}
          </h2>

          <p>
            <strong>Order ID:</strong> ${orderId}
          </p>

          <hr>

          <h3>Delivery Details</h3>

          <p>
            <strong>Name:</strong> ${customerName}<br>
            <strong>Phone:</strong> ${customerPhone}<br>
            <strong>Address:</strong> ${customerAddress}
          </p>

          <p>
            Thank you for shopping with Titan Watch Store.
          </p>

        </div>
      `
    });

    res.writeHead(200, {
      'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
      success: true,
      orderId: orderId,
      message: 'Order placed successfully. Confirmation email sent.'
    }));

    return;

  } catch (error) {

    console.error('❌ ORDER ERROR:', error);

    res.writeHead(500, {
      'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
      success: false,
      message: 'Could not send order email.'
    }));

    return;
  }
}
  // STATIC FILE SERVING
  let safePath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.join(__dirname, decodeURIComponent(safePath));

  // Security check to prevent path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - Page Not Found</h1><p><a href="/">Return to Home</a></p>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🌟 TITAN WATCH STORE & MONGODB ATLAS AUTH SERVER 🌟`);
  console.log(`======================================================`);
  console.log(`  🏠 Website URL:  http://localhost:${PORT}`);
  console.log(`  🔐 Login Page:   http://localhost:${PORT}/login.html`);
  console.log(`  🛍️ Collections:  http://localhost:${PORT}/collections.html`);
  console.log(`  📡 API Health:   http://localhost:${PORT}/api/auth/status`);
  console.log(`======================================================\n`);
});
