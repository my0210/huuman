import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  blobToFile,
  fetchImageAsFile,
  sanitizeFilename,
  shareFileOrDownload,
} from '@/lib/share/files';

const originalNavigator = globalThis.navigator;
const originalDocument = globalThis.document;
const originalWindow = (globalThis as { window?: Window }).window;
const originalURL = globalThis.URL;
const originalFetch = globalThis.fetch;

function setGlobal(name: string, value: unknown) {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}

function restoreGlobal(name: string, value: unknown) {
  if (value === undefined) {
    Reflect.deleteProperty(globalThis, name);
    return;
  }

  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}

function setupDownloadEnvironment() {
  const anchor = {
    href: '',
    download: '',
    rel: '',
    click: vi.fn(),
    remove: vi.fn(),
  };

  const appendChild = vi.fn();
  const createElement = vi.fn((tag: string) => {
    if (tag !== 'a') {
      throw new Error(`Unexpected tag: ${tag}`);
    }
    return anchor;
  });

  setGlobal('document', {
    createElement,
    body: { appendChild },
  } as unknown as Document);

  const setTimeoutMock = vi.fn(() => 1);
  setGlobal('window', { setTimeout: setTimeoutMock } as unknown as Window);

  const createObjectURL = vi.fn(() => 'blob:share-url');
  const revokeObjectURL = vi.fn();
  setGlobal(
    'URL',
    {
      createObjectURL,
      revokeObjectURL,
    } as unknown as typeof URL,
  );

  return { anchor, appendChild, createElement, setTimeoutMock, createObjectURL, revokeObjectURL };
}

afterEach(() => {
  vi.restoreAllMocks();
  restoreGlobal('navigator', originalNavigator);
  restoreGlobal('document', originalDocument);
  restoreGlobal('window', originalWindow);
  restoreGlobal('URL', originalURL);
  restoreGlobal('fetch', originalFetch);
});

describe('sanitizeFilename', () => {
  it('normalizes casing and strips unsafe characters', () => {
    expect(sanitizeFilename('  Huuman Sleep + Recovery!!  ')).toBe('huuman-sleep-recovery');
    expect(sanitizeFilename('Week_1.Progress.PNG')).toBe('week_1.progress.png');
  });

  it('falls back to default when all characters are removed', () => {
    expect(sanitizeFilename('   !!!   ')).toBe('huuman-share');
  });
});

describe('blobToFile', () => {
  it('defaults to image/png when blob type is empty', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(12345);
    const blob = new Blob(['data']);

    const file = blobToFile(blob, 'export.png');

    expect(file.name).toBe('export.png');
    expect(file.type).toBe('image/png');
    expect(file.lastModified).toBe(12345);
    nowSpy.mockRestore();
  });
});

describe('fetchImageAsFile', () => {
  it('throws on non-2xx fetch responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    setGlobal('fetch', fetchMock);

    await expect(fetchImageAsFile('https://example.com/image.png', 'image.png')).rejects.toThrow(
      'Failed to fetch image: 503',
    );
  });

  it('returns a File with blob metadata when fetch succeeds', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(54321);
    const blob = new Blob(['abc'], { type: 'image/jpeg' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    });
    setGlobal('fetch', fetchMock);

    const file = await fetchImageAsFile('https://example.com/photo.jpg', 'share.jpg');

    expect(file.name).toBe('share.jpg');
    expect(file.type).toBe('image/jpeg');
    expect(file.lastModified).toBe(54321);
    nowSpy.mockRestore();
  });
});

describe('shareFileOrDownload', () => {
  it('shares when Web Share API accepts files', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    setGlobal('navigator', { share, canShare } as unknown as Navigator);

    const file = new File(['payload'], 'card.png', { type: 'image/png' });
    const outcome = await shareFileOrDownload({
      file,
      title: 'huuman',
      text: 'share text',
    });

    expect(outcome).toBe('shared');
    expect(canShare).toHaveBeenCalledWith({
      title: 'huuman',
      text: 'share text',
      files: [file],
    });
    expect(share).toHaveBeenCalledWith({
      title: 'huuman',
      text: 'share text',
      files: [file],
    });
  });

  it('returns cancelled when user dismisses native share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('User cancelled', 'AbortError'));
    setGlobal('navigator', { share } as unknown as Navigator);

    const file = new File(['payload'], 'card.png', { type: 'image/png' });
    const outcome = await shareFileOrDownload({ file });

    expect(outcome).toBe('cancelled');
  });

  it('falls back to file download when file sharing is unsupported', async () => {
    const env = setupDownloadEnvironment();
    const share = vi.fn();
    const canShare = vi.fn().mockReturnValue(false);
    setGlobal('navigator', { share, canShare } as unknown as Navigator);

    const file = new File(['payload'], 'card.png', { type: 'image/png' });
    const outcome = await shareFileOrDownload({
      file,
      downloadName: 'manual-send.png',
    });

    expect(outcome).toBe('downloaded');
    expect(share).not.toHaveBeenCalled();
    expect(env.createElement).toHaveBeenCalledWith('a');
    expect(env.appendChild).toHaveBeenCalledWith(env.anchor);
    expect(env.anchor.download).toBe('manual-send.png');
    expect(env.anchor.rel).toBe('noopener');
    expect(env.anchor.click).toHaveBeenCalledTimes(1);
    expect(env.anchor.remove).toHaveBeenCalledTimes(1);
    expect(env.createObjectURL).toHaveBeenCalledWith(file);
    expect(env.setTimeoutMock).toHaveBeenCalledTimes(1);
  });

  it('rethrows non-cancellation share errors', async () => {
    const share = vi.fn().mockRejectedValue(new Error('share failed'));
    setGlobal('navigator', { share } as unknown as Navigator);

    const file = new File(['payload'], 'card.png', { type: 'image/png' });
    await expect(shareFileOrDownload({ file })).rejects.toThrow('share failed');
  });
});
