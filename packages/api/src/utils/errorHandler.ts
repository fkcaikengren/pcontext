import type { ErrorHandler } from 'hono'

export const errorHandler: ErrorHandler = (err, c) => {
	const logger = c.get('logger')
	let status = 500
	let message = 'Unknown error'

	const anyErr = err as any
	if (anyErr && typeof anyErr.status === 'number') {
		status = anyErr.status
		if (typeof anyErr.message === 'string' && anyErr.message.length > 0) {
			message = anyErr.message
		}
	} else if (err instanceof Error) {
		message = err.message
	}

	if (logger) {
		logger.error({ err, path: c.req.path, method: c.req.path, status }, 'Unhandled error')
	}

	return c.json({ message }, status)
}
