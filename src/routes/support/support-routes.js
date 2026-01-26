import Joi from 'joi'
import { getCommsRequestsHandler } from './support-controller.js'

export const supportRoutes = [
  {
    method: 'GET',
    path: '/api/support/comms-requests',
    options: {
      description: 'Get comms requests',
      validate: {
        query: Joi.object({
          agreementReference: Joi.string().optional(),
          claimReference: Joi.string().optional()
        }).xor('agreementReference', 'claimReference')
      },
      handler: getCommsRequestsHandler
    }
  }
]
