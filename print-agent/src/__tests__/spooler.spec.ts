import { buildRawCommand } from '../devices/spooler';

describe('buildRawCommand', () => {
  it('uses lp with raw mode on Linux', () => {
    const { cmd, args } = buildRawCommand('linux', '/tmp/j.bin', 'TM-T20');
    expect(cmd).toBe('lp');
    // Without -o raw, CUPS interprets ESC/POS control codes as text and
    // prints garbage instead of a receipt.
    expect(args).toEqual(['-d', 'TM-T20', '-o', 'raw', '/tmp/j.bin']);
  });

  it('uses lp with raw mode on macOS', () => {
    const { cmd, args } = buildRawCommand('darwin', '/tmp/j.bin', 'TM-T20');
    expect(cmd).toBe('lp');
    expect(args).toContain('raw');
  });

  it('uses PowerShell winspool on Windows rather than a native module', () => {
    const { cmd, args } = buildRawCommand('win32', 'C:\\tmp\\j.bin', 'TM-T20');
    expect(cmd).toBe('powershell');
    const script = args.join(' ');
    expect(script).toContain('winspool.drv');
    expect(script).toContain('TM-T20');
    expect(script).toContain('C:\\tmp\\j.bin');
    // RAW datatype is what stops the spooler rendering the bytes as a document.
    expect(script).toContain("pDataType='RAW'");
  });

  it('refuses an unsupported platform rather than printing garbage', () => {
    expect(() => buildRawCommand('aix', '/tmp/j.bin', 'q')).toThrow(/aix/);
  });

  it('rejects a queue name containing shell metacharacters', () => {
    // Queue names come from the API and reach a shell; treat them as untrusted.
    expect(() => buildRawCommand('linux', '/tmp/j.bin', 'q; rm -rf /')).toThrow(
      /queue name/i,
    );
  });

  it('rejects a queue name containing a quote', () => {
    // A quote would break out of the PowerShell string literal.
    expect(() => buildRawCommand('win32', 'C:\\j.bin', "q' ; calc #")).toThrow(
      /queue name/i,
    );
  });

  it('accepts ordinary printer names with spaces and punctuation', () => {
    expect(() =>
      buildRawCommand('linux', '/tmp/j.bin', 'EPSON TM-T20III Receipt_2'),
    ).not.toThrow();
  });
});
