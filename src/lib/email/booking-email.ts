import path from 'node:path'
import sharp from 'sharp'
import type { Payload, PayloadRequest } from 'payload'

export type InlineAttachment = { filename: string; content: string; content_id: string }
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[char])
// Same three-toe paw and orange color used by PawMark on the public website.
const paw = '<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84" viewBox="0 0 28 28"><g fill="#f2a33b" transform="rotate(-8 14 14)"><ellipse cx="14" cy="20" rx="10" ry="8"/><circle cx="5" cy="9" r="5"/><circle cx="14" cy="5" r="5"/><circle cx="23" cy="11" r="5"/></g></svg>'

export async function buildBookingEmail(payload: Payload, slot: number, fullName: string, preview = false, kind: 'request' | 'approved' | 'cancelled' = 'request', req?: PayloadRequest) {
  const walk = await payload.findByID({ collection: 'walk-slots', id: slot, depth: 2, overrideAccess: true, req })
  const settings = await payload.findGlobal({ slug: 'email-settings', overrideAccess: true, req })
  const dog = typeof walk.dog === 'object' ? walk.dog : null
  const shelter = typeof walk.shelter === 'object' ? walk.shelter : null
  const zone = settings.timeZone || 'Europe/Warsaw'
  const date = new Intl.DateTimeFormat('en', { dateStyle: 'full', timeZone: zone }).format(new Date(walk.startsAt))
  const time = new Intl.DateTimeFormat('en', { timeStyle: 'short', timeZone: zone }).format(new Date(walk.startsAt))
  const attachments: InlineAttachment[] = [{ filename: 'the-good-walk.png', content_id: 'brand-paw', content: (await sharp(Buffer.from(paw)).png().toBuffer()).toString('base64') }]
  let photo = false
  const media = dog && typeof dog.photo === 'object' ? dog.photo : null
  if (media?.filename && path.basename(media.filename) === media.filename) {
    try {
      const buffer = await sharp(path.join(process.cwd(), 'media', media.filename), { limitInputPixels: 40000000 }).rotate().resize(1120, 640, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82 }).toBuffer()
      attachments.push({ filename: 'walking-companion.jpg', content_id: 'walk-dog', content: buffer.toString('base64') })
      photo = true
    } catch { payload.logger.warn('Email dog photo unavailable; sending confirmation without photo.') }
  }
  const name = dog?.name || 'Your walking companion'
  const firstName = fullName.trim().split(/\s+/)[0] || 'friend'
  const approved = kind === 'approved'
  const cancelled = kind === 'cancelled'
  const greeting = cancelled ? `Hi, ${firstName}. Your walk has been cancelled.` : approved ? `Great news, ${firstName}! Your walk is confirmed.` : `Thanks, ${firstName}! Your walk request has been received.`
  const nextSteps = cancelled ? 'Please do not arrive for this walk. If you would like to arrange another visit or have any questions, please contact the shelter. Thank you for your understanding.' : approved ? 'Your walk is confirmed. Please arrive at the shelter at the time shown above and check in with the team before meeting your walking companion.' : 'Awaiting shelter approval. The team will contact you to confirm your walk and arrival details.'
  const subject = preview ? 'Preview: your Good Walk confirmation' : cancelled ? `Your walk with ${name} has been cancelled` : approved ? `Your walk with ${name} is confirmed!` : `Your walk request with ${name} is in!`
  const text = [preview ? 'TEST PREVIEW ONLY - no booking was created.' : '', greeting, `Dog: ${name}`, `Date: ${date}`, `Time: ${time} (${zone})`, `Duration: ${walk.durationMinutes} minutes`, `Shelter: ${shelter?.name || 'Your shelter'}`, shelter?.address || '', nextSteps, 'The Good Walk'].filter(Boolean).join('\n\n')
  const row = (label: string, value: string) => `<tr><td style="padding:12px 0;border-bottom:1px solid #e5e9df;color:#77816f;font-size:12px;width:88px;vertical-align:top">${label}</td><td style="padding:12px 0;border-bottom:1px solid #e5e9df;color:#284530;font-size:14px;line-height:21px">${escape(value)}</td></tr>`
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f3ed;font-family:Arial,Helvetica,sans-serif;color:#23442f">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${cancelled ? 'Your walk with ' + escape(name) + ' has been cancelled. Please do not arrive for this walk.' : approved ? 'Your walk with ' + escape(name) + ' is confirmed. See you at the shelter!' : 'Your request with ' + escape(name) + ' is saved. The shelter will be in touch.'}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f3ed"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e1e6da;border-radius:20px;overflow:hidden">
  <tr><td style="padding:24px 30px;background:#173f2b"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="padding-right:12px"><img src="cid:brand-paw" width="32" height="32" alt="" style="display:block"></td><td style="font-family:Georgia,serif;font-size:25px;font-weight:bold;color:#fff">The Good Walk</td></tr></table></td></tr>
  ${preview ? '<tr><td style="padding:12px 30px;background:#fff3d9;color:#816027;font-size:12px">TEST PREVIEW &mdash; no booking was created.</td></tr>' : ''}
  <tr><td style="padding:32px 30px 26px"><p style="margin:0 0 14px;color:#a3692d;font-size:10px;letter-spacing:2px;font-weight:bold">A LITTLE WALK. A BIG DIFFERENCE.</p><h1 style="margin:0 0 14px;font:normal 32px/1.2 Georgia,serif;color:#173f2b">${cancelled ? 'Hi, ' + escape(firstName) + '.<br>Your walk has been cancelled.' : approved ? 'Great news, ' + escape(firstName) + '.<br>Your walk is confirmed.' : 'Thanks, ' + escape(firstName) + '.<br>Your request is in.'}</h1><p style="margin:0;color:#72806d;font-size:14px;line-height:24px">${cancelled ? 'We are sorry for the change of plans. The cancelled walk details are below.' : 'A little fresh air and a new friend. Thank you for making time for a shelter dog.'}</p></td></tr>
  ${photo ? `<tr><td style="padding:0 20px"><img src="cid:walk-dog" alt="${escape(name)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:12px"></td></tr>` : ''}
  <tr><td style="padding:24px 30px 8px"><p style="margin:0 0 6px;color:#859079;font-size:10px;letter-spacing:1.5px">${cancelled ? 'CANCELLED WALK' : 'YOUR WALKING COMPANION'}</p><h2 style="margin:0;font:normal 29px Georgia,serif;color:#20432d">${escape(name)}</h2><p style="margin:7px 0 18px;color:#76826e;font-size:13px">${escape(dog?.breed || 'Ready for a little adventure')}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${row('Date', date)}${row('Time', `${time} (${zone})`)}${row('Duration', `${walk.durationMinutes} minutes`)}${row('Shelter', shelter?.name || 'Your shelter')}${shelter?.address ? row('Address', shelter.address) : ''}</table></td></tr>
  <tr><td style="padding:22px 30px 30px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f4e9;border-radius:12px"><tr><td style="padding:20px"><p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#345333">${cancelled ? 'Please update your plans' : approved ? 'You are all set!' : 'What happens next?'}</p><p style="margin:0;color:#6e7d63;font-size:13px;line-height:22px">${escape(nextSteps)}</p></td></tr></table></td></tr>
  <tr><td style="padding:20px 30px;border-top:1px solid #edf0e6;text-align:center"><p style="margin:0;font:italic 17px Georgia,serif;color:#5c7351">Good walks. Happier dogs.</p><p style="margin:10px 0 0;font-size:10px;color:#929b89">THE GOOD WALK &nbsp;&middot;&nbsp; A little time makes a big difference.</p></td></tr></table></td></tr></table></body></html>`
  return { subject, text, html, attachments }
}
