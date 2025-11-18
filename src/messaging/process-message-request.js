import { sendMessageToSingleFrontDoor } from '../services/message-service.js'
import { validateInboundMessageRequest } from './schemas/schemas.js'

export const processMessageRequest = async (logger, message, db) => {
  if (validateInboundMessageRequest(logger, message)) {
    // TODO: we no longer get a message Id which we used to in the input, we will have to generate one

    await sendMessageToSingleFrontDoor(logger, message, db)
    logger.info('Message processing successful')
  } else {
    logger.error('Message validation failed')
    throw new Error('Message validation failed')
  }
}
