/**
 * Circuit breaker in-memory (I011) — sin deps externas.
 * Estados: closed → open → half-open → closed|open.
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export type CircuitBreakerOptions = {
  /** Fallos consecutivos para abrir. */
  failureThreshold: number;
  /** ms en open antes de half-open. */
  cooldownMs: number;
  /** Éxitos en half-open para cerrar. */
  successThreshold: number;
};

export type CircuitBreakerSnapshot = {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  openedAt: number | null;
};

const DEFAULTS: CircuitBreakerOptions = {
  failureThreshold: 5,
  cooldownMs: 30_000,
  successThreshold: 2,
};

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private openedAt: number | null = null;
  private readonly opts: CircuitBreakerOptions;

  constructor(
    private readonly name: string,
    opts?: Partial<CircuitBreakerOptions>,
  ) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  getName(): string {
    return this.name;
  }

  snapshot(): CircuitBreakerSnapshot {
    this.maybeTransitionToHalfOpen();
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      openedAt: this.openedAt,
    };
  }

  /** true si se puede intentar la operación. */
  allowRequest(): boolean {
    this.maybeTransitionToHalfOpen();
    return this.state !== 'open';
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successes += 1;
      if (this.successes >= this.opts.successThreshold) {
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
        this.openedAt = null;
      }
      return;
    }
    this.failures = 0;
  }

  recordFailure(): void {
    this.failures += 1;
    this.successes = 0;
    if (
      this.state === 'half-open' ||
      this.failures >= this.opts.failureThreshold
    ) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.openedAt = null;
  }

  private maybeTransitionToHalfOpen(): void {
    if (this.state !== 'open' || this.openedAt === null) {
      return;
    }
    if (Date.now() - this.openedAt >= this.opts.cooldownMs) {
      this.state = 'half-open';
      this.successes = 0;
    }
  }
}

const registry = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  name: string,
  opts?: Partial<CircuitBreakerOptions>,
): CircuitBreaker {
  const existing = registry.get(name);
  if (existing) {
    return existing;
  }
  const created = new CircuitBreaker(name, opts);
  registry.set(name, created);
  return created;
}

export function resetCircuitBreakerRegistryForTests(): void {
  registry.clear();
}
