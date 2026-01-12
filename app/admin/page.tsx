'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { PersonalityDimension, PersonalityVector } from '@/types';
import { getTopTrait, calculateEuclideanDistance } from '@/lib/vector';
import { projectTo2D } from '@/lib/pca';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

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

interface GraphNode {
  id: number;
  name: string;
  color: string;
  topTrait: PersonalityDimension;
  vector: PersonalityVector;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface GraphLink {
  source: number;
  target: number;
  similarity: number;
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
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [showInfo, setShowInfo] = useState(true);
  const [liveConnected, setLiveConnected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 600,
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Center and zoom to fit all nodes when graph loads
  useEffect(() => {
    if (graphRef.current && users.length >= 2) {
      // Delay to ensure graph is rendered
      setTimeout(() => {
        graphRef.current?.centerAt(0, 0, 300);
        graphRef.current?.zoomToFit(400, 100);
      }, 300);
    }
  }, [users]);

  const handleZoomIn = () => {
    graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 300);
  };

  const handleZoomOut = () => {
    graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 300);
  };

  const handleZoomToFit = () => {
    graphRef.current?.centerAt(0, 0, 200);
    graphRef.current?.zoomToFit(400, 100);
  };

  // SSE connection for live updates
  useEffect(() => {
    if (!isAuthenticated) return;

    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 5;

    const connect = () => {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource('/api/admin/stream');

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
          const newUser: UserNode = JSON.parse(event.data);
          setUsers((prevUsers) => {
            // Check if user already exists
            if (prevUsers.some(u => u.id === newUser.id)) {
              return prevUsers;
            }
            return [...prevUsers, newUser];
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
  }, [isAuthenticated]);

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

  const graphData = useMemo(() => {
    if (users.length < 2) return { nodes: [], links: [] };

    // Project to 2D using PCA
    const vectors = users.map(u => [u.sporty, u.creative, u.social, u.logical, u.adventurous, u.calm]);
    const projected = projectTo2D(vectors);

    // Scale to fit canvas (center the graph)
    const padding = 100;
    const xValues = projected.map(p => p.x);
    const yValues = projected.map(p => p.y);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    // Create nodes with FIXED PCA positions centered at (0,0) for ForceGraph
    // Use smaller spread to keep nodes visible
    const spreadFactor = 0.6;
    const graphWidth = (dimensions.width - 2 * padding) * spreadFactor;
    const graphHeight = (dimensions.height - 2 * padding) * spreadFactor;

    const nodes: GraphNode[] = users.map((u, i) => {
      const vector: PersonalityVector = {
        sporty: u.sporty,
        creative: u.creative,
        social: u.social,
        logical: u.logical,
        adventurous: u.adventurous,
        calm: u.calm,
      };
      const topTrait = getTopTrait(vector);

      // Center coordinates around (0,0) for ForceGraph2D
      const x = ((projected[i].x - xMin) / xRange - 0.5) * graphWidth;
      const y = ((projected[i].y - yMin) / yRange - 0.5) * graphHeight;

      return {
        id: u.id,
        name: u.name,
        color: TRAIT_COLORS[topTrait],
        topTrait,
        vector,
        x,
        y,
        fx: x, // Fixed x position (PCA)
        fy: y, // Fixed y position (PCA)
      };
    });

    // Create links between similar users
    const links: GraphLink[] = [];
    // Max distance in 6D space with 0-10 values: sqrt(6 * 10^2) = sqrt(600)
    const maxDistance = Math.sqrt(600);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const distance = calculateEuclideanDistance(nodes[i].vector, nodes[j].vector);
        const similarity = 1 - distance / maxDistance;

        // Show links with >70% similarity
        if (similarity > 0.7) {
          links.push({
            source: nodes[i].id,
            target: nodes[j].id,
            similarity,
          });
        }
      }
    }

    return { nodes, links };
  }, [users, dimensions]);

  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 14 / globalScale;
    const nodeRadius = 20 / globalScale;

    // Draw circle
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, nodeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = node.color;
    ctx.fill();

    // Draw initials
    ctx.font = `bold ${fontSize}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(label.substring(0, 2).toUpperCase(), node.x!, node.y!);

    // Draw name below
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText(label, node.x!, node.y! + nodeRadius + fontSize);
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
  }, []);

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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Personality Map</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Interactive visualization using PCA projection. Drag nodes, zoom, and hover for details.
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
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                {users.length} Users Completed Quiz
              </h2>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${liveConnected ? 'bg-green-500 animate-pulse' : 'bg-zinc-400'}`} />
                <span className="text-xs text-zinc-500">
                  {liveConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
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

          <div
            ref={containerRef}
            className="relative rounded-lg border border-zinc-200 dark:border-zinc-700"
            style={{
              height: 600,
              backgroundColor: '#18181b',
              backgroundImage: `
                linear-gradient(rgba(63, 63, 70, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(63, 63, 70, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          >
            {users.length < 2 ? (
              <div className="h-full flex items-center justify-center text-zinc-400">
                Need at least 2 users to visualize
              </div>
            ) : (
              <>
                <ForceGraph2D
                  key={users.map(u => u.id).join(',')}
                  ref={graphRef}
                  graphData={graphData}
                  width={dimensions.width}
                  height={dimensions.height}
                  nodeId="id"
                  nodeCanvasObject={nodeCanvasObject as any}
                  nodePointerAreaPaint={(node: any, color, ctx) => {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();
                  }}
                  linkColor={() => 'rgba(161, 161, 170, 0.4)'}
                  linkWidth={(link: any) => Math.max(1, (link.similarity - 0.7) * 10)}
                  onNodeHover={handleNodeHover as any}
                  onNodeDrag={(node: any) => {
                    node.fx = node.x;
                    node.fy = node.y;
                  }}
                  cooldownTicks={0}
                  enableNodeDrag={true}
                  enableZoomInteraction={true}
                  enablePanInteraction={true}
                />

                {/* Zoom controls */}
                <div className="absolute bottom-4 left-4 flex flex-col gap-1">
                  <button
                    onClick={handleZoomIn}
                    className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-300 text-lg font-medium transition-colors"
                  >
                    +
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-300 text-lg font-medium transition-colors"
                  >
                    −
                  </button>
                  <button
                    onClick={handleZoomToFit}
                    className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-400 text-xs font-medium transition-colors"
                    title="Fit to view"
                  >
                    [ ]
                  </button>
                </div>

                {/* Info panel */}
                <div className="absolute bottom-4 right-4">
                  {showInfo ? (
                    <div className="bg-zinc-800/90 rounded-lg p-3 shadow-lg border border-zinc-700 max-w-64 text-xs">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-zinc-200">How to read this map</h4>
                        <button
                          onClick={() => setShowInfo(false)}
                          className="text-zinc-500 hover:text-zinc-300 text-sm leading-none"
                        >
                          ×
                        </button>
                      </div>
                      <ul className="space-y-1 text-zinc-400">
                        <li><span className="text-zinc-300">Position:</span> Similar personalities are closer together (PCA projection)</li>
                        <li><span className="text-zinc-300">Color:</span> Dominant personality trait</li>
                        <li><span className="text-zinc-300">Lines:</span> Connect users with &gt;70% similarity</li>
                      </ul>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowInfo(true)}
                      className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-400 text-sm font-medium transition-colors"
                      title="Show info"
                    >
                      ?
                    </button>
                  )}
                </div>

                {hoveredNode && (
                  <div className="absolute top-4 left-4 bg-zinc-800 rounded-lg p-4 shadow-lg border border-zinc-700 min-w-56">
                    <h3 className="font-bold text-white mb-2">{hoveredNode.name}</h3>
                    <div className="space-y-2 text-sm">
                      {(Object.keys(TRAIT_COLORS) as PersonalityDimension[]).map((trait) => {
                        const value = hoveredNode.vector[trait];
                        return (
                          <div key={trait} className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: TRAIT_COLORS[trait] }}
                            />
                            <span className="text-zinc-400 capitalize w-20 shrink-0">{trait}</span>
                            <div className="bg-zinc-700 rounded-full h-2 w-20 shrink-0 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${(value / 10) * 100}%`,
                                  backgroundColor: TRAIT_COLORS[trait],
                                }}
                              />
                            </div>
                            <span className="text-zinc-300 w-6 text-right shrink-0">
                              {value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-3 border-t border-zinc-700">
                      <span className="text-zinc-400">Top trait: </span>
                      <span className="font-medium capitalize" style={{ color: hoveredNode.color }}>
                        {hoveredNode.topTrait}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
