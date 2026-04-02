import { timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';

/**
 * Creates an HTTP Basic Auth middleware for the Bull Board queue dashboard.
 *
 * Credentials are read from environment variables:
 *   QUEUE_BOARD_USER  — username (defaults to "admin")
 *   QUEUE_BOARD_PASS  — password (required; dashboard is blocked if not set)
 *
 * Basic Auth is used intentionally: unlike Bearer-token auth, the browser
 * sends credentials with every sub-request (static assets, API calls), which
 * is required for the Bull Board SPA to function correctly.
 *
 * This function is called at module-definition time (before DI is available),
 * so it reads from process.env directly. ConfigModule.forRoot() populates
 * process.env synchronously via dotenv before any other module is instantiated,
 * so the values are always present at call-time.
 */
export function createQueueBoardAuthMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction,
) => void {
  const expectedUser = process.env.QUEUE_BOARD_USER ?? 'admin';
  const expectedPass = process.env.QUEUE_BOARD_PASS ?? '';

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!expectedPass) {
      // No password configured — fail closed (secure by default).
      // Set the header so the reason is visible in monitoring but not leaking credentials.
      res
        .status(503)
        .setHeader('X-Queue-Board', 'not-configured')
        .json({ message: 'Queue board is not available' });
      return;
    }

    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Queue Board"');
      res.status(401).end('Unauthorized');
      return;
    }

    const encoded = authorization.slice('Basic '.length);
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const colonIndex = decoded.indexOf(':');

    if (colonIndex === -1) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Queue Board"');
      res.status(401).end('Unauthorized');
      return;
    }

    const providedUser = decoded.slice(0, colonIndex);
    const providedPass = decoded.slice(colonIndex + 1);

    const userMatch = safeCompare(providedUser, expectedUser);
    const passMatch = safeCompare(providedPass, expectedPass);

    if (!userMatch || !passMatch) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Queue Board"');
      res.status(401).end('Unauthorized');
      return;
    }

    next();
  };
}

/**
 * Constant-time string comparison to mitigate timing-attack enumeration.
 * Both strings are converted to fixed-length buffers for the comparison.
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // Lengths are not secret (they'd be visible in the encoded header), so a
  // length-mismatch short-circuit is acceptable here.
  if (bufA.length !== bufB.length) return false;

  return timingSafeEqual(bufA, bufB);
}
