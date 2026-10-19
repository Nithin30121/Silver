import type { Product } from '../types';

export const PRODUCTS: Product[] = [
  {
    id: 'solis-filigree-ring',
    name: 'The Solis Filigree Ring',
    subtitle: 'Hand-carved archival 925 sterling silver band',
    slug: 'solis-filigree-ring',
    category: 'rings',
    gender: 'unisex',
    price: 8400,
    originalPrice: 9200,
    inStock: true,
    isNew: true,
    isFeatured: true,
    images: [
      '/images/hero_silver_ring.jpg',
      '/images/category_rings.jpg',
      '/images/women_aura_alt.jpg',
    ],
    description: 'A masterwork in solid sterling silver, featuring intricate botanical filigree motifs carved alongside polished aerodynamic contours. Designed to capture and reflect warm light from every angle.',
    material: 'Solid 925 Sterling Silver',
    purity: '92.5% Pure Silver (BIS Hallmarked)',
    finish: 'Mirror Polish with Hand-Antiqued Recesses',
    weightGrams: 8.4,
    availableSizes: ['US 6', 'US 7', 'US 8', 'US 9', 'US 10'],
    dimensions: 'Band width: 8.5mm, Thickness: 2.2mm',
    details: [
      'Authentic 925 silver stamp on interior wall',
      'Continuous botanical scrollwork ornamentation',
      'Comfort-fit rounded inner profile',
      'Protective tarnish-resistant rhodium barrier',
      'Delivered in signature bespoke linen and velvet box'
    ],
    careGuide: [
      'Wipe gently with the provided micro-fibre polishing cloth',
      'Avoid prolonged immersion in chlorinated pools or thermal baths',
      'Store individually in the protective suede pouch to prevent friction'
    ],
    shippingInfo: 'Complimentary insured express delivery across India in 2–4 business days. International delivery in 5–8 days.'
  },
  {
    id: 'obelisk-signet-ring',
    name: 'The Obelisk Signet Ring',
    subtitle: 'Architectural beveled 925 silver signet',
    slug: 'obelisk-signet-ring',
    category: 'rings',
    gender: 'men',
    price: 6450,
    inStock: true,
    isNew: false,
    isFeatured: true,
    images: [
      '/images/men_signet_ring.jpg',
      '/images/men_signet_alt.jpg',
    ],
    description: 'Engineered with clean octagonal geometry and chamfered edges. A brushed satin plateau contrasts against mirror-finished flanks, providing a masculine, substantial presence on the hand.',
    material: 'Solid 925 Sterling Silver',
    purity: '92.5% Pure Silver',
    finish: 'Dual Finish: Brushed Satin Top & Polished Bevels',
    weightGrams: 14.2,
    availableSizes: ['US 8', 'US 9', 'US 10', 'US 11', 'US 12'],
    dimensions: 'Table: 14mm x 14mm, Shank base: 4.8mm',
    details: [
      'Solid core construction with substantial hand-feel',
      'Deep laser-engraved 925 provenance hallmark',
      'Architectural octagonal silhouette',
      'Hand-finished edges for ergonomic daily wear'
    ],
    careGuide: [
      'Silver naturally patinas over time, accentuating its architectural lines',
      'Use the polishing cloth on mirror bevels to restore high gleam'
    ],
    shippingInfo: 'Complimentary insured shipping. 14-day hassle-free size exchange.'
  },
  {
    id: 'imperium-cuban-bracelet',
    name: 'The Imperium Cuban Bracelet',
    subtitle: 'Heavy beveled 925 silver curb chain',
    slug: 'imperium-cuban-bracelet',
    category: 'bracelets',
    gender: 'men',
    price: 14200,
    originalPrice: 15500,
    inStock: true,
    isNew: true,
    isFeatured: true,
    images: [
      '/images/men_cuban_bracelet.jpg',
      '/images/men_cuban_alt.jpg',
    ],
    description: 'Precision-cast curb links with diamond-cut flat facets that rest flush against the wrist. Fitted with a secure mechanical box lock embossed with Italian hallmarks.',
    material: 'Solid 925 Sterling Silver',
    purity: '92.5% Pure Silver',
    finish: 'High Polish Diamond-Cut Bevels',
    weightGrams: 38.6,
    availableSizes: ['7.5 Inches (19cm)', '8.0 Inches (20.5cm)', '8.5 Inches (21.5cm)'],
    dimensions: 'Link width: 9mm, Link thickness: 3.5mm',
    details: [
      'Heavyweight heirloom construction (38.6 grams)',
      'Dual safety-catch mechanical box clasp',
      'Diamond-cut beveled facets for light refraction',
      'Hand-assembled seamless articulation'
    ],
    careGuide: [
      'Keep flat when resting in jewellery case',
      'Clean periodically with mild soapy warm water and pat dry with cotton'
    ],
    shippingInfo: 'Complimentary insured express delivery. Signature required on receipt.'
  },
  {
    id: 'aurelia-wave-ring',
    name: 'The Aurelia Wave Ring',
    subtitle: 'Sculptural fluid wave sterling silver band',
    slug: 'aurelia-wave-ring',
    category: 'rings',
    gender: 'women',
    price: 5800,
    inStock: true,
    isNew: false,
    isFeatured: true,
    images: [
      '/images/women_aura_ring.jpg',
      '/images/women_aura_alt.jpg',
      '/images/category_rings.jpg',
    ],
    description: 'Inspired by the undulating movement of ocean swells, the Aurelia ring flows around the finger in a seamless ribbon of liquid silver. Organic, tactile, and effortlessly modern.',
    material: 'Solid 925 Sterling Silver',
    purity: '92.5% Pure Silver',
    finish: 'High Polish Liquid Gleam',
    weightGrams: 6.2,
    availableSizes: ['US 5', 'US 6', 'US 7', 'US 8', 'US 9'],
    dimensions: 'Variable height: 4mm to 9mm wave crest',
    details: [
      'Fluid asymmetrical crest',
      'Ergonomic contouring that sits naturally between fingers',
      'Solid casting without hollowed cavity',
      'Subtle internal hallmark stamp'
    ],
    careGuide: [
      'Wipe after exposure to cosmetics or perfume',
      'Polish with soft silver cloth for mirror reflection'
    ],
    shippingInfo: 'Complimentary gift-wrapped shipping. Size exchanges honored within 14 days.'
  },
  {
    id: 'celestia-halo-necklace',
    name: 'The Celestia Hammered Necklace',
    subtitle: 'Organic hammered halo pendant on double chain',
    slug: 'celestia-halo-necklace',
    category: 'necklaces',
    gender: 'women',
    price: 8900,
    inStock: true,
    isNew: true,
    isFeatured: true,
    images: [
      '/images/women_pendant_neck.jpg',
      '/images/women_pendant_alt.jpg',
      '/images/category_necklaces.jpg',
    ],
    description: 'An open circular medallion with artisan hammer-strike texturing that catches ambient light with soft nuance. Suspended on a fluid double sterling silver chain.',
    material: 'Solid 925 Sterling Silver',
    purity: '92.5% Pure Silver',
    finish: 'Artisan Hammered with Polished Rim',
    weightGrams: 11.8,
    availableSizes: ['16" + 2" Extender', '18" + 2" Extender'],
    dimensions: 'Pendant diameter: 22mm, Chain width: 1.2mm dual strand',
    details: [
      'Hand-hammered open circle talisman motif',
      'Dual-strand silver cable chain for layered drape',
      'Custom lobster clasp with engraved tag',
      'Reinforced silver soldered jump rings'
    ],
    careGuide: [
      'Fasten clasp prior to storage to prevent tangling',
      'Store flat in original velvet box'
    ],
    shippingInfo: 'Complimentary insured shipping. Delivered within 2–4 business days.'
  },
  {
    id: 'cascading-dewdrop-earrings',
    name: 'The Dewdrop Hoop Earrings',
    subtitle: 'Polished silver huggies with droplet fringe',
    slug: 'cascading-dewdrop-earrings',
    category: 'earrings',
    gender: 'women',
    price: 6200,
    inStock: true,
    isNew: true,
    isFeatured: true,
    images: [
      '/images/category_earrings.jpg',
      '/images/category_rings.jpg',
    ],
    description: 'Clean circular huggie hoops suspended with delicate silver chains terminating in polished teardrop dangles. They catch the subtlest motion with refined grace.',
    material: 'Solid 925 Sterling Silver',
    purity: '92.5% Pure Silver (Nickel-Free)',
    finish: 'High-Gloss Mirror Polish',
    weightGrams: 5.4,
    availableSizes: ['Standard Pierced (One Size)'],
    dimensions: 'Hoop inner diameter: 12mm, Total drop: 38mm',
    details: [
      'Hypoallergenic 925 silver posts with secure hinge-snap closure',
      'Articulated multi-tier silver drops',
      'Lightweight comfort designed for day-to-evening wear',
      'Stamped with 925 verification on hoop interior'
    ],
    careGuide: [
      'Keep away from hairspray and harsh solvents',
      'Clean post with alcohol swab before initial wear'
    ],
    shippingInfo: 'Ships in sealed anti-tarnish protective sleeve inside gift box.'
  },
  {
    id: 'sovereign-cuff-bracelet',
    name: 'The Sovereign Minimalist Cuff',
    subtitle: 'Solid rounded silver torque cuff',
    slug: 'sovereign-cuff-bracelet',
    category: 'bracelets',
    gender: 'unisex',
    price: 9800,
    inStock: true,
    isNew: false,
    isFeatured: false,
    images: [
      '/images/category_bracelets.jpg',
      '/images/men_cuban_bracelet.jpg',
    ],
    description: 'An open-cuff bangle forged from solid silver rod, tapered with bulbous rounded finials. Substantial, quietly self-assured, and gently adjustable to wrist contour.',
    material: 'Solid 925 Sterling Silver',
    purity: '92.5% Pure Silver',
    finish: 'Silky Satin Brushed with Polished Tips',
    weightGrams: 24.5,
    availableSizes: ['Small (6.5")', 'Medium (7.5")', 'Large (8.5")'],
    dimensions: 'Rod diameter: 5.5mm, Gap opening: 28mm',
    details: [
      'Solid silver core with resilient spring memory',
      'Comfort-contoured inner curvature',
      'Hallmarked on inside apex',
      'Can be worn solo or stacked alongside leather or chain'
    ],
    careGuide: [
      'Adjust fit once gently by pressing sides evenly',
      'Avoid repeated bend stress at center point'
    ],
    shippingInfo: 'Complimentary insured shipping in 2–4 business days.'
  },
  {
    id: 'geometric-horizon-pendant',
    name: 'The Horizon Square Pendant',
    subtitle: 'Minimalist geometric open pendant',
    slug: 'geometric-horizon-pendant',
    category: 'necklaces',
    gender: 'unisex',
    price: 7400,
    inStock: true,
    isNew: false,
    isFeatured: false,
    images: [
      '/images/category_necklaces.jpg',
      '/images/women_pendant_neck.jpg',
    ],
    description: 'A circular halo framing an open square silhouette, evoking architectural balance and minimalist restraint. Drapes effortlessly on a sturdy wheat chain.',
    material: 'Solid 925 Sterling Silver',
    purity: '92.5% Pure Silver',
    finish: 'Velvet Matte Finish with Polished Frame',
    weightGrams: 9.6,
    availableSizes: ['20" Chain', '22" Chain'],
    dimensions: 'Pendant diameter: 20mm, Chain gauge: 1.4mm',
    details: [
      'Sculptural geometric cutout structure',
      'Fluid diamond-cut wheat chain included',
      'Reinforced silver bail with discreet 925 mark',
      'Sits comfortably flat against the collarbone'
    ],
    careGuide: [
      'Buff with dry flannel cloth',
      'Do not apply chemical dips'
    ],
    shippingInfo: 'Complimentary courier delivery with tracking provided.'
  }
];

export const CATEGORIES = [
  {
    id: 'rings',
    name: 'Rings',
    tagline: 'Sculptural statements & understated bands',
    image: '/images/category_rings.jpg',
    count: 3
  },
  {
    id: 'bracelets',
    name: 'Bracelets',
    tagline: 'Heavy curbs & architectural open cuffs',
    image: '/images/category_bracelets.jpg',
    count: 2
  },
  {
    id: 'necklaces',
    name: 'Necklaces',
    tagline: 'Artisan pendants & delicate double chains',
    image: '/images/category_necklaces.jpg',
    count: 2
  },
  {
    id: 'earrings',
    name: 'Earrings',
    tagline: 'Modern huggie hoops & cascading drops',
    image: '/images/category_earrings.jpg',
    count: 1
  }
];
