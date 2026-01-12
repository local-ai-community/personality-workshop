export interface User {
  id: number;
  name: string;
  created_at: Date;
}

export interface QuizResult {
  id: number;
  user_id: number;
  sporty: number;
  creative: number;
  social: number;
  logical: number;
  adventurous: number;
  calm: number;
  updated_at: Date;
}

export interface UserWithQuiz extends User {
  quiz?: QuizResult;
}

export interface PersonalityVector {
  sporty: number;
  creative: number;
  social: number;
  logical: number;
  adventurous: number;
  calm: number;
}

export interface UserMatch {
  user: User;
  distance: number;
}

export type PersonalityDimension = keyof PersonalityVector;

export const PERSONALITY_QUESTIONS: Record<PersonalityDimension, string> = {
  sporty: 'How sporty are you?',
  creative: 'How creative are you?',
  social: 'How social are you?',
  logical: 'How logical are you?',
  adventurous: 'How adventurous are you?',
  calm: 'How calm are you?',
};
