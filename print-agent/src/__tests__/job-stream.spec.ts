import { SseParser } from '../job-stream';

describe('SseParser', () => {
  it('emits a complete event', () => {
    const seen: string[] = [];
    const parser = new SseParser((d) => seen.push(d));
    parser.push('data: {"jobId":"j1"}\n\n');
    expect(seen).toEqual(['{"jobId":"j1"}']);
  });

  it('waits for the blank line that terminates an event', () => {
    const seen: string[] = [];
    const parser = new SseParser((d) => seen.push(d));
    parser.push('data: {"jobId":"j1"}\n');
    expect(seen).toEqual([]);
    parser.push('\n');
    expect(seen).toEqual(['{"jobId":"j1"}']);
  });

  it('reassembles an event split across chunk boundaries', () => {
    // A TCP read can land anywhere, including mid-field.
    const seen: string[] = [];
    const parser = new SseParser((d) => seen.push(d));
    parser.push('data: {"job');
    parser.push('Id":"j1"}\n\n');
    expect(seen).toEqual(['{"jobId":"j1"}']);
  });

  it('handles several events in one chunk', () => {
    const seen: string[] = [];
    const parser = new SseParser((d) => seen.push(d));
    parser.push('data: a\n\ndata: b\n\n');
    expect(seen).toEqual(['a', 'b']);
  });

  it('ignores comment keep-alives', () => {
    // Proxies get these every few seconds; they are not events.
    const seen: string[] = [];
    const parser = new SseParser((d) => seen.push(d));
    parser.push(': keep-alive\n\n');
    expect(seen).toEqual([]);
  });

  it('ignores non-data fields', () => {
    const seen: string[] = [];
    const parser = new SseParser((d) => seen.push(d));
    parser.push('event: message\nid: 7\ndata: payload\n\n');
    expect(seen).toEqual(['payload']);
  });

  it('joins multi-line data with newlines, per the SSE spec', () => {
    const seen: string[] = [];
    const parser = new SseParser((d) => seen.push(d));
    parser.push('data: one\ndata: two\n\n');
    expect(seen).toEqual(['one\ntwo']);
  });

  it('tolerates CRLF line endings', () => {
    const seen: string[] = [];
    const parser = new SseParser((d) => seen.push(d));
    parser.push('data: x\r\n\r\n');
    expect(seen).toEqual(['x']);
  });
});
