import { vi } from 'vitest'

/**
 * The network guard: tests run with global `fetch` replaced by a spy that records every
 * request. A request is answered only by a handler a test registered (see `respondTo`);
 * anything else is refused and fails the test in `afterEach` (see setup.ts). Throwing alone
 * would not be enough, because the email hooks and the seed catch their errors.
 */

export type RecordedRequest = { method: string; url: string; handled: boolean }

/** Answers a request, or returns undefined to leave it to the next handler. */
type Handler = (request: Request) => Response | undefined | Promise<Response | undefined>

const handlers: Handler[] = []
const recorded: RecordedRequest[] = []

export const guardedFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = new Request(input, init)
  for (const handler of handlers) {
    const response = await handler(request.clone())
    if (response) {
      recorded.push({ method: request.method, url: request.url, handled: true })
      return response
    }
  }
  recorded.push({ method: request.method, url: request.url, handled: false })
  throw new Error(`Network request blocked in tests: ${request.method} ${request.url}`)
})

/** Lets requests to `hostname` through to `answer`. Removed after each test. */
export function respondTo(
  hostname: string,
  answer: (request: Request) => Response | Promise<Response>,
) {
  handlers.push((request) =>
    new URL(request.url).hostname === hostname ? answer(request) : undefined,
  )
}

/** Every request since the last check. */
export const requests = () => [...recorded]

/** Removes the handlers and returns the requests no handler answered, then forgets them. */
export function takeUnexpectedRequests() {
  const unexpected = recorded.filter((request) => !request.handled)
  recorded.length = 0
  handlers.length = 0
  return unexpected
}
