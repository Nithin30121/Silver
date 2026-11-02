# Delhivery setup

Booking parcels from the admin stays off until the two required values below are on the server. Until then, orders
work exactly as before, and tracking can still be typed in by hand when an order is marked Shipped. All values are set
on Render only: never in Vercel, a `VITE_*` variable, a file in this repository, a screenshot or a chat.

| Render variable | What it is | Needed |
| --- | --- | --- |
| `DELHIVERY_API_TOKEN` | Delhivery One, Settings > API Setup. It is shown once, for a few minutes, so copy it straight into Render. Generating a new one stops the old one working. | Yes |
| `DELHIVERY_PICKUP_LOCATION` | The pickup address's name exactly as Delhivery One shows it, same capitals and spaces. | Yes |
| `DELHIVERY_SELLER_GST` | The shop's GST number. Delhivery's documentation says bookings need it. | If registered |
| `DELHIVERY_HSN_CODE` | Defaults to `7113`, the code for jewellery of precious metal. Change it only if your accountant says so. | No |
| `DELHIVERY_SHIPPING_MODE` | `Surface` (default) or `Express`. Delhivery keeps precious metals off its air network. | No |
| `DELHIVERY_PACKAGING_GRAMS` | Added to the pieces' weights to suggest a parcel weight. Default 100. | No |
| `DELHIVERY_DEFAULT_WEIGHT_GRAMS` | The suggested weight when a piece has no weight recorded. Default 250. | No |
| `DELHIVERY_CHECK_EVERY` | How often parcels are checked while the server is awake. Default `PT30M` (30 minutes). | No |
| `DELHIVERY_API_URL` | Defaults to `https://track.delhivery.com`. Use `https://staging-express.delhivery.com` only with a staging token from Delhivery. | No |

## How it works

1. A confirmed order shows a **Delivery** section in the admin. Enter the packed weight and click **Book with Delhivery**.
   A paid order goes as prepaid. An unpaid cash-on-delivery order has its total collected by Delhivery at the door.
   Other unpaid orders can't be booked until they are marked paid.
2. The order moves to Processing, and the customer sees Delhivery's tracking number and link on their order page.
   From then on the customer can't cancel it online, and the admin can't cancel it either until the booking is cancelled.
3. Print the label and book the pickup in Delhivery One.
4. The server asks Delhivery about moving parcels soon after it starts and then every 30 minutes, while it is awake.
   The **Check now** button asks straight away. When Delhivery collects the parcel the order becomes Shipped, and when it
   delivers, Delivered. The customer gets the usual emails once email is set up.
5. A booking can be cancelled from the admin until Delhivery collects the parcel. The order then waits to be booked
   again or cancelled.
6. A parcel coming back to the shop (for example a refused cash-on-delivery order) is shown as **Coming back to you**,
   then **Back at the shop**. **Close order and restock** then cancels the order and puts its pieces back on sale.
   A paid order also needs a refund, which is done in Razorpay as before.
7. At checkout, customers see whether Delhivery delivers to their PIN code. Where it doesn't take cash on delivery,
   the order can't be placed as cash on delivery.

## Before relying on it

The first live booking proves the token, the pickup name and Delhivery's reply format, which were built from Delhivery's
public documentation and tested only against a local stand-in. Book one real order, check it in Delhivery One, then use
**Cancel booking** if it isn't really going out, and check Delhivery One shows it cancelled.

Cash collected on delivery reaches you through Delhivery's remittance, not instantly. Mark the order Paid in the admin
when the money arrives.
