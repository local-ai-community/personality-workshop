import { PersonalityVector, PersonalityDimension } from '@/types';

export function calculateEuclideanDistance(
  vector1: PersonalityVector,
  vector2: PersonalityVector
): number {
  const dimensions: PersonalityDimension[] = [
    'sporty',
    'creative',
    'social',
    'logical',
    'adventurous',
    'calm',
  ];

  const sumOfSquares = dimensions.reduce((sum, dim) => {
    const diff = vector1[dim] - vector2[dim];
    return sum + diff * diff;
  }, 0);

  return Math.sqrt(sumOfSquares);
}

export function getTopTrait(vector: PersonalityVector): PersonalityDimension {
  const dimensions: PersonalityDimension[] = [
    'sporty',
    'creative',
    'social',
    'logical',
    'adventurous',
    'calm',
  ];

  return dimensions.reduce((maxDim, dim) =>
    vector[dim] > vector[maxDim] ? dim : maxDim
  );
}
