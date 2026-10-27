import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { luxeEase } from '../lib/motion';

interface AnimatedModalProps {
  open: boolean;
  onClose: () => void;
  panelStyle?: React.CSSProperties;
  children: React.ReactNode;
}

/** A dimmed backdrop and panel that rise in when opened and fade out before leaving the page. */
export const AnimatedModal: React.FC<AnimatedModalProps> = ({ open, onClose, panelStyle, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        key="modal"
        className="modal-backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          className="modal-panel"
          style={panelStyle}
          onClick={(event) => event.stopPropagation()}
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.35, ease: luxeEase }}
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
