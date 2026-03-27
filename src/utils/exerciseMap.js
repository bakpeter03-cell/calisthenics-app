export const EXERCISE_MAP = {
  // PUSH / CHEST
  // CHEST (Push-ups)
  'Push-up': { bucket: 'Chest', isRepBased: true, isHold: false, defaultRestSeconds: 120 },
  'Decline Push-up': { bucket: 'Chest', isRepBased: true, isHold: false, defaultRestSeconds: 120 },
  'Incline Push-up': { bucket: 'Chest', isRepBased: true, isHold: false, defaultRestSeconds: 120 },
  'Archer Push-up': { bucket: 'Chest', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'Pike Push-up': { bucket: 'Chest', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'Elevated Pike Pushup': { bucket: 'Chest', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'Handstand Push-up': { bucket: 'Chest', isRepBased: true, isHold: false, defaultRestSeconds: 180 },

  // ARMS (Chin-ups/Dips)
  'Dip': { bucket: 'Arms', isRepBased: true, isHold: false, defaultRestSeconds: 150, pbTarget: 'Dip' },
  'Straight Bar Dip': { bucket: 'Arms', isRepBased: true, isHold: false, defaultRestSeconds: 150, pbTarget: 'Dip' },
  'Chin-up': { bucket: 'Arms', isRepBased: true, isHold: false, defaultRestSeconds: 150, pbTarget: 'Chin-up' },
  'Chin-ups': { bucket: 'Arms', isRepBased: true, isHold: false, defaultRestSeconds: 150, pbTarget: 'Chin-up' },
  'Chinups': { bucket: 'Arms', isRepBased: true, isHold: false, defaultRestSeconds: 150, pbTarget: 'Chin-up' },

  // BACK (Pull-ups/Rows/FL Raises/Muscle-ups)
  'Pull-up': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 150, pbTarget: 'Pull-up' },
  'Pull-ups': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 150, pbTarget: 'Pull-up' },
  'L-sit pull-up': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 150, pbTarget: 'Pull-up' },
  'Row': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 150, pbTarget: 'Row' },
  'Rows': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 150, pbTarget: 'Row' },
  'Muscle-up': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 180, pbTarget: 'Muscle-up' },
  'Tucked Front Lever Raise': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 150, pbTarget: 'Front Lever' },
  'Advanced Tucked Front Lever Raise': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 150, pbTarget: 'Front Lever' },
  'One-leg Front Lever Raise': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 180, pbTarget: 'Front Lever' },
  'Front Lever Raise': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 180, pbTarget: 'Front Lever' },

  // LEGS
  'Squat': { bucket: 'Legs', isRepBased: true, isHold: false, defaultRestSeconds: 120 },
  'Pistol Squat': { bucket: 'Legs', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'Lunge': { bucket: 'Legs', isRepBased: true, isHold: false, defaultRestSeconds: 120 },
  'One-leg Lunge': { bucket: 'Legs', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'Calf Raise': { bucket: 'Legs', isRepBased: true, isHold: false, defaultRestSeconds: 90 },

  // CORE
  'Knee Raise': { bucket: 'Core', isRepBased: true, isHold: false, defaultRestSeconds: 90 },
  'Toes-to-bar': { bucket: 'Core', isRepBased: true, isHold: false, defaultRestSeconds: 120 },
  'Dragon Flag': { bucket: 'Core', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'L-sit': { bucket: 'Core', isRepBased: false, isHold: true, defaultRestSeconds: 120, pbTarget: 'L-sit' },

  // SKILLS / HOLDS (Excluded from Radar)
  'Handstand': { bucket: 'Skills', isRepBased: false, isHold: true, defaultRestSeconds: 120, pbTarget: 'Handstand' },
  'Front Lever': { bucket: 'Skills', isRepBased: false, isHold: true, defaultRestSeconds: 150, pbTarget: 'Front Lever' },
};

export const getExerciseMeta = (exerciseName) => {
  const name = exerciseName.trim();
  const meta = EXERCISE_MAP[name] || EXERCISE_MAP[
    Object.keys(EXERCISE_MAP).find(k => k.toLowerCase() === name.toLowerCase())
  ];
  
  if (!meta) {
    console.warn(`[Diagnostics] Unmapped exercise detected: "${name}"`);
    return { bucket: 'Other', isRepBased: true, isHold: false, defaultRestSeconds: 150 }; // fallback
  }
  return meta;
};
