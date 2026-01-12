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
  const [matches, setMatches] = useState<{ id: number; name: string; distance: number; isNew?: boolean }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveConnected, setLiveConnected] = useState(false);
  const [calculationOpen, setCalculationOpen] = useState(false);

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

        setLiveConnected(true);
      } catch (err) {
        console.error('Failed to fetch results', err);
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 5;

    const connect = () => {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource(`/api/matches/stream?userId=${userId}`);

      eventSource.onopen = () => {
        setLiveConnected(true);
        retryCount = 0;
      };

      eventSource.onerror = () => {
        setLiveConnected(false);

        if (eventSource) {
          eventSource.close();
        }

        if (retryCount < maxRetries) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          retryTimeout = setTimeout(connect, delay);
        }
      };

      eventSource.onmessage = (event) => {
        if (event.data === ': keep-alive') return;

        try {
          const newMatch = JSON.parse(event.data);
          setMatches((prevMatches) => {
            if (!prevMatches) return [newMatch];

            const updated = [newMatch, ...prevMatches];
            updated.sort((a, b) => a.distance - b.distance);
            return updated.map((match) =>
              match.id === newMatch.id ? { ...match, isNew: true } : match
            );
          });
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };
    };

    connect();

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-zinc-600 dark:text-zinc-400">Loading results...</div>
      </div>
    );
  }

  const topTrait = vector ? getTopTrait(vector) : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-2 sm:p-4">
      <div className="max-w-2xl lg:max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-2 text-center sm:text-left">
            Your Results, {userName}!
          </h1>
          {topTrait && (
            <p className="text-zinc-600 dark:text-zinc-400 text-center sm:text-left">
              Your strongest trait is <span className="font-semibold text-zinc-900 dark:text-white capitalize">{topTrait}</span>
            </p>
          )}
        </div>

        {vector && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4 sm:mb-6 text-center">Your Personality Radar</h2>
            <RadarChart data={vector} />
          </div>
        )}

        {vector && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4 sm:mb-6">Your Personality Scores</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
              {Object.entries(vector).map(([key, value]) => {
                const isTopTrait = key === topTrait;
                return (
                  <div
                    key={key}
                    className={`p-3 sm:p-4 rounded-lg border-2 ${
                      isTopTrait
                        ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                        : 'border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 capitalize mb-1">
                      {key}
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                      {value}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
          <button
            onClick={() => setCalculationOpen(!calculationOpen)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
              How Similarity is Calculated
            </h2>
            <svg
              className={`w-6 h-6 text-zinc-600 dark:text-zinc-400 transition-transform duration-200 ${
                calculationOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {calculationOpen && (
            <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6 text-zinc-700 dark:text-zinc-300 text-sm sm:text-base">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-2 sm:mb-3">
                  What is Euclidean Distance?
                </h3>
                <p className="mb-2">
                  Euclidean distance is a way to measure how far apart two things are in a mathematical space. It's like measuring the straight-line distance between two points.
                </p>
                <p>
                  In this quiz, we measure your personality as a point in 6-dimensional space (one dimension for each personality trait). The closer two people are, the more similar their personalities are.
                </p>
              </div>

              <div className="bg-zinc-100 dark:bg-zinc-800 p-3 sm:p-4 rounded-lg">
                <h4 className="font-semibold text-zinc-900 dark:text-white mb-2">The Formula:</h4>
                <div className="text-center text-base sm:text-lg font-mono bg-zinc-50 dark:bg-zinc-700 p-2 sm:p-3 rounded">
                  d = √((x₁-x₂)² + (y₁-y₂)² + ...)
                </div>
                <p className="text-xs sm:text-sm mt-2 text-zinc-600 dark:text-zinc-400">
                  We calculate the difference between your scores and someone else's scores for each trait, square each difference, add them up, then take the square root.
                </p>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-2 sm:mb-3">
                  How It Works
                </h3>
                <ol className="list-decimal list-inside space-y-1 sm:space-y-2">
                  <li>You answer 6 questions, each on a scale of 0-10</li>
                  <li>Your answers become a "vector" in 6-dimensional space</li>
                  <li>We compare your vector with everyone else's vectors</li>
                  <li>The smaller the distance, the more similar you are!</li>
                </ol>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                  <strong>Example:</strong> If you score 8 on "sporty" and someone else scores 7, that's a difference of 1. If you both score 5 on "calm", that's a difference of 0. Smaller differences = more similar!
                </p>
              </div>
            </div>
          )}
        </div>

        {matches && matches.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">Your Top Matches</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${liveConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {liveConnected ? 'Live' : 'Disconnected'}
                </span>
              </div>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {matches.map((match, index) => (
                <div
                  key={match.id}
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-lg transition-all duration-300 ${
                    match.isNew
                      ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-400'
                      : 'bg-zinc-50 dark:bg-zinc-800'
                  }`}
                  onClick={() => {
                    if (match.isNew) {
                      setMatches((prev) =>
                        prev ? prev.map((m) => (m.id === match.id ? { ...m, isNew: false } : m)) : null
                      );
                    }
                  }}
                >
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-sm sm:text-base">
                      {index + 1}
                    </div>
                    <span className="text-base sm:text-lg font-medium text-zinc-900 dark:text-white">
                      {match.name}
                      {match.isNew && (
                        <span className="ml-2 text-xs px-2 py-1 bg-green-500 text-white rounded-full animate-pulse">
                          NEW
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="hidden sm:inline">Distance: </span>
                    <span className="font-semibold text-zinc-900 dark:text-white">{match.distance.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <button
            onClick={() => router.push('/quiz')}
            className="w-full sm:w-auto px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors font-medium"
          >
            Retake Quiz
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('userId');
              localStorage.removeItem('userName');
              router.push('/');
            }}
            className="w-full sm:w-auto px-6 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
