import { processMessageRequest } from './process-message-request.js'
import { sendMessageToSingleFrontDoor } from '../services/message-service.js'
import { metricsCounter } from '../common/helpers/metrics.js'

jest.mock('../services/message-service.js', () => ({
  sendMessageToSingleFrontDoor: jest.fn()
}))
jest.mock('../common/helpers/metrics.js')

const mockErrorLogger = jest.fn()

const mockedLogger = {
  warn: jest.fn(),
  error: mockErrorLogger,
  info: jest.fn(),
  setBindings: jest.fn()
}

const mockDb = jest.fn()

describe('processMessageRequest', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test('processes the message if it is valid', async () => {
    const event = {
      crn: 1050000003,
      sbi: 105000003,
      agreementReference: 'somereference',
      claimReference: 'somereference',
      notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d99',
      emailAddress: 'someEmail@email.com',
      customParams: {},
      dateTime: new Date()
    }
    await processMessageRequest(mockedLogger, event, 'message-id', mockDb)

    expect(sendMessageToSingleFrontDoor).toHaveBeenCalledWith(
      mockedLogger,
      event,
      'message-id',
      mockDb
    )
    expect(metricsCounter).toHaveBeenCalledWith(
      'receive-inbound-message-request'
    )
    expect(metricsCounter).toHaveBeenCalledWith('inbound-message-request-valid')
  })

  test('processes the message if it is valid with optional reply to ID', async () => {
    const event = {
      crn: 1050000003,
      sbi: 105000003,
      agreementReference: 'somereference',
      claimReference: 'somereference',
      notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d99',
      emailReplyToId: '123456fc-9999-40c1-a11d-85f55aff5599',
      emailAddress: 'someEmail@email.com',
      customParams: {},
      dateTime: new Date()
    }
    await processMessageRequest(mockedLogger, event, 'message-id', mockDb)

    expect(sendMessageToSingleFrontDoor).toHaveBeenCalledWith(
      mockedLogger,
      event,
      'message-id',
      mockDb
    )
    expect(mockErrorLogger).toHaveBeenCalledTimes(0)
    expect(metricsCounter).toHaveBeenCalledWith(
      'receive-inbound-message-request'
    )
    expect(metricsCounter).toHaveBeenCalledWith('inbound-message-request-valid')
  })

  test('throw error if incoming message is invalid and do not send it to SFD', async () => {
    const invalidEvent = {
      crn: 105,
      sbi: 105000003,
      agreementReference: 'somereference',
      claimReference: 'somereference',
      notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d99',
      emailAddress: 'someEmail@email.com',
      customParams: {},
      dateTime: new Date()
    }

    await expect(
      processMessageRequest(mockedLogger, invalidEvent, mockDb)
    ).rejects.toThrow('Message validation failed')

    expect(mockErrorLogger).toHaveBeenCalled()
    expect(sendMessageToSingleFrontDoor).toHaveBeenCalledTimes(0)
    expect(metricsCounter).toHaveBeenCalledWith(
      'receive-inbound-message-request'
    )
    expect(metricsCounter).not.toHaveBeenCalledWith(
      'inbound-message-request-valid'
    )
  })

  test('throws if incoming message valid but an error is thrown in sending it to SFD', async () => {
    const event = {
      crn: 1050000003,
      sbi: 105000003,
      agreementReference: 'somereference',
      claimReference: 'somereference',
      notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d99',
      emailAddress: 'someEmail@email.com',
      customParams: {},
      dateTime: new Date()
    }

    sendMessageToSingleFrontDoor.mockImplementation(() => {
      throw new Error('I wont send the message to SFD')
    })

    await expect(
      processMessageRequest(mockedLogger, event, mockDb)
    ).rejects.toThrow('I wont send the message to SFD')

    expect(mockErrorLogger).not.toHaveBeenCalled()
    expect(sendMessageToSingleFrontDoor).toHaveBeenCalledTimes(1)
    expect(metricsCounter).toHaveBeenCalledWith(
      'receive-inbound-message-request'
    )
    expect(metricsCounter).toHaveBeenCalledWith('inbound-message-request-valid')
  })
})
