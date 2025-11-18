import { config } from '../config.js'
import { SqsSubscriber } from 'ffc-ahwr-common-library'
import { getLogger } from '../common/helpers/logging/logger.js'
import { processMessageRequest } from './process-message-request.js'

let messageRequestSubscriber

export async function configureAndStart(db) {
  messageRequestSubscriber = new SqsSubscriber({
    queueUrl: config.get('sqs.commsRequestQueueUrl'),
    logger: getLogger(),
    region: config.get('aws.region'),
    awsEndpointUrl: config.get('aws.endpointUrl'),
    async onMessage(message, attributes) {
      getLogger().info(attributes, 'Received incoming message')
      await processMessageRequest(getLogger(), message, db)
    }
  })
  await messageRequestSubscriber.start()
}

export async function stopSubscriber() {
  if (messageRequestSubscriber) {
    await messageRequestSubscriber.stop()
  }
}
