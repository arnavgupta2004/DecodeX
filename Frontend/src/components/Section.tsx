import { motion } from "framer-motion";
import { ReactNode } from "react";

export const Section = ({
  id,
  stageNumber,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id: string;
  stageNumber?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <section id={id} className="py-20 md:py-28 relative scroll-mt-20">
    <div className="container max-w-7xl mx-auto px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mb-16"
      >
        <div className="flex items-center gap-4 mb-6">
          {stageNumber && (
            <span className="font-serif text-5xl font-bold text-gold/15">{stageNumber}</span>
          )}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-[1px] bg-gold/40" />
              <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-gold/60">
                {eyebrow}
              </span>
            </div>
            <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight">{title}</h2>
          </div>
        </div>
        {subtitle && (
          <p className="text-foreground/40 max-w-2xl ml-0 md:ml-20 text-base leading-relaxed font-light">
            {subtitle}
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  </section>
);
