import Joi from 'joi'
import {
  getCommsRequestsHandler,
  supportQueueMessagesHandler,
  supportIsDeadLetterQueueHandler,
  supportApplyQueueActionsHandler
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
          limit: Joi.number().integer().required()
        })
      },
      handler: supportQueueMessagesHandler
    }
  },
  {
    method: 'GET',
    path: '/api/support/queue-messages/is-dlq',
    options: {
      description: 'Check whether a queue is a dead-letter queue',
      validate: {
        query: Joi.object({
          queueUrl: Joi.string().required()
        })
      },
      handler: supportIsDeadLetterQueueHandler
    }
  },
  {
    method: 'POST',
    path: '/api/support/queue-messages/actions',
    options: {
      description: 'Delete or reapply dead-letter queue messages',
      validate: {
        payload: Joi.object({
          queueUrl: Joi.string().required(),
          actions: Joi.array()
            .items(
              Joi.object({
                id: Joi.string().required(),
                action: Joi.string().valid('delete', 'reapply').required()
              })
            )
            .min(1)
            .required()
        })
      },
      handler: supportApplyQueueActionsHandler
    }
  }
]
