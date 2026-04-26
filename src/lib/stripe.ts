import "server-only";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY is not set. Add it to .env.local and Vercel env to enable payments.",
  );
}

export const stripe = new Stripe(secretKey, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
  appInfo: {
    name: "Fab Collab",
    url: "https://fabcollab.vercel.app",
  },
});
