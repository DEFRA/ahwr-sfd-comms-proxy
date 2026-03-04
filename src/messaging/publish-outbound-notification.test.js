import { sendSfdMessageRequest } from './publish-outbound-notification.js'
import { publishMessage, setupClient } from 'ffc-ahwr-common-library'
import { config } from '../config.js'
import { metricsCounter } from '../common/helpers/metrics.js'

jest.mock('ffc-ahwr-common-library')
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  setBindings: jest.fn()
}
jest.mock('../common/helpers/metrics.js')

describe('publish outbound notification', () => {
  beforeAll(() => {
    config.set(
      'sns.sfdCommsTopicArn',
      'arn:aws:sns:eu-west-2:1:ahwr_sfd_comms_request'
    )
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendSfdMessageRequest', () => {
    test('sets up client and then publishes document request event on first call', async () => {
      const startDate = new Date()
      const inputMessageBody = {
        reference: 'ABC123',
        sbi: 'sbi123',
        startDate,
        userType: 'newUser',
        email: 'farmer@farms.com',
        farmerName: 'farmer',
        orgData: {
          orgName: 'any old business',
          orgEmail: 'somebusiness@nowhere.net',
          crn: '123456789'
        }
      }
      await sendSfdMessageRequest(mockLogger, inputMessageBody)

      expect(setupClient).toHaveBeenCalledTimes(1)
      expect(publishMessage).toHaveBeenCalledWith(
        inputMessageBody,
        {
          eventType: config.get('messageTypes.sfdRequestMessageType')
        },
        'arn:aws:sns:eu-west-2:1:ahwr_sfd_comms_request'
      )
      expect(metricsCounter).toHaveBeenCalledWith(
        'send-fcp-sfd-message-request'
      )
    })

    test('skips setting up client and then publishes event on subsequent call', async () => {
      const startDate = new Date()
      const inputMessageBody = {
        reference: 'ABC123',
        sbi: 'sbi123',
        startDate,
        userType: 'newUser',
        email: 'farmer@farms.com',
        farmerName: 'farmer',
        orgData: {
          orgName: 'any old business',
          orgEmail: 'somebusiness@nowhere.net',
          crn: '123456789'
        }
      }

      await sendSfdMessageRequest(mockLogger, inputMessageBody)

      expect(setupClient).toHaveBeenCalledTimes(0)
      expect(publishMessage).toHaveBeenCalledWith(
        inputMessageBody,
        {
          eventType: config.get('messageTypes.sfdRequestMessageType')
        },
        'arn:aws:sns:eu-west-2:1:ahwr_sfd_comms_request'
      )
      expect(metricsCounter).toHaveBeenCalledWith(
        'send-fcp-sfd-message-request'
      )
    })
  })
})
