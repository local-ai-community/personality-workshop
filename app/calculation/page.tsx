'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PersonalityVector } from '@/types';

export default function CalculationPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userVector, setUserVector] = useState<PersonalityVector | null>(null);
  const [otherUser, setOtherUser] = useState<{ name: string; vector: PersonalityVector; distance: number } | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    if (!storedName) {
      router.push('/');
      return;
    }
    // setUserName(storedName);

    const fetchQuiz = async () => {
      const userId = localStorage.getItem('userId');
      try {
        const quizRes = await fetch(`/api/quiz?userId=${userId}`).then((r) => r.json());
        if (quizRes.quiz) {
          setUserVector(quizRes.quiz);

          const matchesRes = await fetch(`/api/matches?userId=${userId}`).then((r) => r.json());
          if (matchesRes.matches && matchesRes.matches.length > 0) {
            const bestMatch = matchesRes.matches[0];
            
            const bestMatchQuizRes = await fetch(`/api/quiz?userId=${bestMatch.id}`).then((r) => r.json());
            if (bestMatchQuizRes.quiz) {
              setOtherUser({
                name: bestMatch.name,
                vector: bestMatchQuizRes.quiz,
                distance: bestMatch.distance,
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch quiz', err);
      }
    };

    fetchQuiz();
  }, [router]);

  const calculateDifference = (userScore: number, otherScore: number) => {
    const diff = userScore - otherScore;
    const squared = diff * diff;
    return { diff, squared };
  };

  if (!userVector) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
            No Other Users Yet
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            You're the first person to complete the quiz! Once others join, we'll calculate your similarities.
          </p>
          <button
            onClick={() => setShowResults(true)}
            className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3 px-4 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors font-medium"
          >
            View My Results
          </button>
        </div>
      </div>
    );
  }

  if (showResults) {
    router.push('/results');
    return null;
  }

  const totalSum = Object.keys(userVector).reduce((sum, key) => {
    const userScore = userVector[key as keyof PersonalityVector];
    const otherScore = otherUser.vector[key as keyof PersonalityVector];
    const diff = userScore - otherScore;
    return sum + (diff * diff);
  }, 0);

  const dimensions = Object.keys(userVector) as Array<keyof PersonalityVector>;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2 text-center">
            Calculating Your Distance
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-center">
            Comparing {userName} with {otherUser.name}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Step-by-Step Calculation</h2>

          <div className="space-y-4">
            {dimensions.map((dim) => {
              const userScore = userVector[dim];
              const otherScore = otherUser.vector[dim];
              const { diff, squared } = calculateDifference(userScore, otherScore);

              return (
                <div key={dim} className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-zinc-900 dark:text-white capitalize mb-1">{dim}</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      You: {userScore} vs {otherUser.name}: {otherScore}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">Difference</div>
                    <div className="font-mono font-bold text-zinc-900 dark:text-white">{diff}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">Squared</div>
                    <div className="font-mono font-bold text-zinc-900 dark:text-white">{squared}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-6 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Total Distance Calculation</h3>
            <div className="space-y-2 text-zinc-700 dark:text-zinc-300">
              <div className="flex justify-between">
                <span>Sum of squared differences:</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-white">{totalSum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Square root (final distance):</span>
                <span className="font-mono font-bold text-2xl text-zinc-900 dark:text-white">
                  √{totalSum.toFixed(2)} = {otherUser.distance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
          <div className="text-center space-y-4">
            <p className="text-lg text-zinc-700 dark:text-zinc-300">
              Your distance with <span className="font-bold text-zinc-900 dark:text-white">{otherUser.name}</span> is &apos;
              <span className="font-bold text-zinc-900 dark:text-white">{otherUser.distance.toFixed(2)}</span>
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              The smaller this number, the more similar your personalities!
            </p>
          </div>

          <button
            onClick={() => setShowResults(true)}
            className="w-full mt-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3 px-4 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors font-medium"
          >
            View My Results
          </button>
        </div>
      </div>
    </div>
  );
}
