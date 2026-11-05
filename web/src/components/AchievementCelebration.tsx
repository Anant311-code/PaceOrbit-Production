
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  CalendarCheck,
  Check,
  Compass,
  Crown,
  Flame,
  Footprints,
  Medal,
  Sparkles,
  Sunrise,
  Trophy,
  Zap,
  X,
} from "lucide-react";
import "./AchievementCelebration.css";

export interface UnlockedAchievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  points: number;
}

interface Props {
  achievements: UnlockedAchievement[];
  onClose: () => void;
}

const iconMap: Record<string, typeof Award> = {
  footprints: Footprints,
  medal: Medal,
  compass: Compass,
  award: Award,
  trophy: Trophy,
  crown: Crown,
  flame: Flame,
  "calendar-check": CalendarCheck,
  zap: Zap,
  sunrise: Sunrise,
};

const confettiPieces = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  delay: `${(index % 7) * 0.08}s`,
  duration: `${1.8 + (index % 5) * 0.25}s`,
  rotation: `${index * 47}deg`,
}));

export default function AchievementCelebration({
  achievements,
  onClose,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const achievement = achievements[activeIndex];

  useEffect(() => {
    setActiveIndex(0);
  }, [achievements]);

  useEffect(() => {
    if (!achievement) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [achievement, onClose]);

  if (!achievement) return null;

  const Icon = iconMap[achievement.icon] ?? Trophy;
  const hasMore = activeIndex < achievements.length - 1;

  const handleContinue = () => {
    if (hasMore) {
      setActiveIndex((index) => index + 1);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="achievement-celebration-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.div
          className="achievement-confetti"
          aria-hidden="true"
        >
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                transform: `rotate(${piece.rotation})`,
              }}
            />
          ))}
        </motion.div>

        <motion.section
          key={achievement.id}
          className="achievement-celebration-modal"
          initial={{ opacity: 0, y: 35, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="achievement-celebration-title"
        >
          <button
            className="achievement-celebration-close"
            onClick={onClose}
            aria-label="Close celebration"
          >
            <X size={19} />
          </button>

          <div className="celebration-overline">
            <Sparkles size={14} />
            MILESTONE UNLOCKED
            <Sparkles size={14} />
          </div>

          <div className="celebration-medal-stage">
            <motion.div
              className="celebration-ring celebration-ring-one"
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="celebration-ring celebration-ring-two"
              animate={{ rotate: -360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            />

            <motion.div
              className="celebration-medal"
              initial={{ scale: 0, rotate: -35 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: 0.15,
                type: "spring",
                stiffness: 180,
                damping: 12,
              }}
            >
              <Icon size={57} strokeWidth={1.5} />
            </motion.div>

            <motion.div
              className="celebration-sparkle sparkle-left"
              animate={{ scale: [0.7, 1.2, 0.7], rotate: [0, 20, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles size={22} />
            </motion.div>

            <motion.div
              className="celebration-sparkle sparkle-right"
              animate={{ scale: [1, 0.7, 1], rotate: [0, -20, 0] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            >
              <Sparkles size={18} />
            </motion.div>
          </div>

          <motion.div
            className="celebration-copy"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <span className="celebration-congratulations">
              Outstanding work!
            </span>

            <h2 id="achievement-celebration-title">
              {achievement.name}
            </h2>

            <p>{achievement.description}</p>
          </motion.div>

          <motion.div
            className="celebration-points"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="celebration-points-icon">
              <Trophy size={19} />
            </div>
            <div>
              <strong>+{achievement.points} points</strong>
              <span>Added to your achievement collection</span>
            </div>
            <Check size={19} className="celebration-points-check" />
          </motion.div>

          {achievements.length > 1 && (
            <div className="celebration-pagination">
              {achievements.map((item, index) => (
                <span
                  key={item.id}
                  className={index === activeIndex ? "active" : ""}
                />
              ))}
            </div>
          )}

          <button
            className="celebration-continue"
            onClick={handleContinue}
          >
            {hasMore ? "Next achievement" : "Keep moving"}
            <Sparkles size={16} />
          </button>

          <div className="celebration-brand">
            PACEORBIT · EVERY MOVE HAS A STORY
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
