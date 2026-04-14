import { addDays, getDayName } from './dateUtils.js';
import muscleLadder from '../data/muscle-ladder.json';

// ─── Session block content per split type ────────────────────────────────────

const BLOCKS = {
  // Full Body — standard (60–90 min)
  'FB-A': {
    title: 'Full Body A',
    blocks: [
      { type: 'warmup', detail: '5–8 min: row or bike + bodyweight squats, band pull-aparts, hip circles', duration_minutes: 8 },
      { type: 'main', detail: 'Squat pattern 4×8 | Horizontal push (bench press) 3×10 | Horizontal pull (barbell row) 3×10 | Romanian deadlift 3×10 | Shoulder press 3×12', duration_minutes: 47 },
      { type: 'cooldown', detail: 'Foam roll quads, lats | Static: hip flexors, chest, hamstrings — 30s each', duration_minutes: 8 },
    ],
  },
  'FB-B': {
    title: 'Full Body B',
    blocks: [
      { type: 'warmup', detail: '5–8 min: light cardio + hip mobility, shoulder circles, cat-cow', duration_minutes: 8 },
      { type: 'main', detail: 'Deadlift 4×6 | Incline press 3×10 | Lat pulldown / pull-up 3×10 | Split squat / lunge 3×10 each | Lateral raise 3×15', duration_minutes: 47 },
      { type: 'cooldown', detail: 'Foam roll thoracic spine, glutes | Static: shoulder, quad, lat — 30s each', duration_minutes: 8 },
    ],
  },
  'FB-C': {
    title: 'Full Body C',
    blocks: [
      { type: 'warmup', detail: '5–8 min: treadmill walk + band activations (clamshell, glute bridge)', duration_minutes: 8 },
      { type: 'main', detail: 'Front squat / hack squat 4×8 | Close-grip bench / dip 3×10 | Cable row / chest-supported row 3×12 | Hip thrust 3×15 | Face pull 3×15 | Bicep curl 3×12', duration_minutes: 47 },
      { type: 'cooldown', detail: 'Static stretch: full lower body and upper back — 30s each position', duration_minutes: 8 },
    ],
  },
  'FB-D': {
    title: 'Full Body D',
    blocks: [
      { type: 'warmup', detail: '5–8 min: row machine + dynamic leg swings, arm swings, 90/90 hip stretch', duration_minutes: 8 },
      { type: 'main', detail: 'Leg press 4×10 | DB bench press 3×12 | Seated row / one-arm row 3×12 | Leg curl 3×10 | Seated DB overhead press 3×12 | Tricep pushdown 3×12', duration_minutes: 47 },
      { type: 'cooldown', detail: 'Foam roll and stretch — focus on areas that feel tight today', duration_minutes: 8 },
    ],
  },
  'FB-E': {
    title: 'Full Body E',
    blocks: [
      { type: 'warmup', detail: '5–8 min general warm-up + 2×10 goblet squat, band pull-apart', duration_minutes: 8 },
      { type: 'main', detail: 'Back squat 3×8 | Bench press 3×10 | Pull-up / lat pulldown 3×10 | RDL 3×10 | Lateral raise 3×15 | Core: plank 3×45s', duration_minutes: 47 },
      { type: 'cooldown', detail: '10 min full-body stretch and breathing work', duration_minutes: 8 },
    ],
  },
  // Full Body — time-efficient (45–60 min)
  'FB-TE-A': {
    title: 'Full Body A',
    blocks: [
      { type: 'warmup', detail: '3–5 min: jump rope or quick cardio + 1 set mobility drill', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Goblet squat 3×10 + DB row 3×12 | Superset 2: DB bench press 3×10 + DB RDL 3×10 | Superset 3: DB shoulder press 3×12 + Bicep curl 3×12', duration_minutes: 40 },
      { type: 'cooldown', detail: 'Quick stretch: 3 key areas, 20s each', duration_minutes: 5 },
    ],
  },
  'FB-TE-B': {
    title: 'Full Body B',
    blocks: [
      { type: 'warmup', detail: '3–5 min: row machine + quick activation circuit', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Deadlift 3×6 + Incline press 3×12 | Superset 2: Lat pulldown 3×10 + Reverse lunge 3×10 each | Superset 3: Lateral raise 3×15 + Tricep extension 3×12', duration_minutes: 40 },
      { type: 'cooldown', detail: 'Quick stretch and cool down', duration_minutes: 5 },
    ],
  },
  'FB-TE-C': {
    title: 'Full Body C',
    blocks: [
      { type: 'warmup', detail: '3–5 min + mobility sequence', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Leg press 3×12 + Cable row 3×12 | Superset 2: DB incline press 3×10 + DB RDL 3×10 | Superset 3: Face pull 3×15 + Curl 3×12', duration_minutes: 40 },
      { type: 'cooldown', detail: 'Quick stretch and cool down', duration_minutes: 5 },
    ],
  },
  'FB-TE-D': {
    title: 'Full Body D',
    blocks: [
      { type: 'warmup', detail: '3–5 min warm-up', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Squat 3×10 + Bench press 3×10 | Superset 2: Pull-up 3×8 + Hip thrust 3×12 | Superset 3: Shoulder press 3×12 + Tricep ext 3×12', duration_minutes: 40 },
      { type: 'cooldown', detail: '5 min cool down', duration_minutes: 5 },
    ],
  },
  'FB-TE-E': {
    title: 'Full Body E',
    blocks: [
      { type: 'warmup', detail: '3–5 min warm-up', duration_minutes: 5 },
      { type: 'main', detail: 'Circuit: Goblet squat + DB press + DB row + RDL + Lateral raise — 3 rounds × 12 reps each', duration_minutes: 40 },
      { type: 'cooldown', detail: '5 min cool down', duration_minutes: 5 },
    ],
  },
  // Upper / Lower — standard (60–90 min)
  'UL-UA': {
    title: 'Upper Body A',
    blocks: [
      { type: 'warmup', detail: 'Band pull-aparts 2×15, arm circles, 2 light sets bench press', duration_minutes: 8 },
      { type: 'main', detail: 'Flat bench press 4×8 | Barbell / DB row 4×8 | Overhead press 3×10 | Lat pulldown 3×10 | Incline DB fly 3×12 | Face pull 3×15 | Bicep curl 3×12 | Tricep pushdown 3×12', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Chest, shoulder, lat stretch — 30s each', duration_minutes: 8 },
    ],
  },
  'UL-LA': {
    title: 'Lower Body A',
    blocks: [
      { type: 'warmup', detail: 'Hip circles, glute bridges 2×10, 2 light sets goblet squat', duration_minutes: 8 },
      { type: 'main', detail: 'Back squat 4×8 | Romanian deadlift 4×8 | Leg press 3×12 | Leg curl (lying/seated) 3×12 | Walking lunges 3×10 each leg | Calf raise 4×15', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Quad, hip flexor, hamstring stretch — 30s each', duration_minutes: 8 },
    ],
  },
  'UL-UB': {
    title: 'Upper Body B',
    blocks: [
      { type: 'warmup', detail: 'Scapular movements, 2 warm-up sets', duration_minutes: 8 },
      { type: 'main', detail: 'Incline bench press 4×8 | Cable / chest-supported row 4×8 | DB shoulder press 3×10 | Pull-up / assisted pull-up 3×8 | Cable fly 3×12 | Rear delt fly 3×15 | Hammer curl 3×12 | Skullcrusher 3×12', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Upper body stretch — shoulders, triceps, chest', duration_minutes: 8 },
    ],
  },
  'UL-LB': {
    title: 'Lower Body B',
    blocks: [
      { type: 'warmup', detail: 'Hip mobility, 2 warm-up sets', duration_minutes: 8 },
      { type: 'main', detail: 'Conventional deadlift 4×5 | Hack squat / leg press 3×12 | Nordic curl / lying leg curl 3×10 | Hip thrust 3×12 | Bulgarian split squat 3×10 each | Seated calf raise 4×15', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Lower body stretch — quads, hamstrings, glutes, calves', duration_minutes: 8 },
    ],
  },
  'UL-UC': {
    title: 'Upper Body C',
    blocks: [
      { type: 'warmup', detail: '5 min warm-up + shoulder activation', duration_minutes: 8 },
      { type: 'main', detail: 'DB bench press 4×10 | Barbell row 4×10 | Arnold press 3×12 | Lat pulldown 3×12 | Pec deck / cable fly 3×15 | Face pull 3×15 | Preacher curl 3×12 | Close-grip bench 3×12', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Upper body stretch', duration_minutes: 8 },
    ],
  },
  'UL-LC': {
    title: 'Lower Body C',
    blocks: [
      { type: 'warmup', detail: '5 min warm-up + hip activation', duration_minutes: 8 },
      { type: 'main', detail: 'Front squat / goblet squat 4×10 | RDL 4×10 | Leg extension 3×15 | Leg curl 3×15 | Step-ups 3×12 each | Donkey calf raise 4×15', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Lower body stretch', duration_minutes: 8 },
    ],
  },
  // Upper / Lower — time-efficient (45–60 min)
  'UL-TE-UA': {
    title: 'Upper Body A',
    blocks: [
      { type: 'warmup', detail: '3–5 min + band activation', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Bench press 4×8 + Cable row 4×8 | Superset 2: Shoulder press 3×10 + Lat pulldown 3×10 | Superset 3: Lateral raise 3×15 + Bicep curl 3×12', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min upper body stretch', duration_minutes: 5 },
    ],
  },
  'UL-TE-LA': {
    title: 'Lower Body A',
    blocks: [
      { type: 'warmup', detail: '3–5 min + glute activation', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Squat 4×8 + Leg curl 3×12 | Superset 2: RDL 4×8 + Leg press 3×12 | Calf raise 3×15', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min lower body stretch', duration_minutes: 5 },
    ],
  },
  'UL-TE-UB': {
    title: 'Upper Body B',
    blocks: [
      { type: 'warmup', detail: '3–5 min + shoulder mobility', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Incline press 4×8 + DB row 4×8 | Superset 2: DB shoulder press 3×10 + Pull-up 3×8 | Superset 3: Face pull 3×15 + Tricep ext 3×12', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
  'UL-TE-LB': {
    title: 'Lower Body B',
    blocks: [
      { type: 'warmup', detail: '3–5 min + hip activation', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Deadlift 4×5 + Hack squat 3×12 | Superset 2: Hip thrust 3×12 + Nordic curl 3×10 | Calf raise 3×15', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
  'UL-TE-UC': {
    title: 'Upper Body C',
    blocks: [
      { type: 'warmup', detail: '3–5 min warm-up', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: DB bench 3×10 + Row 3×10 | Superset 2: Arnold press 3×12 + Lat pulldown 3×12 | Curl 3×12', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
  'UL-TE-LC': {
    title: 'Lower Body C',
    blocks: [
      { type: 'warmup', detail: '3–5 min warm-up', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Front squat 3×10 + Leg curl 3×12 | Superset 2: RDL 3×10 + Leg extension 3×15 | Calf raise 3×15', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
  // Push / Pull / Legs — standard (60–90 min)
  'PPL-PA': {
    title: 'Push Day A',
    blocks: [
      { type: 'warmup', detail: 'Shoulder warm-up: arm circles, band pull-aparts, 2 light sets bench', duration_minutes: 8 },
      { type: 'main', detail: 'Flat bench press 4×8 | Overhead press 4×8 | Incline DB press 3×12 | Cable / DB lateral raise 3×15 | Tricep pushdown 3×12 | Overhead tricep extension 3×12', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Chest + shoulder stretch — 30s each', duration_minutes: 8 },
    ],
  },
  'PPL-PLA': {
    title: 'Pull Day A',
    blocks: [
      { type: 'warmup', detail: 'Scapular pull-ups 2×8, band pull-aparts 2×15', duration_minutes: 8 },
      { type: 'main', detail: 'Barbell row / deadlift 4×6–8 | Lat pulldown / pull-up 4×8 | Seated cable row 3×12 | Face pull 3×15 | Incline DB curl 3×12 | Hammer curl 3×12', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Lat, bicep, rear delt stretch — 30s each', duration_minutes: 8 },
    ],
  },
  'PPL-LA': {
    title: 'Legs Day A',
    blocks: [
      { type: 'warmup', detail: 'Hip circles, glute bridges, 2 light squat sets', duration_minutes: 8 },
      { type: 'main', detail: 'Back squat 4×8 | Romanian deadlift 4×8 | Leg press 3×12 | Leg curl 3×12 | Walking lunge 3×10 each | Calf raise 4×15', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Quad, hamstring, glute, calf stretch — 30s each', duration_minutes: 8 },
    ],
  },
  'PPL-PB': {
    title: 'Push Day B',
    blocks: [
      { type: 'warmup', detail: 'Shoulder warm-up, 2 light sets incline', duration_minutes: 8 },
      { type: 'main', detail: 'Incline bench press 4×8 | DB shoulder press 4×10 | Cable fly 3×15 | Machine shoulder press / arnold press 3×12 | Tricep dip / close-grip bench 3×10 | Lateral raise 3×15', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Chest, shoulder, tricep stretch', duration_minutes: 8 },
    ],
  },
  'PPL-PLB': {
    title: 'Pull Day B',
    blocks: [
      { type: 'warmup', detail: 'Light warm-up, scapular activation', duration_minutes: 8 },
      { type: 'main', detail: 'Chest-supported row / cable row 4×10 | Pull-up / lat pulldown 4×8 | Single-arm DB row 3×12 | Rear delt fly 3×15 | Barbell / EZ-bar curl 3×10 | Cable curl 3×12', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Back, bicep, rear delt stretch', duration_minutes: 8 },
    ],
  },
  'PPL-LB': {
    title: 'Legs Day B',
    blocks: [
      { type: 'warmup', detail: 'Hip and knee mobility, glute activation', duration_minutes: 8 },
      { type: 'main', detail: 'Conventional / sumo deadlift 4×5 | Hack squat / leg press 4×10 | Nordic curl / lying leg curl 3×10 | Hip thrust 3×15 | Bulgarian split squat 3×10 each | Seated calf raise 4×15', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Full lower body stretch', duration_minutes: 8 },
    ],
  },
  // Push / Pull / Legs — time-efficient (45–60 min)
  'PPL-TE-PA': {
    title: 'Push Day A',
    blocks: [
      { type: 'warmup', detail: '3–5 min + shoulder activation', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Bench press 4×8 + Lateral raise 3×15 | Superset 2: Overhead press 3×10 + Tricep pushdown 3×12 | Incline DB press 3×12', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
  'PPL-TE-PLA': {
    title: 'Pull Day A',
    blocks: [
      { type: 'warmup', detail: '3–5 min + scapular activation', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Pull-up 4×8 + Face pull 3×15 | Superset 2: Cable row 3×12 + DB curl 3×12 | Barbell row 4×8', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
  'PPL-TE-LA': {
    title: 'Legs Day A',
    blocks: [
      { type: 'warmup', detail: '3–5 min + hip activation', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Squat 4×8 + Leg curl 3×12 | Superset 2: RDL 4×8 + Leg press 3×12 | Calf raise 3×15', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
  'PPL-TE-PB': {
    title: 'Push Day B',
    blocks: [
      { type: 'warmup', detail: '3–5 min warm-up', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Incline press 3×10 + Arnold press 3×12 | Superset 2: DB fly 3×15 + Tricep ext 3×12 | Lateral raise 3×15', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
  'PPL-TE-PLB': {
    title: 'Pull Day B',
    blocks: [
      { type: 'warmup', detail: '3–5 min warm-up', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Lat pulldown 3×10 + Rear delt fly 3×15 | Superset 2: Seated row 3×12 + Hammer curl 3×12 | Single-arm row 3×12', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
  'PPL-TE-LB': {
    title: 'Legs Day B',
    blocks: [
      { type: 'warmup', detail: '3–5 min warm-up', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Deadlift 4×5 + Hack squat 3×12 | Superset 2: Hip thrust 3×12 + Nordic curl 3×10 | Calf raise 3×15', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
  // Hybrid Upper/Lower + PPL — standard (60–90 min)
  'HY-UA': {
    title: 'Upper Body A',
    blocks: [
      { type: 'warmup', detail: 'Band pull-aparts 2×15, 2 warm-up sets', duration_minutes: 8 },
      { type: 'main', detail: 'Flat bench press 4×8 | Barbell row 4×8 | Overhead press 3×10 | Lat pulldown 3×10 | Lateral raise 3×15 | Bicep curl 3×12', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Upper body stretch', duration_minutes: 8 },
    ],
  },
  'HY-LA': {
    title: 'Lower Body A',
    blocks: [
      { type: 'warmup', detail: 'Hip mobility, 2 warm-up sets squat', duration_minutes: 8 },
      { type: 'main', detail: 'Back squat 4×8 | Romanian deadlift 4×8 | Leg press 3×12 | Leg curl 3×12 | Calf raise 4×15', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Lower body stretch', duration_minutes: 8 },
    ],
  },
  'HY-P': {
    title: 'Push Day',
    blocks: [
      { type: 'warmup', detail: 'Shoulder warm-up, 2 light sets bench', duration_minutes: 8 },
      { type: 'main', detail: 'Incline bench press 4×8 | DB shoulder press 3×10 | Cable fly 3×12 | Arnold press 3×12 | Tricep pushdown 3×12 | Lateral raise 3×15', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Chest and shoulder stretch', duration_minutes: 8 },
    ],
  },
  'HY-PL': {
    title: 'Pull Day',
    blocks: [
      { type: 'warmup', detail: 'Scapular activation, light rows', duration_minutes: 8 },
      { type: 'main', detail: 'Deadlift 4×5 | Pull-up / lat pulldown 4×8 | Cable row 3×12 | Face pull 3×15 | Hammer curl 3×12 | Incline DB curl 3×12', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Back and bicep stretch', duration_minutes: 8 },
    ],
  },
  'HY-L': {
    title: 'Legs Day',
    blocks: [
      { type: 'warmup', detail: 'Hip and knee activation', duration_minutes: 8 },
      { type: 'main', detail: 'Hack squat / leg press 4×10 | Nordic curl 3×10 | Hip thrust 3×12 | Split squat 3×10 each | Leg extension 3×15 | Seated calf raise 4×15', duration_minutes: 54 },
      { type: 'cooldown', detail: 'Full lower body stretch', duration_minutes: 8 },
    ],
  },
  // Hybrid — time-efficient (45–60 min)
  'HY-TE-UA': {
    title: 'Upper Body A',
    blocks: [
      { type: 'warmup', detail: '3–5 min + band activation', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Bench press 4×8 + Row 4×8 | Superset 2: Shoulder press 3×10 + Lat pulldown 3×10 | Lateral raise 3×15', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
  'HY-TE-LA': {
    title: 'Lower Body A',
    blocks: [
      { type: 'warmup', detail: '3–5 min + glute activation', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Squat 4×8 + Leg curl 3×12 | Superset 2: RDL 4×8 + Leg press 3×12 | Calf raise 3×15', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
  'HY-TE-P': {
    title: 'Push Day',
    blocks: [
      { type: 'warmup', detail: '3–5 min + shoulder warm-up', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Incline press 3×10 + Shoulder press 3×12 | Superset 2: Cable fly 3×15 + Tricep ext 3×12 | Lateral raise 3×15', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
  'HY-TE-PL': {
    title: 'Pull Day',
    blocks: [
      { type: 'warmup', detail: '3–5 min + scapular activation', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Pull-up 4×8 + Face pull 3×15 | Superset 2: Cable row 3×12 + Curl 3×12 | Single-arm row 3×12', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
  'HY-TE-L': {
    title: 'Legs Day',
    blocks: [
      { type: 'warmup', detail: '3–5 min + hip activation', duration_minutes: 5 },
      { type: 'main', detail: 'Superset 1: Leg press 4×10 + Leg curl 3×12 | Superset 2: Hip thrust 3×12 + Split squat 3×10 each | Calf raise 3×15', duration_minutes: 45 },
      { type: 'cooldown', detail: '5 min stretch', duration_minutes: 5 },
    ],
  },
};

// ─── Map program to session rotation keys ────────────────────────────────────

function getSessionRotationKeys(split, daysPerWeek, isTE) {
  const prefix = isTE;
  if (split === 'Full Body') {
    const keys = ['FB-A', 'FB-B', 'FB-C', 'FB-D', 'FB-E'];
    const teKeys = ['FB-TE-A', 'FB-TE-B', 'FB-TE-C', 'FB-TE-D', 'FB-TE-E'];
    const pool = isTE ? teKeys : keys;
    return pool.slice(0, Math.min(daysPerWeek, 5));
  }
  if (split === 'Upper / Lower') {
    const full = ['UL-UA', 'UL-LA', 'UL-UB', 'UL-LB', 'UL-UC', 'UL-LC'];
    const te   = ['UL-TE-UA', 'UL-TE-LA', 'UL-TE-UB', 'UL-TE-LB', 'UL-TE-UC', 'UL-TE-LC'];
    return (isTE ? te : full).slice(0, Math.min(daysPerWeek, 6));
  }
  if (split === 'Push / Pull / Legs') {
    const full = ['PPL-PA', 'PPL-PLA', 'PPL-LA', 'PPL-PB', 'PPL-PLB', 'PPL-LB'];
    const te   = ['PPL-TE-PA', 'PPL-TE-PLA', 'PPL-TE-LA', 'PPL-TE-PB', 'PPL-TE-PLB', 'PPL-TE-LB'];
    return (isTE ? te : full);
  }
  if (split === 'Hybrid (Upper/Lower + PPL)') {
    const full = ['HY-UA', 'HY-LA', 'HY-P', 'HY-PL', 'HY-L'];
    const te   = ['HY-TE-UA', 'HY-TE-LA', 'HY-TE-P', 'HY-TE-PL', 'HY-TE-L'];
    return (isTE ? te : full);
  }
  // Fallback: full body
  const fallback = isTE ? ['FB-TE-A', 'FB-TE-B', 'FB-TE-C'] : ['FB-A', 'FB-B', 'FB-C'];
  return fallback.slice(0, daysPerWeek);
}

// ─── Decision logic ───────────────────────────────────────────────────────────

function findDecisionEntry(level, days, durationKey, equipment) {
  const durationStr = durationKey === '45-60' ? '45\u201360 min' : '60\u201390 min';
  const entries = muscleLadder.decision_map.entries;

  // 1. Exact match (level exact or 'Any', equipment in list)
  let entry = entries.find(e =>
    (e.level === level || e.level === 'Any') &&
    e.days === days &&
    e.duration === durationStr &&
    e.equipment.includes(equipment)
  );
  if (entry) return entry;

  // 2. Equipment fallback — try 'Dumbbells only' as proxy for 'Bodyweight'
  if (equipment === 'Bodyweight') {
    entry = entries.find(e =>
      (e.level === level || e.level === 'Any') &&
      e.days === days &&
      e.duration === durationStr &&
      e.equipment.includes('Dumbbells only')
    );
    if (entry) return entry;
  }

  // 3. Equipment fallback — limited equipment at high days (5-6 day programs require Full gym)
  if (equipment !== 'Full gym' && days >= 5) {
    entry = entries.find(e =>
      (e.level === level || e.level === 'Any') &&
      e.days === days &&
      e.duration === durationStr &&
      e.equipment.includes('Full gym')
    );
    if (entry) return entry;
  }

  // 4. Level fallback — Beginner at 5 days not in map, use Intermediate
  if (level === 'Beginner') {
    entry = entries.find(e =>
      e.level === 'Intermediate' &&
      e.days === days &&
      e.duration === durationStr &&
      e.equipment.includes(equipment === 'Bodyweight' ? 'Dumbbells only' : equipment)
    );
    if (entry) return entry;
  }

  // 5. Step down days by 1 and retry
  if (days > 2) {
    return findDecisionEntry(level, days - 1, durationKey, equipment);
  }

  return null;
}

function resolveTie(recommended, splitPreference) {
  if (!splitPreference || splitPreference === 'none') {
    return recommended[0];
  }

  const splitToKey = {
    'Full Body': 'Q5A_Full_Body',
    'Upper / Lower': 'Q5B_Upper_Lower',
    'Push / Pull / Legs': 'Q5C_PPL',
    'Hybrid (Upper/Lower + PPL)': 'Q5D_Hybrid',
  };
  const key = splitToKey[splitPreference];
  if (!key) return recommended[0];

  const ties = muscleLadder.questions[4].how_it_resolves_ties.ties;
  const tie = ties.find(t =>
    t.tied_programs.length === recommended.length &&
    recommended.every(p => t.tied_programs.includes(p))
  );

  if (tie && typeof tie[key] === 'number') return tie[key];
  return recommended[0];
}

// ─── Public: select program ───────────────────────────────────────────────────

export function selectNippardProgram(answers) {
  const { gym_goal, experience_level, frequency, equipment, split_preference } = answers;
  if (!experience_level || !frequency || !equipment) return null;

  const isTE = gym_goal === 'build_efficient';
  const durationKey = isTE ? '45-60' : '60-90';
  const normEquipment = equipment === 'Bodyweight' ? 'Bodyweight' : equipment;

  const entry = findDecisionEntry(experience_level, Number(frequency), durationKey, normEquipment);
  if (!entry) return null;

  const programNum = entry.recommended.length === 1
    ? entry.recommended[0]
    : resolveTie(entry.recommended, split_preference);

  const program = muscleLadder.programs.find(p => p.number === programNum);
  return program || null;
}

// ─── Week builder ─────────────────────────────────────────────────────────────

function sortScheduledDays(days) {
  const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function getDayOffset(dayName) {
  const offsets = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
  return offsets[dayName] ?? 0;
}

function buildWeeks(program, scheduledDays, startDate) {
  const NUM_WEEKS = 4;
  const isTE = program.session_duration.includes('45');
  const rotationKeys = getSessionRotationKeys(program.split, scheduledDays.length, isTE);
  const durationMinutes = isTE ? 50 : 75;

  let rotationIndex = 0;
  const weeks = [];

  for (let weekNum = 1; weekNum <= NUM_WEEKS; weekNum++) {
    const weekStartDate = addDays(startDate, (weekNum - 1) * 7);
    const sessions = [];

    for (const dayName of scheduledDays) {
      const dayOffset = getDayOffset(dayName);
      const sessionDate = addDays(weekStartDate, dayOffset);
      const blockKey = rotationKeys[rotationIndex % rotationKeys.length];
      rotationIndex++;

      const template = BLOCKS[blockKey];
      if (!template) continue;

      sessions.push({
        id: `session_w${weekNum}_${dayName.slice(0, 3)}`,
        day: dayName,
        date: sessionDate,
        title: template.title,
        duration_minutes: durationMinutes,
        type: 'scheduled',
        blocks: template.blocks,
        status: 'upcoming',
        completed_at: null,
      });
    }

    weeks.push({ week_number: weekNum, sessions });
  }

  return weeks;
}

// ─── Public: generate plan ────────────────────────────────────────────────────

export async function generatePlan(answers) {
  const {
    activity = 'gym',
    gym_goal,
    experience_level,
    frequency,
    scheduled_days,
    equipment,
    split_preference,
    training_style,
  } = answers;

  const program = selectNippardProgram(answers);
  if (!program) throw new Error('Could not select a program for the given answers.');

  const sortedDays = sortScheduledDays(scheduled_days);
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilNextMonday = ((8 - dayOfWeek) % 7) || 7;
  const startDate = addDays(
    today.toISOString().split('T')[0],
    dayOfWeek === 1 ? 0 : daysUntilNextMonday
  );

  const weeks = buildWeeks(program, sortedDays, startDate);

  return {
    id: `plan_${Date.now()}`,
    activity,
    program_number: program.number,
    program_name: program.name,
    split: program.split,
    experience_level,
    frequency: sortedDays.length,
    session_duration: program.session_duration,
    scheduled_days: sortedDays,
    equipment: equipment || 'Full gym',
    gym_goal: gym_goal || null,
    split_preference: split_preference || 'none',
    persona: training_style || 'follower',
    start_date: startDate,
    current_week: 1,
    status: 'active',
    weeks,
  };
}

// ─── Utility exports ──────────────────────────────────────────────────────────

export function getTodaySession(plan) {
  if (!plan) return null;
  const today = new Date().toISOString().split('T')[0];
  const todayDay = getDayName(today);

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.date === today) return { session, weekNumber: week.week_number };
      if (session.date <= today && session.day === todayDay && session.status !== 'completed') {
        return { session, weekNumber: week.week_number };
      }
    }
  }
  return null;
}

export function isRestDay(plan) {
  if (!plan) return false;
  const todayDay = getDayName(new Date().toISOString().split('T')[0]);
  return !plan.scheduled_days.includes(todayDay);
}
