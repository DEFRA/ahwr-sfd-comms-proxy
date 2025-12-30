import { sendMessageToSingleFrontDoor } from '../services/message-service.js'
import { validateInboundMessageRequest } from './schemas/schemas.js'
import { metricsCounter } from '../common/helpers/metrics.js'

export const processMessageRequest = async (logger, message, messageId, db) => {
  await metricsCounter('receive-inbound-message-request')
  if (validateInboundMessageRequest(logger, message)) {
    await metricsCounter('inbound-message-request-valid')
    await sendMessageToSingleFrontDoor(logger, message, messageId, db)
    logger.info('Message processing successful')
  } else {
    throw new Error('Message validation failed')
  }
}
