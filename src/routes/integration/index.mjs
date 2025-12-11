import { Router } from "express";

const router = Router();

router.post("/detect", async (req, res) => {
  try {
    const { domain } = req.body;
    const html = await fetch(domain).then((r) => r.text());

    let platform = "custom";

    if (html.includes("shopify")) platform = "shopify";
    else if (html.includes("woocommerce")) platform = "woocommerce";
    else if (html.includes("wp-content")) platform = "wordpress";
    else if (html.includes("wix.com")) platform = "wix";
    else if (html.includes("squarespace")) platform = "squarespace";

    res.json({ platform });
  } catch (err) {
    console.error("Error detecting platform:", err);
    res.json({ platform: null });
  }
});
export default router;
