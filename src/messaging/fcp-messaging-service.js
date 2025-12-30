import { createServiceBusClient } from 'ffc-ahwr-common-library'
import { config } from '../config.js'
import { metricsCounter } from '../common/helpers/metrics.js'

let fcpMessageClient

const serviceBusConfig = config.get('outboundMessage')

export const startMessagingService = async () => {
  const { host, username, password } = serviceBusConfig.serviceBus
  fcpMessageClient = createServiceBusClient({
    host,
    username,
    password,
    proxyUrl: config.get('httpProxy')
  })
}

export const stopMessagingService = async () => {
  if (fcpMessageClient) {
    await fcpMessageClient.close()
  }
}

export const sendSfdMessageRequest = async (sfdMessageRequest) => {
  const { messageType, sfdMessageTopic } = serviceBusConfig
  const message = createMessage(sfdMessageRequest, messageType)

  fcpMessageClient.sendMessage(message, sfdMessageTopic)
  await metricsCounter('send-fcp-sfd-message-request')
}

const createMessage = (body, type) => {
  return {
    body,
    type,
    source: 'ahwr-sfd-comms-proxy',
    options: {}
  }
}
