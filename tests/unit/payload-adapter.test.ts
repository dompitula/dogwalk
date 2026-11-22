import type { Payload, SendEmailOptions } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deliverEmail } from '@/lib/email/email-settings'
import { payloadResendAdapter } from '@/lib/email/payload-adapter'

vi.mock('@/lib/email/email-settings', () => ({ deliverEmail: vi.fn() }))

const payload = { logger: { warn: vi.fn() } } as unknown as Payload
const adapter = payloadResendAdapter({ payload })
const send = (message: SendEmailOptions) => adapter.sendEmail(message)

beforeEach(() => {
  vi.mocked(deliverEmail).mockReset()
  vi.mocked(deliverEmail).mockResolvedValue(true)
})

describe('payloadResendAdapter', () => {
  it('normalises string and object addresses', async () => {
    await send({
      to: [{ name: 'Maya', address: 'maya@example.com' }, 'alex@example.com'],
      cc: 'cc@example.com',
      bcc: { name: 'Audit', address: 'audit@example.com' },
      replyTo: 'staff@example.org',
      subject: 'Reset your password',
      text: 'Hello',
      html: Buffer.from('<p>Hello</p>'),
    })

    expect(deliverEmail).toHaveBeenCalledWith(
      payload,
      {
        to: ['maya@example.com', 'alex@example.com'],
        cc: ['cc@example.com'],
        bcc: ['audit@example.com'],
        reply_to: ['staff@example.org'],
        subject: 'Reset your password',
        text: 'Hello',
        html: '<p>Hello</p>',
      },
      undefined,
      // System emails (password resets) are sent even when booking emails are switched off.
      false,
    )
  })

  it('leaves out empty address lists and uses a default subject', async () => {
    await send({ to: 'maya@example.com' })
    expect(vi.mocked(deliverEmail).mock.calls[0][1]).toEqual({
      to: ['maya@example.com'],
      subject: 'The Good Walk',
      text: undefined,
      html: undefined,
    })
  })

  it('rejects attachments', async () => {
    await expect(
      send({ to: 'maya@example.com', attachments: [{ filename: 'a.txt', content: 'a' }] }),
    ).rejects.toThrow('System email attachments are not supported by this adapter.')
    expect(deliverEmail).not.toHaveBeenCalled()
  })

  it('throws for a message without a recipient', async () => {
    await expect(send({ subject: 'Nobody' })).rejects.toThrow('System email has no recipient.')
    expect(deliverEmail).not.toHaveBeenCalled()
  })

  it('throws when email is not configured', async () => {
    vi.mocked(deliverEmail).mockResolvedValue(false)
    await expect(send({ to: 'maya@example.com' })).rejects.toThrow('Email is not configured.')
  })
})
