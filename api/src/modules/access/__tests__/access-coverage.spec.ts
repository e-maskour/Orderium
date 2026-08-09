import * as fs from 'fs';
import * as path from 'path';
import { auditControllers, formatCoverageProblems } from '../access-coverage';

const MODULES_DIR = path.join(__dirname, '..', '..');

function controllerFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : controllerFiles(full);
    }
    return entry.name.endsWith('.controller.ts') ? [full] : [];
  });
}

/**
 * The same check `AccessCoverageService` runs at bootstrap, executed here so a
 * route that would silently 403 fails CI instead of production.
 *
 * Controllers are loaded straight off disk rather than through a Nest context:
 * importing a controller class evaluates its decorators, which is all the audit
 * needs, and it keeps the test free of a database.
 */
describe('access control route coverage', () => {
  const files = controllerFiles(MODULES_DIR);

  it('finds the controllers', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it('leaves no route without an access declaration', () => {
    const controllers = files.flatMap((file) => {
      // `require` rather than `import()`: Jest runs this suite as CommonJS, so
      // a dynamic import needs --experimental-vm-modules to resolve at all.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const loaded = require(file) as Record<string, unknown>;
      return Object.values(loaded).filter(
        (exported): exported is new (...args: any[]) => unknown =>
          typeof exported === 'function' &&
          /Controller$/.test((exported as { name: string }).name),
      );
    });

    const problems = auditControllers(controllers);
    if (problems.length) {
      throw new Error(formatCoverageProblems(problems));
    }
    expect(problems).toEqual([]);
  });
});
