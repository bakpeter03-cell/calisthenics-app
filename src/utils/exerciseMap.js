export const EXERCISE_MAP = {
  // PUSH / CHEST
  'Push-up': { bucket: 'Chest', isRepBased: true, isHold: false, defaultRestSeconds: 120 },
  'Decline Push-up': { bucket: 'Chest', isRepBased: true, isHold: false, defaultRestSeconds: 120 },
  'Incline Push-up': { bucket: 'Chest', isRepBased: true, isHold: false, defaultRestSeconds: 120 },
  'Pike Push-up': { bucket: 'Chest', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'Elevated Pike Pushup': { bucket: 'Chest', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'Handstand Push-up': { bucket: 'Chest', isRepBased: true, isHold: false, defaultRestSeconds: 180 },
  'Archer Push-up': { bucket: 'Chest', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  
  // ARMS
  'Dip': { bucket: 'Arms', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'Straight Bar Dip': { bucket: 'Arms', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'Chin-up': { bucket: 'Arms', isRepBased: true, isHold: false, defaultRestSeconds: 150 },

  // BACK
  'Pull-up': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'L-sit pull-up': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'Row': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'Tucked Front Lever Raise': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'Advanced Tucked Front Lever Raise': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 150 },
  'One-leg Front Lever Raise': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 180 },
  'Front Lever Raise': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 180 },
  'Muscle-up': { bucket: 'Back', isRepBased: true, isHold: false, defaultRestSeconds: 180 },

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
  'L-sit': { bucket: 'Core', isRepBased: false, isHold: true, defaultRestSeconds: 120 },

  // SKILLS (Holds)
  'Handstand': { bucket: 'Skills', isRepBased: false, isHold: true, defaultRestSeconds: 120 },
  'Front Lever': { bucket: 'Skills', isRepBased: false, isHold: true, defaultRestSeconds: 150 },
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
