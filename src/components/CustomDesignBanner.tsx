import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Gem, Hammer, PencilLine } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { revealOnScroll } from '../lib/motion';

const STEPS = [
  { icon: PencilLine, label: 'Share Your Idea' },
  { icon: Gem, label: 'We Design' },
  { icon: Hammer, label: 'Handcraft Your Piece' },
];

/**
 * The home page's invitation to the Custom Design page: a ring sketch beside the finished ring. Larger screens set
 * the words over the satin on the left of the photo; phones show the sketch first, with the words underneath.
 */
export const CustomDesignBanner: React.FC = () => {
  const { navigateTo } = useShop();

  return (
    <section className="custom-banner-section" aria-labelledby="custom-banner-heading">
      <div className="container">
        <div className="custom-banner">
          <picture className="custom-banner-photo">
            <source media="(max-width: 768px)" srcSet="/images/custom_design_banner_phone.webp" />
            <img src="/images/custom_design_banner.webp"
              srcSet="/images/custom_design_banner_1200.webp 1200w, /images/custom_design_banner.webp 1671w"
              sizes="(max-width: 1440px) 100vw, 1360px"
              alt="A pencil sketch of a leaf-pattern ring beside the finished silver ring"
              loading="lazy" width={1671} height={941} />
          </picture>

          <motion.div className="custom-banner-content" {...revealOnScroll()}>
            <h2 id="custom-banner-heading" className="custom-banner-title">Custom Design</h2>
            <p className="custom-banner-subtitle">Bring Your Vision to Reality</p>

            <ol className="custom-banner-steps">
              {STEPS.map(({ icon: Icon, label }) => (
                <li key={label} className="custom-banner-step">
                  <Icon className="custom-banner-step-icon" strokeWidth={1.25} aria-hidden="true" />
                  <span>{label}</span>
                </li>
              ))}
            </ol>

            <button type="button" className="custom-banner-cta" onClick={() => navigateTo('custom')}>
              <span>Create a Custom Piece</span>
              <ArrowRight size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
