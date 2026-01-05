import {
  configureAndStart,
  stopSubscriber
} from './message-request-queue-subscriber.js'
import { SqsSubscriber } from 'ffc-ahwr-common-library'
import { getLogger } from '../common/helpers/logging/logger.js'
import { config } from '../config.js'
import { processMessageRequest } from './process-message-request.js'

jest.mock('../common/helpers/logging/logger.js')
jest.mock('./process-message-request.js')
jest.mock('ffc-ahwr-common-library')

describe('MessageRequestQueueSubscriber', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    config.set(
      'sqs.commsRequestQueueUrl',
      'http://localhost:4576/queue/comms-request-queue'
    )
    config.set('aws.region', 'eu-west-2')
    config.set('aws.endpointUrl', 'http://localhost:4576')
  })
  describe('configureAndStart', () => {
    it('should configure and start the SQS subscriber', async () => {
      const mockLogger = {
        child: jest.fn().mockReturnValue({
          info: jest.fn()
        })
      }
      getLogger.mockReturnValueOnce(mockLogger)
      const mockDb = {}

      await configureAndStart(mockDb)

      expect(SqsSubscriber).toHaveBeenCalledTimes(1)
      expect(SqsSubscriber).toHaveBeenCalledWith({
        awsEndpointUrl: 'http://localhost:4576',
        logger: mockLogger.child(),
        region: 'eu-west-2',
        queueUrl: 'http://localhost:4576/queue/comms-request-queue',
        onMessage: expect.any(Function)
      })
      expect(SqsSubscriber.mock.instances[0].start).toHaveBeenCalledTimes(1)
    })

    it('should pass message on via OnMessage function', async () => {
      const mockLogger = {
        child: jest.fn().mockReturnValue({
          info: jest.fn()
        })
      }
      getLogger.mockReturnValue(mockLogger)
      processMessageRequest.mockResolvedValueOnce()
      const mockDb = {}

      const onMessage = await configureAndStart(mockDb)

      await onMessage({ Message: 'test' }, { Attribute: 'value' })

      expect(processMessageRequest).toHaveBeenCalledTimes(1)
    })
  })
  describe('stopSubscriber', () => {
    it('should stop the SQS subscriber', async () => {
      const mockLogger = {
        child: jest.fn().mockReturnValue({
          info: jest.fn()
        })
      }
      getLogger.mockReturnValueOnce(mockLogger)
      const mockDb = {}

      await configureAndStart(mockDb)

      await stopSubscriber()

      const subscriberInstance = SqsSubscriber.mock.instances[0]

      expect(subscriberInstance.stop).toHaveBeenCalledTimes(1)
    })

    it('should do nothing if the SQS subscriber is not present', async () => {
      const mockLogger = jest.fn()
      getLogger.mockReturnValueOnce(mockLogger)

      await stopSubscriber()

      const subscriberInstance = SqsSubscriber.mock.instances[0]

      expect(subscriberInstance).toBeUndefined()
    })
  })
})
