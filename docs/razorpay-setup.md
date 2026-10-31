# Razorpay setup

Online payments stay off until the keys below are on the server. Until then, checkout works exactly as it did
before. All three values are set on Render only: never in Vercel, a `VITE_*` variable, a file in this repository,
a screenshot or a chat.

| Render variable | Where it comes from |
| --- | --- |
| `RAZORPAY_KEY_ID` | Razorpay dashboard, API Keys. Starts `rzp_test_` or `rzp_live_`. |
| `RAZORPAY_KEY_SECRET` | Shown once when the key is generated. |
| `RAZORPAY_WEBHOOK_SECRET` | A long password you make up and type into the webhook in Razorpay too. |

## Webhook

Add one in the Razorpay dashboard, under Webhooks:

- **URL:** `https://silver-1-x4wb.onrender.com/api/webhooks/razorpay`
- **Secret:** the same value as `RAZORPAY_WEBHOOK_SECRET`
- **Events:** `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`

Test mode and live mode each have their own keys and their own webhook.

## Going live

1. Check the whole journey in test mode with Razorpay's test cards and UPI ids.
2. Generate live keys and replace both key values on Render.
3. Add the webhook again in live mode with its own secret, and update `RAZORPAY_WEBHOOK_SECRET`.
4. Leave Payment Capture on automatic in Razorpay. If it is manual, the server captures payments it confirms.

## How it behaves

- The amount always comes from the saved order. An order counts as paid only after Razorpay's own record says the
  money was captured, for the right amount, in rupees.
- Stock is held from checkout. An online order not paid within 30 minutes (`APP_PAYMENT_WINDOW`) is cancelled and
  its pieces go back on sale. The server checks with Razorpay first, so a missed webhook can't cancel a paid order.
  This check runs only while the server is awake.
- Money that arrives for an order that can't take it, such as one already cancelled, is never kept silently. The
  payment is marked Needs refund, shown at the top of the admin Overview, and emailed to the shop once email is on.
- Refunds are made in Razorpay's dashboard. The webhook then marks the order Refunded. Cancelling an order in the
  admin does not refund it.
- With the keys on, the old UPI and Card "pay later" choices are replaced by Pay Online. Cash on delivery stays.
