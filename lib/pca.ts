/**
 * Simple PCA implementation for projecting 6D personality vectors to 2D
 */

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Compute PCA and project data points to 2D
 * @param data Array of 6D vectors (each vector is an array of 6 numbers)
 * @returns Array of 2D points
 */
export function projectTo2D(data: number[][]): Point2D[] {
  if (data.length === 0) return [];
  if (data.length === 1) return [{ x: 0, y: 0 }];

  const n = data.length;
  const d = data[0].length;

  // 1. Center the data (subtract mean from each dimension)
  const means = new Array(d).fill(0);
  for (let j = 0; j < d; j++) {
    for (let i = 0; i < n; i++) {
      means[j] += data[i][j];
    }
    means[j] /= n;
  }

  const centered: number[][] = data.map(row =>
    row.map((val, j) => val - means[j])
  );

  // 2. Compute covariance matrix (d x d)
  const cov: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += centered[k][i] * centered[k][j];
      }
      cov[i][j] = sum / (n - 1);
    }
  }

  // 3. Find top 2 eigenvectors using power iteration
  const pc1 = powerIteration(cov);
  const deflated = deflateMatrix(cov, pc1);
  const pc2 = powerIteration(deflated);

  // 4. Project data onto principal components
  return centered.map(row => ({
    x: dotProduct(row, pc1),
    y: dotProduct(row, pc2),
  }));
}

/**
 * Power iteration to find the dominant eigenvector
 */
function powerIteration(matrix: number[][], maxIter = 100, tol = 1e-10): number[] {
  const d = matrix.length;
  let v = new Array(d).fill(0).map(() => Math.random() - 0.5);
  v = normalize(v);

  for (let iter = 0; iter < maxIter; iter++) {
    const vNew = matVecMul(matrix, v);
    const vNorm = normalize(vNew);

    // Check convergence
    const diff = Math.sqrt(v.reduce((sum, val, i) => sum + (val - vNorm[i]) ** 2, 0));
    v = vNorm;

    if (diff < tol) break;
  }

  return v;
}

/**
 * Deflate matrix by removing contribution of eigenvector
 * A' = A - λ * v * v^T (where λ = v^T * A * v)
 */
function deflateMatrix(matrix: number[][], eigenvector: number[]): number[][] {
  const d = matrix.length;
  const Av = matVecMul(matrix, eigenvector);
  const eigenvalue = dotProduct(eigenvector, Av);

  const deflated: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      deflated[i][j] = matrix[i][j] - eigenvalue * eigenvector[i] * eigenvector[j];
    }
  }

  return deflated;
}

function matVecMul(matrix: number[][], vec: number[]): number[] {
  return matrix.map(row => dotProduct(row, vec));
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return v;
  return v.map(val => val / norm);
}
