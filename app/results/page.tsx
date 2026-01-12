'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PersonalityVector } from '@/types';
import { getTopTrait } from '@/lib/vector';
import RadarChart from '@/components/RadarChart';

export default function ResultsPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [vector, setVector] = useState<PersonalityVector | null>(null);
  const [matches, setMatches] = useState<{ id: number; name: string; distance: number }[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const userId = localStorage.getItem('userId');
      const storedName = localStorage.getItem('userName');

      if (!userId || !storedName) {
        router.push('/');
        return;
      }

      setUserName(storedName);

      try {
        const [quizRes, matchesRes] = await Promise.all([
          fetch(`/api/quiz?userId=${userId}`).then((r) => r.json()),
          fetch(`/api/matches?userId=${userId}`).then((r) => r.json()),
        ]);

        if (quizRes.quiz) {
          setVector(quizRes.quiz);
        }

        if (matchesRes.matches) {
          setMatches(matchesRes.matches);
        }
      } catch (err) {
        console.error('Failed to fetch results', err);
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-zinc-600 dark:text-zinc-400">Loading results...</div>
      </div>
    );
  }

  const topTrait = vector ? getTopTrait(vector) : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
            Your Results, {userName}!
          </h1>
          {topTrait && (
            <p className="text-zinc-600 dark:text-zinc-400">
              Your strongest trait is <span className="font-semibold text-zinc-900 dark:text-white capitalize">{topTrait}</span>
            </p>
          )}
        </div>

        {vector && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 text-center">Your Personality Radar</h2>
            <RadarChart data={vector} />
          </div>
        )}

        {vector && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Your Personality Scores</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(vector).map(([key, value]) => {
                const isTopTrait = key === topTrait;
                return (
                  <div
                    key={key}
                    className={`p-4 rounded-lg border-2 ${
                      isTopTrait
                        ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                        : 'border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 capitalize mb-1">
                      {key}
                    </div>
                    <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                      {value}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {matches && matches.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Your Top Matches</h2>
            <div className="space-y-3">
              {matches.map((match, index) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold">
                      {index + 1}
                    </div>
                    <span className="text-lg font-medium text-zinc-900 dark:text-white">
                      {match.name}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Distance: <span className="font-semibold text-zinc-900 dark:text-white">{match.distance.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <button
            onClick={() => router.push('/quiz')}
            className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors font-medium"
          >
            Retake Quiz
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('userId');
              localStorage.removeItem('userName');
              router.push('/');
            }}
            className="px-6 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
