'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { PersonalityDimension } from '@/types';
import { getTopTrait } from '@/lib/vector';

interface UserNode {
  id: number;
  name: string;
  sporty: number;
  creative: number;
  social: number;
  logical: number;
  adventurous: number;
  calm: number;
}

const TRAIT_COLORS: Record<PersonalityDimension, string> = {
  sporty: '#ef4444',
  creative: '#f97316',
  social: '#eab308',
  logical: '#22c55e',
  adventurous: '#3b82f6',
  calm: '#8b5cf6',
};

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [users, setUsers] = useState<UserNode[]>([]);
  const [loading, setLoading] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      fetchUsers();
    } catch {
      setAuthError('Failed to connect to server');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      const usersWithQuiz = data.users.filter((u: UserNode) => u.sporty !== null);
      setUsers(usersWithQuiz);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch users', err);
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/clear', { method: 'DELETE' });
      if (res.ok) {
        setUsers([]);
      }
    } catch {
      console.error('Failed to clear data');
    }
  };

  const renderNetwork = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current?.clientWidth || 800;
    const height = 600;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: any) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    const g = svg.append('g');

    const simulation = d3
      .forceSimulation(users as any)
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('link', d3.forceLink(users.flatMap((u1, i) =>
        users.slice(i + 1).map((u2) => ({ source: u1, target: u2 }))
      ) as any).distance(100));

    const links = users.flatMap((u1, i) => users.slice(i + 1).map((u2) => ({ source: u1, target: u2 })));
    
    g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#e4e4e7')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', 1);

    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(users)
      .enter()
      .append('g');

    nodeGroup.append('circle')
      .attr('r', 30)
      .attr('fill', (d: any) => {
        const vector = {
          sporty: d.sporty,
          creative: d.creative,
          social: d.social,
          logical: d.logical,
          adventurous: d.adventurous,
          calm: d.calm,
        };
        const topTrait = getTopTrait(vector) as PersonalityDimension;
        return TRAIT_COLORS[topTrait] || '#71717a';
      });

    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text((d: any) => d.name.substring(0, 2).toUpperCase());

    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 50)
      .attr('fill', '#ffffff')
      .attr('font-size', '14px')
      .text((d: any) => d.name);

    simulation.on('tick', () => {
      g.selectAll<SVGLineElement, any>('line')
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
  }, [users]);

  useEffect(() => {
    if (isAuthenticated && users.length > 1 && svgRef.current) {
      renderNetwork();
    }
  }, [isAuthenticated, users, renderNetwork]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 text-center">
            Admin Dashboard
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-center">
            Enter admin password to continue
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                required
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-2 px-4 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Verifying...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Network Diagram</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Visualizing user similarity based on personality vectors
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors font-medium"
            >
              Refresh
            </button>
            <button
              onClick={handleClearData}
              className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
            >
              Clear Data
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {users.length} Users Completed Quiz
            </h2>
            <div className="flex gap-4 text-sm">
              {(Object.keys(TRAIT_COLORS) as PersonalityDimension[]).map((trait) => (
                <div key={trait} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: TRAIT_COLORS[trait] }}
                  />
                  <span className="text-zinc-600 dark:text-zinc-400 capitalize">{trait}</span>
                </div>
              ))}
            </div>
          </div>

          {users.length < 2 ? (
            <div className="h-96 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
              Need at least 2 users to visualize network
            </div>
          ) : (
            <svg
              ref={svgRef}
              width="100%"
              height={600}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700"
            />
          )}
        </div>
      </div>
    </div>
  );
}
