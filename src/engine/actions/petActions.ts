// Looking after Oyen the cat.

import { PET } from '../../data/pets';
import { formatRM, spend } from '../core';
import { adoptPet, feedPet, playWithPet } from '../pet';
import type { ActionDef } from './types';

export const petActions: ActionDef[] = [
  {
    id: 'adopt-cat',
    category: 'home',
    icon: '🐈',
    title: 'Adopt a cat',
    description: 'Visit the animal shelter. A chubby ginger one is already staring at you.',
    minutes: 90,
    cost: PET.adoptionFee,
    contexts: ['home'],
    visible: (s) => !s.pet,
    available: (s) => (s.pet ? 'You already have a cat. He would not allow another one.' : null),
    confirm: () => `Adoption with a vet check costs ${formatRM(PET.adoptionFee)}. Cat food is about ${formatRM(PET.mealCost)} a meal after that.`,
    run: (s) => {
      spend(s, PET.adoptionFee, 'cat adoption and vet check');
      adoptPet(s);
    },
  },
  {
    id: 'feed-pet',
    category: 'home',
    icon: '🐟',
    title: (s) => `Feed ${s.pet?.name ?? 'the cat'}`,
    description: 'A bowl of cat food. The crunching is very loud.',
    minutes: 5,
    cost: PET.mealCost,
    contexts: ['home'],
    visible: (s) => !!s.pet,
    available: (s) => (!s.pet ? 'You have no cat.' : s.pet.fullness >= 90 ? `${s.pet.name} is full. Very full. Round, even.` : null),
    run: (s) => {
      spend(s, PET.mealCost, 'cat food');
      feedPet(s);
    },
  },
  {
    id: 'play-pet',
    category: 'home',
    icon: '🧶',
    title: (s) => `Play with ${s.pet?.name ?? 'the cat'}`,
    description: 'String, a box, and one cat who pretends not to care.',
    minutes: 15,
    contexts: ['home'],
    visible: (s) => !!s.pet,
    available: (s) => (!s.pet ? 'You have no cat.' : null),
    run: (s) => {
      playWithPet(s);
    },
  },
];
