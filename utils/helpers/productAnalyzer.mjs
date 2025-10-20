export const analyzeProduct = (product) => {
  let score = 100;
  const reasons = [];

  // Rule 1: Check description length
  if (!product.description || product.description.length < 50) {
    score -= 30;
    reasons.push("Description is too short or missing.");
  } else if (product.description.length < 150) {
    score -= 15;
    reasons.push("Description could be more detailed.");
  }

  // Rule 2: Check for a product image
  if (!product.imageurl) {
    // Corrected from imageUrl to match your DB schema
    score -= 25;
    reasons.push("Missing a product image.");
  }

  // Rule 3: Check stock level
  if (product.stock === 0) {
    score -= 20;
    reasons.push("Product is out of stock.");
  } else if (product.stock < 10) {
    score -= 5; // Minor penalty for low stock
  }

  // Rule 4: Check for a valid price
  if (product.price <= 0) {
    score = 0; // A product with no price is critically flawed
    reasons.push("Price is not set or is invalid.");
  }

  // Ensure score is not below 0
  score = Math.max(0, score);

  // Determine final status based on score
  const status = score >= 70 ? "Strong" : "Weak";

  return {
    health: score,
    status: status,
    reasons: reasons, // Array of reasons for a weak score
  };
};
