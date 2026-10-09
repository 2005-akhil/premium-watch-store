const { pipeline } = require('@xenova/transformers');
const products = require('./data/products.js');

let embedder = null;
let productVectors = [];

// Load embedding model
async function loadEmbedder() {
  if (!embedder) {
    console.log('🧠 Loading RAG embedding model...');

    embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );

    console.log('✅ RAG embedding model loaded');
  }

  return embedder;
}

// Convert a product into searchable text
function productToText(product) {
  return `
    Product: ${product.name}
    Brand: ${product.brand}
    Collection: ${product.collection}
    Price: ${product.price}
    MRP: ${product.mrp}
    Discount: ${product.discount}
    Rating: ${product.rating}
    Reviews: ${product.reviews}
    Strap: ${product.strap}
    Movement: ${product.movement}
    Gender: ${product.gender}
    Price Range: ${product.priceRange}
    Description: ${product.description}
    Features: ${
      Array.isArray(product.features)
        ? product.features.join(', ')
        : product.features || ''
    }
  `;
}

// Calculate cosine similarity
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Create embeddings for the catalog
async function buildIndex() {
  const model = await loadEmbedder();

  console.log(`📚 Creating RAG index for ${products.length} Titan products...`);

  productVectors = [];

  for (const product of products) {
    const text = productToText(product);

    const output = await model(text, {
      pooling: 'mean',
      normalize: true
    });

    productVectors.push({
      product,
      vector: Array.from(output.data)
    });
  }

  console.log('✅ Titan RAG index created');
}

// Search for relevant products
async function searchProducts(query, limit = 5) {
  const model = await loadEmbedder();

  if (productVectors.length === 0) {
    await buildIndex();
  }

  const output = await model(query, {
    pooling: 'mean',
    normalize: true
  });

  const queryVector = Array.from(output.data);

  return productVectors
    .map(item => ({
      product: item.product,
      score: cosineSimilarity(queryVector, item.vector)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = {
  buildIndex,
  searchProducts
};