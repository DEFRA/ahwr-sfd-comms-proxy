import { StatusCodes } from 'http-status-codes'
import { redactPII } from '../repositories/comms-requests-repository.js'

export const redactPiiRequestHandlers = [
  {
    method: 'POST',
    path: '/api/redact/pii',
    handler: async (request, h) => {
      request.logger.info('Request for redact PII received')

      await redactPII(
        request.db,
        request.payload.agreementsToRedact.map((x) => x.reference),
        request.logger
      )

      return h.response().code(StatusCodes.OK)
    }
  }
]
