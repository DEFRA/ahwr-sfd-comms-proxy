import { sendMessageToSingleFrontDoor } from '../services/message-service.js'
import { validateInboundMessageRequest } from './schemas/schemas.js'

export const processMessageRequest = async (logger, message, messageId, db) => {
  if (validateInboundMessageRequest(logger, message)) {
    await sendMessageToSingleFrontDoor(logger, message, messageId, db)
    logger.info('Message processing successful')
  } else {
    logger.error('Message validation failed')
    throw new Error('Message validation failed')
  }
}
