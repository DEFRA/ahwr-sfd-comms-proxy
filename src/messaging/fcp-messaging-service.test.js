import { createServiceBusClient } from 'ffc-ahwr-common-library'
import {
  sendSfdMessageRequest,
  startMessagingService,
  stopMessagingService
} from './fcp-messaging-service.js'

jest.mock('ffc-ahwr-common-library')

describe('fcp-messaging-service', () => {
  describe('start and stop service', () => {
    const mockClient = {
      close: jest.fn()
    }
    beforeEach(() => {
      jest.resetAllMocks()
      createServiceBusClient.mockReturnValueOnce(mockClient)
    })
    it('should do nothing if the client unavailable', async () => {
      await stopMessagingService()

      expect(mockClient.close).not.toHaveBeenCalled()
    })
    it('should stop the client if available', async () => {
      await startMessagingService()
      await stopMessagingService()

      expect(mockClient.close).toHaveBeenCalledTimes(1)
    })
  })

  describe('sendSfdMessageRequest', () => {
    it('creates and sends message', async () => {
      const mockSendMessage = jest.fn()
      const mockClient = {
        sendMessage: mockSendMessage,
        close: jest.fn()
      }
      createServiceBusClient.mockReturnValueOnce(mockClient)

      await startMessagingService()

      const sfdMessageRequest = { id: '123', content: 'Test message' }
      await sendSfdMessageRequest(sfdMessageRequest)

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          body: sfdMessageRequest,
          type: 'uk.gov.ffc.ahwr.submit.sfd.message.request',
          source: 'ahwr-sfd-comms-proxy',
          options: {}
        },
        'fcp-fd-comms-dev'
      )
    })
  })
})
