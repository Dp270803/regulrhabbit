import levelsData from '../data/levels.json';

export function getStreakMultiplier(streakCount) {
  if (streakCount >= 30) return 1.0;
  if (streakCount >= 14) return 0.5;
  if (streakCount >= 7) return 0.25;
  if (streakCount >= 3) return 0.1;
  return 0;
}

export function calculateSessionXP(streakCount, isBonus = false, isComeback = false) {
  const baseXP = isBonus ? 50 : 100;
  const multiplier = getStreakMultiplier(streakCount);
  const streakBonus = Math.round(baseXP * multiplier);
  const comebackBonus = isComeback ? 75 : 0;

  return {
    base: baseXP,
    streakBonus,
    comebackBonus,
    total: baseXP + streakBonus + comebackBonus,
  };
}

export function calculatePerfectWeekBonus() {
  return 150;
}

export function getLevelFromXP(totalXP) {
  const levels = levelsData.levels;
  let currentLevel = levels[0];
  for (const level of levels) {
    if (totalXP >= level.xp_required) {
      currentLevel = level;
    } else {
      break;
    }
  }
  return currentLevel;
}

export function getXPToNextLevel(totalXP) {
  const levels = levelsData.levels;
  const currentLevel = getLevelFromXP(totalXP);
  const nextLevel = levels.find(l => l.level === currentLevel.level + 1);
  if (!nextLevel) return { needed: 0, progress: 1, nextLevel: null };

  const xpIntoLevel = totalXP - currentLevel.xp_required;
  const xpForLevel = nextLevel.xp_required - currentLevel.xp_required;

  return {
    needed: nextLevel.xp_required - totalXP,
    progress: xpIntoLevel / xpForLevel,
    nextLevel,
  };
}

export function checkLevelUp(oldXP, newXP) {
  const oldLevel = getLevelFromXP(oldXP);
  const newLevel = getLevelFromXP(newXP);
  if (newLevel.level > oldLevel.level) {
    return newLevel;
  }
  return null;
}
