import { publishMessage, setupClient } from 'ffc-ahwr-common-library'
import { config } from '../config.js'
import { getLogger } from '../common/helpers/logging/logger.js'
import { metricsCounter } from '../common/helpers/metrics.js'

const { sfdRequestMessageType } = config.get('messageTypes')

let clientConfigured

function configureClient() {
  if (!clientConfigured) {
    setupClient(
      config.get('aws.region'),
      config.get('aws.endpointUrl'),
      getLogger(),
      config.get('sns.sfdCommsTopicArn')
    )
    clientConfigured = true
  }
}

export async function sendSfdMessageRequest(logger, sdfMessageRequest) {
  configureClient()

  const attributes = {
    eventType: sfdRequestMessageType
  }

  await publishMessage(sdfMessageRequest, attributes)

  logger.info('Reminder event published')
  await metricsCounter('send-fcp-sfd-message-request')
}
