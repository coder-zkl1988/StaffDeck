// @vitest-environment jsdom

import { createRef } from 'react';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@/i18n';

import type { ComposerAttachment } from '../chatTypes';
import type { UseChatSession } from '../useChatSession';
import Composer from './Composer';

function attachment(index: number): ComposerAttachment {
  return {
    id: `attachment-${index}`,
    filename: `receipt-${index}.pdf`,
    content_type: 'application/pdf',
    size: 64 * 1024,
    kind: 'pdf',
    uploadStatus: 'ready',
    uploadKey: `upload-${index}`,
  };
}

function renderComposer() {
  const composerAttachments = [attachment(1), attachment(2), attachment(3)];
  const chat = {
    input: '',
    setInput: vi.fn(),
    slashCommands: [],
    composerAttachments,
    composerDragActive: false,
    composerPlusOpen: false,
    setComposerPlusOpen: vi.fn(),
    composerIntent: null,
    setComposerIntent: vi.fn(),
    readyComposerAttachments: composerAttachments,
    uploadingComposerAttachment: false,
    currentSessionRunning: false,
    composerActive: true,
    showComposerAvatar: false,
    displayedProfile: null,
    displayedAgent: null,
    emptyRoleSummary: '',
    emptyProfileTags: [],
    emptyStats: [],
    enabledModelConfigs: [],
    selectedModelConfig: null,
    changeModelConfig: vi.fn(),
    showModelSetupNotice: false,
    modelSetupNoticeText: '',
    canConfigureModels: false,
    setModelSetupOpen: vi.fn(),
    isComposing: false,
    setIsComposing: vi.fn(),
    fileInputRef: createRef<HTMLInputElement>(),
    send: vi.fn(),
    abortStream: vi.fn(),
    handleComposerPaste: vi.fn(),
    handleComposerFileChange: vi.fn(),
    handleComposerDragEnter: vi.fn(),
    handleComposerDragOver: vi.fn(),
    handleComposerDragLeave: vi.fn(),
    handleComposerDrop: vi.fn(),
    removeComposerAttachment: vi.fn(),
    handleComposerPlusAction: vi.fn(),
  } as unknown as UseChatSession;

  return render(
    <I18nProvider>
      <Composer chat={chat} />
    </I18nProvider>,
  );
}

describe('Composer attachment strip', () => {
  it('keeps attachments in one horizontally scrollable row', () => {
    renderComposer();

    const strip = screen.getByRole('list', { name: '待发送附件' });

    expect(strip.className).toContain('flex-nowrap');
    expect(strip.className).toContain('overflow-x-auto');
    expect(strip.className).toContain('overflow-y-hidden');
    expect(strip.className).toContain('[scrollbar-width:none]');
    expect(strip.className).toContain('[&::-webkit-scrollbar]:hidden');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getAllByRole('listitem')[0].className).toContain('shrink-0');
  });

  it('shows edge fades only where attachments remain outside the visible area', () => {
    const { container } = renderComposer();
    const strip = within(container).getByRole('list', { name: '待发送附件' });

    Object.defineProperties(strip, {
      clientWidth: { configurable: true, value: 320 },
      scrollWidth: { configurable: true, value: 900 },
      scrollLeft: { configurable: true, value: 0, writable: true },
    });

    fireEvent.scroll(strip);
    expect(container.querySelector('[data-attachment-overflow="left"]')).toBeNull();
    expect(container.querySelector('[data-attachment-overflow="right"]')).not.toBeNull();

    strip.scrollLeft = 240;
    fireEvent.scroll(strip);
    expect(container.querySelector('[data-attachment-overflow="left"]')).not.toBeNull();
    expect(container.querySelector('[data-attachment-overflow="right"]')).not.toBeNull();

    strip.scrollLeft = 580;
    fireEvent.scroll(strip);
    expect(container.querySelector('[data-attachment-overflow="left"]')).not.toBeNull();
    expect(container.querySelector('[data-attachment-overflow="right"]')).toBeNull();
  });
});
