import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import type { Device } from './index';
import type { DeviceTarget } from '../api-client';

const run = promisify(execFile);

/**
 * Queue names arrive from the API and are interpolated into a PowerShell
 * string, so they are untrusted input. Allow only what a real printer name
 * contains — notably no quotes, semicolons or backticks.
 */
const SAFE_QUEUE = /^[A-Za-z0-9 ._-]{1,120}$/;

function assertSafeQueue(queue: string): void {
  if (!SAFE_QUEUE.test(queue)) {
    throw new Error(`Unsafe printer queue name: ${queue}`);
  }
}

/**
 * Windows has no raw-print CLI. Add-Type compiles a small winspool.drv
 * P/Invoke shim at runtime, which gets us raw printing without shipping a
 * native Node module (and the node-gyp toolchain every shop would then need).
 */
function windowsRawScript(file: string, queue: string): string {
  return `
$ErrorActionPreference='Stop'
Add-Type -Namespace W -Name Spool -MemberDefinition @'
[DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
public static extern bool OpenPrinter(string src, out IntPtr h, IntPtr pd);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool ClosePrinter(IntPtr h);
[DllImport("winspool.drv", CharSet=CharSet.Auto, SetLastError=true)]
public static extern bool StartDocPrinter(IntPtr h, int level, [In] ref DOCINFOA di);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool EndDocPrinter(IntPtr h);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool StartPagePrinter(IntPtr h);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool EndPagePrinter(IntPtr h);
[DllImport("winspool.drv", SetLastError=true)]
public static extern bool WritePrinter(IntPtr h, IntPtr buf, int count, out int written);
[StructLayout(LayoutKind.Sequential, CharSet=CharSet.Auto)]
public struct DOCINFOA { public string pDocName; public string pOutputFile; public string pDataType; }
'@
$bytes=[System.IO.File]::ReadAllBytes('${file}')
$h=[IntPtr]::Zero
if(-not [W.Spool]::OpenPrinter('${queue}',[ref]$h,[IntPtr]::Zero)){throw "Cannot open printer ${queue}"}
$di=New-Object W.Spool+DOCINFOA
$di.pDocName='Orderium'
$di.pDataType='RAW'
[void][W.Spool]::StartDocPrinter($h,1,[ref]$di)
[void][W.Spool]::StartPagePrinter($h)
$p=[System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
[System.Runtime.InteropServices.Marshal]::Copy($bytes,0,$p,$bytes.Length)
$w=0
[void][W.Spool]::WritePrinter($h,$p,$bytes.Length,[ref]$w)
[System.Runtime.InteropServices.Marshal]::FreeHGlobal($p)
[void][W.Spool]::EndPagePrinter($h)
[void][W.Spool]::EndDocPrinter($h)
[void][W.Spool]::ClosePrinter($h)
`.trim();
}

export function buildRawCommand(
  platform: NodeJS.Platform,
  file: string,
  queue: string,
): { cmd: string; args: string[] } {
  assertSafeQueue(queue);

  if (platform === 'linux' || platform === 'darwin') {
    return { cmd: 'lp', args: ['-d', queue, '-o', 'raw', file] };
  }

  if (platform === 'win32') {
    return {
      cmd: 'powershell',
      args: ['-NoProfile', '-NonInteractive', '-Command', windowsRawScript(file, queue)],
    };
  }

  throw new Error(`Raw printing is not supported on ${platform}`);
}

async function withTempFile<T>(
  bytes: Buffer,
  suffix: string,
  fn: (file: string) => Promise<T>,
): Promise<T> {
  const file = path.join(
    os.tmpdir(),
    `orderium-${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`,
  );
  await fs.writeFile(file, bytes, { mode: 0o600 });
  try {
    return await fn(file);
  } finally {
    // A receipt holds customer details; do not leave it in temp.
    await fs.rm(file, { force: true });
  }
}

function queueOf(target: DeviceTarget): string {
  if (!target.systemName) {
    throw new Error(
      'Printer has no systemName. Set the OS queue name in Settings → Printers.',
    );
  }
  return target.systemName;
}

async function queueExists(queue: string): Promise<boolean> {
  try {
    assertSafeQueue(queue);
    if (process.platform === 'win32') {
      await run(
        'powershell',
        ['-NoProfile', '-NonInteractive', '-Command', `Get-Printer -Name '${queue}' | Out-Null`],
        { timeout: 10_000 },
      );
    } else {
      await run('lpstat', ['-p', queue], { timeout: 10_000 });
    }
    return true;
  } catch {
    return false;
  }
}

/** Raw ESC/POS to a USB or otherwise OS-attached receipt printer. */
export class RawSpoolerDevice implements Device {
  async print(bytes: Buffer, target: DeviceTarget): Promise<void> {
    const queue = queueOf(target);
    await withTempFile(bytes, '.bin', async (file) => {
      const { cmd, args } = buildRawCommand(process.platform, file, queue);
      await run(cmd, args, { timeout: 30_000 });
    });
  }

  probe(target: DeviceTarget): Promise<boolean> {
    try {
      return queueExists(queueOf(target));
    } catch {
      return Promise.resolve(false);
    }
  }
}

/** A4 documents: hand the PDF to the OS spooler and let the driver render it. */
export class PdfSpoolerDevice implements Device {
  async print(bytes: Buffer, target: DeviceTarget): Promise<void> {
    const queue = queueOf(target);
    assertSafeQueue(queue);

    await withTempFile(bytes, '.pdf', async (file) => {
      if (process.platform === 'win32') {
        const { print } = await import('pdf-to-printer');
        await print(file, { printer: queue });
      } else {
        await run('lp', ['-d', queue, file], { timeout: 60_000 });
      }
    });
  }

  probe(target: DeviceTarget): Promise<boolean> {
    try {
      return queueExists(queueOf(target));
    } catch {
      return Promise.resolve(false);
    }
  }
}
