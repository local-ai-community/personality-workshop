'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PERSONALITY_QUESTIONS, PersonalityVector } from '@/types';

export default function QuizPage() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Partial<PersonalityVector>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const questions = Object.entries(PERSONALITY_QUESTIONS) as [
    keyof PersonalityVector,
    string
  ][];

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    const defaultAnswers: PersonalityVector = {
      sporty: 5,
      creative: 5,
      social: 5,
      logical: 5,
      adventurous: 5,
      calm: 5,
    };
    setAnswers(defaultAnswers);
  }, []);

  const handleSliderChange = (dimension: keyof PersonalityVector, value: string) => {
    setAnswers((prev) => ({ ...prev, [dimension]: parseInt(value, 10) }));
  };

  const handleNext = () => {
    const [dimension] = questions[currentQuestion];
    if (answers[dimension] === undefined) {
      setError('Please select a value before continuing');
      return;
    }
    setError('');

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    const userId = localStorage.getItem('userId');
    const completeAnswers = answers as PersonalityVector;

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: parseInt(userId!, 10), answers: completeAnswers }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit quiz');
        setIsLoading(false);
        return;
      }

      router.push('/results');
    } catch {
      setError('Failed to connect to server');
      setIsLoading(false);
    }
  };

  const [dimension, question] = questions[currentQuestion];
  const currentValue = answers[dimension] ?? 5;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {currentQuestion + 1}/{questions.length}
            </span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
            <div
              className="bg-zinc-900 dark:bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8 text-center">
          {question}
        </h2>

        <div className="mb-8">
          <input
            type="range"
            min="0"
            max="10"
            value={currentValue}
            onChange={(e) => handleSliderChange(dimension, e.target.value)}
            className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-white"
          />
          <div className="flex justify-between mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span>0 - Not at all</span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              {currentValue}
            </span>
            <span>10 - Very much so</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentQuestion === 0 || isLoading}
            className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading
              ? 'Submitting...'
              : currentQuestion === questions.length - 1
              ? 'Submit'
              : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
