import badgesData from '../data/badges.json';

export function checkBadges(data) {
  const newBadges = [];
  const earnedIds = new Set(data.badges.filter(b => b.earned).map(b => b.id));
  const allBadges = badgesData.badges;
  const activePlan = data.plans.find(p => p.status === 'active');
  const activity = activePlan?.activity;
  const now = new Date().toISOString();
  const totalSessions = data.check_ins.filter(c => c.completed).length;
  const streak = data.streaks.current;

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;

    if (badge.activity_specific && badge.activity_specific !== activity) continue;

    let earned = false;

    switch (badge.condition) {
      case 'first_session':
        earned = totalSessions >= 1;
        break;
      case 'first_activity_session':
        earned = data.check_ins.some(c => c.completed && data.plans.find(p => p.id === c.plan_id)?.activity === badge.activity_specific);
        break;
      case 'streak_3':
        earned = streak >= 3;
        break;
      case 'streak_7':
        earned = streak >= 7;
        break;
      case 'streak_14':
        earned = streak >= 14;
        break;
      case 'streak_30':
        earned = streak >= 30;
        break;
      case 'streak_60':
        earned = streak >= 60;
        break;
      case 'streak_100':
        earned = streak >= 100;
        break;
      case 'comeback': {
        const consecutiveMisses = data.streaks.consecutive_misses;
        earned = consecutiveMisses > 0 && totalSessions > 0;
        break;
      }
      case 'comeback_3x': {
        const comebackCount = data.check_ins.filter(c => c.bonus_xp && c.bonus_xp > 0).length;
        earned = comebackCount >= 3;
        break;
      }
      case 'level_7':
        earned = data.user.level >= 7;
        break;
      case 'level_9':
        earned = data.user.level >= 9;
        break;
      case 'level_10':
        earned = data.user.level >= 10;
        break;
      case 'early_bird_5': {
        const earlyCount = data.check_ins.filter(c => {
          if (!c.completed || !c.completed_at) return false;
          const hour = new Date(c.completed_at).getHours();
          return hour < 8;
        }).length;
        earned = earlyCount >= 5;
        break;
      }
      case 'night_owl_5': {
        const nightCount = data.check_ins.filter(c => {
          if (!c.completed || !c.completed_at) return false;
          const hour = new Date(c.completed_at).getHours();
          return hour >= 20;
        }).length;
        earned = nightCount >= 5;
        break;
      }
      case 'bonus_3': {
        const bonusCount = data.check_ins.filter(c => c.is_bonus).length;
        earned = bonusCount >= 3;
        break;
      }
      case 'activity_sessions_50': {
        const activitySessions = data.check_ins.filter(c => {
          const plan = data.plans.find(p => p.id === c.plan_id);
          return c.completed && plan?.activity === badge.activity_specific;
        }).length;
        earned = activitySessions >= 50;
        break;
      }
      case 'perfect_month':
        earned = checkPerfectMonth(data);
        break;
      default:
        break;
    }

    if (earned) {
      newBadges.push({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        earned: true,
        earned_at: now,
      });
    }
  }

  return newBadges;
}

function checkPerfectMonth(data) {
  const activePlan = data.plans.find(p => p.status === 'active');
  if (!activePlan) return false;

  let perfectWeeks = 0;
  for (const week of activePlan.weeks) {
    const allCompleted = week.sessions.every(s =>
      s.type !== 'scheduled' || s.status === 'completed'
    );
    if (allCompleted && week.sessions.some(s => s.type === 'scheduled')) {
      perfectWeeks++;
    } else {
      perfectWeeks = 0;
    }
  }
  return perfectWeeks >= 4;
}

export function getBadgeDefinition(badgeId) {
  return badgesData.badges.find(b => b.id === badgeId);
}

export function getAllBadges(data) {
  const earnedMap = new Map(data.badges.map(b => [b.id, b]));

  return badgesData.badges.map(badge => {
    const earned = earnedMap.get(badge.id);
    return {
      ...badge,
      earned: earned?.earned || false,
      earned_at: earned?.earned_at || null,
    };
  });
}
