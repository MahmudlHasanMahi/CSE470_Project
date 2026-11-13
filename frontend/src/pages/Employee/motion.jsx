import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Box, LinearProgress } from "@mui/material";

export const EASE = [0.22, 1, 0.36, 1];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
};

export function Stagger(props) {
  const reduce = useReducedMotion();
  return (
    <Box
      component={motion.div}
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
      {...props}
    />
  );
}

export function useAnimatedNumber(target, { duration = 0.85, delay = 0 } = {}) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) return setValue(target);
    const controls = animate(value, target, {
      duration,
      delay,
      ease: EASE,
      onUpdate: setValue,
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

export function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  delay = 0.15,
}) {
  return <>{format(useAnimatedNumber(value, { delay }))}</>;
}

export function AnimatedProgress({ value, delay = 0.25, ...props }) {
  const v = useAnimatedNumber(Math.min(Math.max(value, 0), 100), {
    delay,
    duration: 0.9,
  });
  return <LinearProgress variant="determinate" value={v} {...props} />;
}

export function GrowWidth({ width, delay = 0.35, ...props }) {
  const reduce = useReducedMotion();
  return (
    <Box
      component={motion.div}
      initial={reduce ? false : { width: 0 }}
      animate={{ width }}
      transition={{ duration: 0.85, delay, ease: EASE }}
      {...props}
    />
  );
}
