import Joi from 'joi'
import {
  getCommsRequestsHandler,
  supportQueueMessagesHandler
} from './support-controller.js'

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
  },
  {
    method: 'GET',
    path: '/api/support/queue-messages',
    options: {
      description: 'Get queue messages by url',
      validate: {
        query: Joi.object({
          queueUrl: Joi.string().required(),
          limit: Joi.string().optional()
        })
      },
      handler: supportQueueMessagesHandler
    }
  }
]
