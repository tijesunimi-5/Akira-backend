export const dummyProducts = [
  {
    externalId: "dummy-001",
    name: "Pro DSLR Camera MK-V",
    description:
      "The Mark V is our flagship camera, featuring a 30.4 MP full-frame CMOS sensor. It offers stunning 4K video recording, an advanced 61-point AF system, and Dual Pixel RAW for incredible post-production flexibility. Perfect for professional photographers and videographers who demand the best in image quality and performance.",
    price: 1250000.0,
    stock: 50,
    // MODIFIED: Switched to imageUrls array
    imageUrls: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1964",
    ],
  },
  {
    externalId: "dummy-002",
    name: "Wireless Noise-Cancelling Headphones",
    description: "Good headphones for listening to music.", // WEAK: Description too short
    price: 85000.0,
    stock: 120,
    imageUrls: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2070",
    ],
  },
  {
    externalId: "dummy-003",
    name: "Smartwatch Series 8",
    description: null, // WEAK: No description at all
    price: 210000.0,
    stock: 0, // WEAK: Out of stock
    imageUrls: [
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=1964",
    ],
  },
  {
    externalId: "dummy-004",
    name: "Vintage Leather Backpack",
    description:
      "Crafted from genuine full-grain leather, this vintage backpack combines timeless style with modern functionality. Features a padded laptop sleeve that fits up to a 15-inch laptop, multiple interior pockets, and comfortable shoulder straps for all-day wear. The leather develops a beautiful patina over time, making each bag unique.",
    price: 45000.0,
    stock: 3, // WEAK: Low stock
    imageUrls: [
      "https://images.unsplash.com/photo-1553062407-98eeb68faf7a?q=80&w=1887",
    ],
  },
  {
    externalId: "dummy-005",
    name: "Portable Espresso Maker",
    description:
      "Enjoy delicious espresso anywhere. This compact and lightweight manual espresso machine is perfect for camping, travel, or the office. No batteries or electricity needed. Just add hot water and your favorite coffee grounds for a rich, flavorful shot.",
    price: 25000.0,
    stock: 250,
    imageUrls: [], // WEAK: No image (was null, now an empty array)
  },
  // --- NEW GADGETS START HERE ---
  {
    externalId: "dummy-006",
    name: "14-inch Ultrabook Laptop",
    description:
      "A high-performance ultrabook with a 14-inch QHD display, 16GB of RAM, and a 1TB NVMe SSD. Features the latest 12th-gen processor and a sleek aluminum body, weighing just 1.2kg. Ideal for professionals and students on the go.",
    price: 750000.0,
    stock: 25,
    imageUrls: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1926",
    ],
  },
  {
    externalId: "dummy-007",
    name: "Smart Home Speaker",
    description: "A smart speaker with voice control.", // WEAK: Description too short
    price: 55000.0,
    stock: 200,
    imageUrls: [
      "https://images.unsplash.com/photo-1535016120720-40c646be5580?q=80&w=2070",
    ],
  },
  {
    externalId: "dummy-008",
    name: "4K Camera Drone",
    description:
      "Capture stunning aerial footage with this 4K camera drone. It features a 3-axis gimbal for smooth video, 30 minutes of flight time, and advanced obstacle avoidance. Folds down for easy portability on all your adventures.",
    price: 420000.0,
    stock: 40,
    imageUrls: [
      "https://images.unsplash.com/photo-1527977966376-18799018f203?q=80&w=1932",
    ],
  },
  {
    externalId: "dummy-009",
    name: "Next-Gen Gaming Console",
    description:
      "Experience lightning-fast loading with an ultra-high-speed SSD, deeper immersion with support for haptic feedback, adaptive triggers, and 3D Audio, and an all-new generation of incredible games.",
    price: 550000.0,
    stock: 15, // WEAK: Low stock
    imageUrls: [], // WEAK: No image
  },
  {
    externalId: "dummy-010",
    name: "Backlit E-Reader",
    description:
      "Read anytime, anywhere with a glare-free 6.8” display and adjustable warm light. A single charge lasts for weeks. Waterproof design means you're free to read and relax at the beach, by the pool, or in the bath.",
    price: 95000.0,
    stock: 80,
    imageUrls: [
      "https://images.unsplash.com/photo-1561154464-82e99641909c?q=80&w=2070",
    ],
  },
];

/**
 * A separate list of "fun" products for random testing.
 * They follow the same data structure so they can be used
 * by the same /create-store logic.
 */
export const dummyFunProducts = [
  {
    externalId: "fun-001",
    name: "Invisibility Cloak (Slightly Glitchy)",
    description:
      "99% effective! Perfect for sneaking around, though it occasionally flickers in bright light. Do not wash with colors. Final sale, no returns.",
    price: 9999999.0,
    stock: 2, // WEAK: Low stock
    imageUrls: [], // WEAK: No image
  },
  {
    externalId: "fun-002",
    name: "Bag of Holding (Personal Size)",
    description:
      "A stylish canvas tote that holds exactly 10x more than it should. Great for groceries, textbooks, or a surprising number of small animals. We don't recommend mixing all three.",
    price: 35000.0,
    stock: 150,
    imageUrls: [
      "https://images.unsplash.com/photo-1544462708-d202d0224c6f?q=80&w=1887",
    ],
  },
  {
    externalId: "fun-003",
    name: "Anti-Gravity Boots (Batteries Not Included)",
    description: null, // WEAK: No description
    price: 750000.0,
    stock: 0, // WEAK: Out of stock
    imageUrls: [], // WEAK: No image
  },
  {
    externalId: "fun-004",
    name: "Box of Unlimited Pencils",
    description:
      "A standard cardboard box that seems to... never run out of pencils. They're all standard HB#2, pre-sharpened. We've taken 5,000 out and it's still full. We're scared to look inside.",
    price: 15000.0,
    stock: 1,
    imageUrls: [
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=2070",
    ],
  },
];
