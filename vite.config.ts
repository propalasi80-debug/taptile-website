import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Every VITE_ variable is compiled into the JavaScript every visitor
 * downloads, so a mistake here gets published, not just deployed. These checks
 * stop the build instead. See src/site/launch.ts and docs/CHECKOUT.md.
 */
function checkCheckoutEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const fail = (message: string) => {
    throw new Error(`\n\n[checkout] ${message}\nSee docs/CHECKOUT.md.\n`);
  };

  for (const [name, value] of Object.entries(env)) {
    if (/(^|[^a-z])(sk|rk)_(live|test)_/i.test(value)) {
      fail(`${name} holds a Stripe secret or restricted key. Remove it now and roll the key in Stripe: it may already be in a build.`);
    }
  }

  const buyUrl = env['VITE_BUY_URL']?.trim() ?? '';
  if (buyUrl && !/^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+$/.test(buyUrl)) {
    fail(`VITE_BUY_URL must be a Stripe Payment Link (https://buy.stripe.com/...). Got "${buyUrl}".`);
  }

  // Vercel sets VERCEL_ENV. A test link on the real domain takes "payments"
  // that never arrive, from real customers who then wait for a board.
  if (process.env['VERCEL_ENV'] === 'production' && buyUrl.includes('/test_')) {
    fail('Production is pointing at a TEST Payment Link. Set the live link for the Production environment in Vercel.');
  }

  const price = env['VITE_PRICE_NZD']?.trim() ?? '';
  if (price && !/^\d{1,4}(\.\d{1,2})?$/.test(price)) {
    fail(`VITE_PRICE_NZD must be a plain number like 99.99 (no "$", no "NZ"). Got "${price}".`);
  }
}

export default defineConfig(({ mode }) => {
  checkCheckoutEnv(mode);
  return {
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { port: 5173, host: true },
  };
});
