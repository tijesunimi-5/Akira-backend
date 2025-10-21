// productAnalyzer.mjs

export const analyzeProduct = (product) => {
  let score = 100;
  const reasons = []; // For the 'weak list'
  const auditChecklist = []; // For the 'ProductAudit' checklist

  // Rule 1: Check description
  if (!product.description || product.description.length < 50) {
    score -= 30;
    const failMessage = "Description is too short or missing (< 50 chars).";
    reasons.push(failMessage);
    auditChecklist.push({ id: "description", met: false, text: failMessage });
  } else if (product.description.length < 150) {
    score -= 15;
    const failMessage = "Description could be more detailed (< 150 chars).";
    reasons.push(failMessage);
    auditChecklist.push({ id: "description", met: false, text: failMessage });
  } else {
    auditChecklist.push({
      id: "description",
      met: true,
      text: "Description is detailed and engaging.",
    });
  }

  // Rule 2: Check for a product image
  if (!product.imageUrl) {
    // <-- Using the fixed 'imageUrl'
    score -= 25;
    const failMessage = "Missing a product image.";
    reasons.push(failMessage);
    auditChecklist.push({ id: "image", met: false, text: failMessage });
  } else {
    auditChecklist.push({
      id: "image",
      met: true,
      text: "Product image is present.",
    });
  }

  // Rule 3: Check stock level
  if (product.stock === 0) {
    score -= 20;
    const failMessage = "Product is out of stock.";
    reasons.push(failMessage);
    auditChecklist.push({ id: "stock", met: false, text: failMessage });
  } else if (product.stock < 10) {
    score -= 5;
    // This is a minor issue, so we'll still mark it as 'met' for the checklist
    auditChecklist.push({
      id: "stock",
      met: true,
      text: "Product is in stock (low stock).",
    });
  } else {
    auditChecklist.push({
      id: "stock",
      met: true,
      text: "Product is in stock.",
    });
  }

  // Rule 4: Check for a valid price
  if (!product.price || product.price <= 0) {
    score = 0; // Critically flawed
    const failMessage = "Price is not set or is invalid.";
    reasons.push(failMessage);
    auditChecklist.push({ id: "price", met: false, text: failMessage });
  } else {
    auditChecklist.push({
      id: "price",
      met: true,
      text: "Valid price is set.",
    });
  }

  // Ensure score is not below 0
  score = Math.max(0, score);

  // Determine final status based on score
  const status = score >= 70 ? "Strong" : "Weak";

  return {
    health: score,
    status: status,
    reasons: reasons, // Array of *negative* reasons (for the top weak list)
    auditChecklist: auditChecklist, // *Full* checklist (for the audit panel)
  };
};
