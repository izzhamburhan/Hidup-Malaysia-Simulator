// Pet care. Prices are FICTIONAL GAME ESTIMATES chosen for balance, not market rates.

export const PET = {
  name: 'Oyen',
  /** Adoption with a basic vet check and vaccination. */
  adoptionFee: 80,
  /** One meal of cat food. */
  mealCost: 6,
  /** Fullness a meal adds. */
  mealFullness: 50,
  /** Daily falls. */
  dailyHunger: 45,
  dailyMoodLoss: 8,
  hungryMoodLoss: 20,
  /** Mood from one play session. */
  playMood: 22,
} as const;
