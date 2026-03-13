import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  blobToFile,
  fetchImageAsFile,
  sanitizeFilename,
  shareFileOrDownload,
} from '@/lib/share/files';

function setupDownloadEnvironment() {
  const click = vi.fn();
  const remove = vi.fn();
  const anchor = {
    click,
    remove,
    href: '',
    download: '',
    rel: '',
  } as unknown as HTMLAnchorElement;

  const body = {
    appendChild: vi.fn(),
  };

  const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  const revokeObjectURL = vi.fn();

  vi.stubGlobal(
    'document',
    {
      createElement: vi.fn().mockReturnValue(anchor),
      body,
    } as unknown as Document,
  );
  vi.stubGlobal(
    'window',
    {
      setTimeout: (callback: TimerHandler) => {
        if (typeof callback === 'function') {
          callback();
        }
        return 1;
      },
    } as unknown as Window & typeof globalThis,
  );
  vi.stubGlobal('URL', {
    createObjectURL,
    revokeObjectURL,
  } as unknown as typeof URL);

  return {
    anchor,
    body,
    click,
    createObjectURL,
    remove,
    revokeObjectURL,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('share file utilities', () => {
  it('sanitizes filenames and falls back when result is empty', () => {
    expect(sanitizeFilename('  Morning Run #1.PNG  ')).toBe('morning-run-1.png');
    expect(sanitizeFilename('---###---')).toBe('huuman-share');
  });

  it('creates a file from a blob with default mime fallback', () => {
    const blob = new Blob(['mock'], { type: '' });
    const file = blobToFile(blob, 'example.png');

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('example.png');
    expect(file.type).toBe('image/png');
  });

  it('fetches an image and returns it as File', async () => {
    const blob = new Blob(['img'], { type: 'image/jpeg' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(blob),
    });
    vi.stubGlobal('fetch', fetchMock);

    const file = await fetchImageAsFile('https://example.com/p.jpg', 'photo.jpg');

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/p.jpg');
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('photo.jpg');
    expect(file.type).toBe('image/jpeg');
  });

  it('throws with status code when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );

    await expect(
      fetchImageAsFile('https://example.com/unavailable.jpg', 'photo.jpg'),
    ).rejects.toThrow('Failed to fetch image: 503');
  });

  it('uses Web Share API when supported and allowed by canShare', async () => {
    const file = new File(['img'], 'share.png', { type: 'image/png' });
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { share, canShare } as unknown as Navigator);

    const outcome = await shareFileOrDownload({
      file,
      title: 'huuman',
      text: 'Shared from huuman',
    });

    expect(outcome).toBe('shared');
    expect(canShare).toHaveBeenCalledWith({
      title: 'huuman',
      text: 'Shared from huuman',
      files: [file],
    });
    expect(share).toHaveBeenCalledWith({
      title: 'huuman',
      text: 'Shared from huuman',
      files: [file],
    });
  });

  it('returns cancelled when user closes share sheet', async () => {
    const file = new File(['img'], 'share.png', { type: 'image/png' });
    vi.stubGlobal(
      'navigator',
      {
        canShare: vi.fn().mockReturnValue(true),
        share: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')),
      } as unknown as Navigator,
    );

    const outcome = await shareFileOrDownload({ file });

    expect(outcome).toBe('cancelled');
  });

  it('downloads file when canShare rejects provided payload', async () => {
    const file = new File(['img'], 'share.png', { type: 'image/png' });
    const { body, click, createObjectURL, revokeObjectURL } = setupDownloadEnvironment();
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(false);
    vi.stubGlobal('navigator', { share, canShare } as unknown as Navigator);

    const outcome = await shareFileOrDownload({
      file,
      downloadName: 'manual-share.png',
      title: 'huuman',
    });

    expect(outcome).toBe('downloaded');
    expect(share).not.toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect((body.appendChild as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    expect((body.appendChild as ReturnType<typeof vi.fn>).mock.calls[0][0].download).toBe(
      'manual-share.png',
    );
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
