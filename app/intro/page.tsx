'use client';

import { useRouter } from 'next/navigation';

export default function IntroPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6 text-center">
          How Similarity Is Calculated
        </h1>

        <div className="space-y-6 text-zinc-700 dark:text-zinc-300">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
              What is Euclidean Distance?
            </h2>
            <p className="mb-3">
              Euclidean distance is a way to measure how far apart two things are in a mathematical space. 
              It&apos;s like measuring the straight-line distance between two points on a map.
            </p>
            <p>
              In this quiz, we measure your personality as a point in 6-dimensional space (one dimension for each personality trait). 
              The closer two people are in this space, the more similar their personalities are.
            </p>
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">The Formula:</h3>
            <div className="text-center text-lg font-mono bg-zinc-50 dark:bg-zinc-700 p-3 rounded">
              d = &radic;((x₁-x₂)&sup2; + (y₁-y₂)&sup2; + ...)
            </div>
            <p className="text-sm mt-2 text-zinc-600 dark:text-zinc-400">
              We calculate the difference between your scores and someone else&apos;s scores for each trait, 
              square each difference, add them up, then take the square root.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
              How It Works
            </h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>You answer 6 questions, each on a scale of 0-10</li>
              <li>Your answers become a &quot;vector&quot; in 6-dimensional space</li>
              <li>We compare your vector with everyone else&apos;s vectors</li>
              <li>The smaller the distance, the more similar you are!</li>
            </ol>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Example:</strong> If you score 8 on &quot;sporty&quot; and someone else scores 7, 
              that&apos;s a difference of 1. If you both score 5 on &quot;calm&quot;, 
              that&apos;s a difference of 0. Smaller differences = more similar!
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push('/quiz')}
          className="w-full mt-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3 px-4 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors font-medium"
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
}
