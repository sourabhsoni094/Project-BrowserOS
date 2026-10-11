import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';

// Suspicious directory traversal or shell injection tokens
const TRAVERSAL_REGEX = /(?:^|[\\/])\.\.(?:[\\/]|$)|%2e%2e|\x00/i;
const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

export function securitySanitizer(req: Request, _res: Response, next: NextFunction): void {
  // 1. Path traversal check on params and query
  for (const [key, value] of Object.entries(req.params)) {
    if (typeof value === 'string' && TRAVERSAL_REGEX.test(value)) {
      throw new AppError(`Security violation: Invalid path parameter in "${key}".`, 400);
    }
  }

  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string' && TRAVERSAL_REGEX.test(value)) {
      throw new AppError(`Security violation: Path traversal detected in query "${key}".`, 400);
    }
  }

  // 2. Body sanitization (defuse malicious raw script execution while preserving markdown / code blocks)
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
}

function sanitizeObject(obj: any): void {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      // Check for path traversal in node names or filenames
      if ((key === 'name' || key === 'path' || key === 'fileName') && TRAVERSAL_REGEX.test(val)) {
        throw new AppError(`Security violation: Forbidden path traversal characters in "${key}".`, 400);
      }
      // Neutralize raw <script> execution in titles and names
      if (key === 'name' || key === 'title' || key === 'category') {
        obj[key] = val.replace(SCRIPT_REGEX, '');
      }
    } else if (val && typeof val === 'object') {
      sanitizeObject(val);
    }
  }
}
