# SILVORA | Fine Sterling Silver Ornaments

A luxury e-commerce storefront for **SILVORA**, a contemporary silver ornaments brand. Crafted with quiet confidence, generous whitespace, refined editorial typography, and certified 925 sterling silver photography.

![SILVORA Preview](/public/images/hero_silver_ring.jpg)

---

## Brand Aesthetic & Palette

The visual identity is rooted in warm light, natural stone textures, and authentic silver reflectivity:

| Color Name | Hex Code | Purpose |
|---|---|---|
| **Warm Ivory** | `#F7F3ED` | Primary background, hero canvas |
| **Soft Cream** | `#F1E9DF` | Secondary sections, navigation, footer |
| **Sand Beige** | `#D8C5B2` | Natural stone accents & transitions |
| **Champagne** | `#B89573` | Italic serif editorial accent |
| **Deep Charcoal** | `#242220` | High-contrast typography & primary CTAs |
| **Muted Grey** | `#77716B` | Supporting descriptions, metadata |
| **Pure White** | `#FFFFFF` | Subtle card highlights & modal surfaces |
| **Silver** | `#C7C9CC` | Subtle metal highlights & borders |

---

## Typography

- **Headlines**: [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) (Serif) with italic styling for editorial emphasis (*“in Every Detail.”*, *“for Every Chapter.”*, *“Considered Pieces.”*).
- **Body, Navigation & Data**: [Manrope](https://fonts.google.com/specimen/Manrope) (Sans-Serif) with subtle uppercase tracking for UI controls and prices.

---

## Features

### 1. Navigation & Dropdowns
- Brand monogram with slim, warm cream header.
- **Men** dropdown (*View All Men's Jewellery*, *Rings*, *Bracelets*).
- **Women** dropdown (*View All Women's Jewellery*, *Rings*, *Bracelets*, *Necklaces*, *Earrings*).
- Responsive mobile menu drawer with touch-friendly accordion dropdowns.
- Real-time shopping bag counter, wishlist counter, and global search trigger.

### 2. Editorial Hero
- Balanced two-sided composition (75–85vh).
- Uppercase eyebrow, editorial headline, supporting narrative, and primary charcoal CTA with subtle arrow indicator.
- Substantial macro photography of a mastercrafted 925 sterling silver ring on natural beige stone.
- Minimalist vertical scroll indicator.

### 3. Collection Grid (Section Two)
- 4-category horizontal desktop row (two-column responsive mobile):
  - **Rings** (*The Luma & Solis Sculptural Bands*)
  - **Bracelets** (*The Sovereign Cuff & Curb Chains*)
  - **Necklaces** (*The Horizon Pendant & Cable Chains*)
  - **Earrings** (*The Dewdrop Hoops & Droplets*)
- Restrained hover zoom and arrow indicators.

### 4. The Selection (Featured Products)
- 4-column product grid with INR (`₹`) currency formatting.
- Alternate image reveal on hover for every piece.
- Direct Wishlist toggle and Quick-View modal.

### 5. Dedicated Gender Catalog Pages
- **Men's Collection** & **Women's Collection** with subcategory filter pills.
- Interactive filter panel: price range slider, in-stock toggle, and multi-option sorting (*Featured*, *Price: Low to High*, *Price: High to Low*, *Alphabetical*).

### 6. Product Detail Pages (PDP)
- Multi-angle gallery with interactive thumbnail switcher.
- Verified 925 BIS Hallmarking details, material specs, and gram weight.
- Size selector with interactive **Sizing Chart Modal Guide**.
- Quantity controls and Add to Bag with real-time feedback.
- Expandable accordions for Details & Hallmarking, Silver Care Guide, and Shipping & Returns.
- Complementary designs carousel (*“You May Also Admire”*).

### 7. Interactive Shopping Experience
- **Slide-Over Bag Drawer**: Item line totals, quantity controls, free express shipping progress, and simulated multi-step **Secure Checkout** (address input, UPI/Cards/COD selection, and order ID generation).
- **Wishlist Drawer**: Saved pieces with quick move-to-bag action.
- **Live Search Modal**: Instant keyword filtering and luxury search chips.
- **State Persistence**: Cart and wishlist persist across browser sessions using `localStorage`.

### 8. Secondary Brand Pages
- **Our Story**: *The Architecture of Pure Silver* brand narrative.
- **Jewellery Care**: 925 sterling silver preservation, polishing, and storage guide.
- **Shipping & Returns**: Domestic & international delivery timelines and 14-day exchange policy.
- **Client Concierge**: Contact inquiry form.
- **FAQ Accordion**: Common questions on purity, sizing, and care.

### 9. Customer Accounts
- **Create Account** with email confirmation, **Sign In**, **Sign Out**, and **Forgotten Password** with a secure reset link.
- **Client Account** page with profile details and an editable name; sessions are restored on reload.
- Powered by **Supabase** (managed authentication and PostgreSQL). Customer data is protected by Row Level Security in the database.
- Bag and wishlist stay on the device and are unaffected by signing in or out.

---

## Technical Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Dev Server**: Vite 6
- **Styling**: Vanilla CSS Design System with CSS variables
- **Icons**: Lucide React
- **Typography**: Google Fonts (Cormorant Garamond & Manrope)
- **Accounts & Database**: Supabase Auth + PostgreSQL (`@supabase/supabase-js`), schema in `supabase/migrations`

---

## Getting Started

### Prerequisites
- Node.js 20.19+ or 22.12+ (required by Vite 8)
- npm, pnpm, or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/Nithin30121/Silver.git

# Navigate to project directory
cd Silver

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be live at `http://localhost:5173/`.

### Customer Accounts (Supabase)
The storefront runs without any configuration; account pages stay disabled until Supabase is connected.
To enable them, copy `.env.example` to `.env.local` and add your Supabase project URL and **publishable** key:

```bash
cp .env.example .env.local
```

Creating the Supabase project, applying the database migrations, email settings, deployment and
testing are covered step by step in **[docs/customer-accounts-supabase.md](docs/customer-accounts-supabase.md)**.

### Production Build
```bash
npm run build
```
Generates an optimized production bundle in the `dist/` directory. The site is fully static and can be
deployed to Netlify (configured in `netlify.toml`) or Cloudflare Pages; see the guide above.

---

## License

Crafted for **SILVORA**. All rights reserved.
