import { randomUUID } from 'node:crypto'
import {
  sendMessageToSingleFrontDoor,
  buildOutboundMessage
} from './message-service'
import {
  createLogEntry,
  updateLogEntry
} from '../repositories/comms-requests-repository.js'
import { config } from '../config.js'
import { sendSfdMessageRequest } from '../messaging/publish-outbound-notification.js'

const now = new Date().toISOString()
const SFD_EMAIL_REPLYTO_ID = 'c3e9149b-9490-4321-808c-72e709d9d814'

jest.mock('../repositories/comms-requests-repository.js', () => ({
  createLogEntry: jest.fn(),
  updateLogEntry: jest.fn()
}))

jest.mock('../messaging/publish-outbound-notification', () => ({
  sendSfdMessageRequest: jest.fn()
}))

const mockDb = {
  collection: jest.fn().mockReturnThis(),
  insertOne: jest.fn(),
  updateOne: jest.fn()
}

const mockSetBindingsLogger = jest.fn()
const mockedLogger = {
  setBindings: mockSetBindingsLogger,
  info: jest.fn(),
  error: jest.fn()
}

describe('sendMessageToSingleFrontDoor', () => {
  config.set('sfdEmailReplyToId', SFD_EMAIL_REPLYTO_ID)
  const validInboundMessage = {
    crn: 1234567890,
    sbi: 123456789,
    agreementReference: 'IAHW-ABC1-5899',
    claimReference: 'RESH-F99F-E09F',
    notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d99',
    emailAddress: 'an@email.com',
    customParams: {},
    dateTime: now
  }

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('returns message with id and crn when processing is successful', async () => {
    const outboundMessage = await sendMessageToSingleFrontDoor(
      mockedLogger,
      validInboundMessage,
      mockDb
    )

    expect(outboundMessage).not.toBeNull()
    expect(outboundMessage).toHaveProperty('id')
    expect(outboundMessage).toHaveProperty('data.crn')
    expect(mockSetBindingsLogger).toHaveBeenCalledWith({
      messageLogCreatedWithId: expect.any(String)
    })
    expect(mockSetBindingsLogger).toHaveBeenCalledWith({
      outboundMessageId: expect.any(String)
    })
  })

  test('throws an error when fail to store message log database item', async () => {
    createLogEntry.mockImplementation(() => {
      throw new Error('Faked data persistence error')
    })

    await expect(
      sendMessageToSingleFrontDoor(mockedLogger, validInboundMessage, mockDb)
    ).rejects.toThrow(
      'Failed to save message log. Faked data persistence error'
    )

    expect(sendSfdMessageRequest).toHaveBeenCalledTimes(0)
    expect(updateLogEntry).toHaveBeenCalledTimes(0)
    expect(mockSetBindingsLogger).toHaveBeenCalledTimes(1)
  })

  test('throws an error when fail to update message log database item', async () => {
    sendSfdMessageRequest.mockResolvedValueOnce()
    updateLogEntry.mockImplementation(() => {
      throw new Error('Faked data persistence error')
    })

    await expect(
      sendMessageToSingleFrontDoor(mockedLogger, validInboundMessage, mockDb)
    ).rejects.toThrow(
      'Failed to update message log. Faked data persistence error'
    )

    expect(sendSfdMessageRequest).toHaveBeenCalledTimes(1)
    expect(sendSfdMessageRequest).toHaveBeenCalledWith(
      mockedLogger,
      expect.any(Object)
    )
    expect(updateLogEntry).toHaveBeenCalledTimes(1)
    expect(mockSetBindingsLogger).toHaveBeenCalledTimes(2)
  })

  test('stores that the message was not sent, if the SFD request fails', async () => {
    const mockError = new Error('Faked message send error')
    sendSfdMessageRequest.mockImplementation(() => {
      throw mockError
    })
    createLogEntry.mockImplementation(jest.fn())

    await expect(
      sendMessageToSingleFrontDoor(
        mockedLogger,
        validInboundMessage,
        'message-id',
        mockDb
      )
    ).rejects.toThrow('Failed to send outbound message to SFD')

    expect(createLogEntry).toHaveBeenCalledWith(mockDb, {
      agreementReference: 'IAHW-ABC1-5899',
      claimReference: 'RESH-F99F-E09F',
      data: {
        inboundMessage: {
          agreementReference: 'IAHW-ABC1-5899',
          claimReference: 'RESH-F99F-E09F',
          crn: 1234567890,
          customParams: {},
          dateTime: now,
          emailAddress: 'an@email.com',
          notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d99',
          sbi: 123456789
        },
        inboundMessageQueueId: expect.any(String),
        outboundMessage: {
          data: {
            recipient: 'an@email.com',
            commsType: 'email',
            crn: 1234567890,
            notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d99',
            personalisation: {},
            reference: expect.any(String),
            sbi: 123456789,
            sourceSystem: 'ffc-ahwr',
            emailReplyToId: SFD_EMAIL_REPLYTO_ID
          },
          datacontenttype: 'application/json',
          id: expect.any(String),
          source: 'ffc-ahwr',
          specversion: '1.0',
          time: now,
          type: 'uk.gov.fcp.sfd.notification.request'
        }
      },
      id: expect.any(String),
      status: 'UNKNOWN', // <-------- This is the important bit!
      templateId: '123456fc-9999-40c1-a11d-85f55aff4d99'
    })

    expect(updateLogEntry).toHaveBeenCalledWith(
      mockDb,
      expect.any(String),
      'UNSENT'
    )

    expect(mockedLogger.error).toHaveBeenCalledWith(
      {
        error: mockError,
        event: {
          type: 'exception',
          category: 'fail-send',
          kind: 'outbound-message-send'
        }
      },
      'Problem sending message to SFD'
    )
  })

  test('stores the message with no claim reference if it does not exist on the inbound message, and a status of REQUESTED if the sfd message was sent ok', async () => {
    createLogEntry.mockImplementation(jest.fn())

    await sendMessageToSingleFrontDoor(
      mockedLogger,
      {
        ...validInboundMessage,
        claimReference: undefined
      },
      'message-id',
      mockDb
    )

    expect(createLogEntry).toHaveBeenCalledWith(mockDb, {
      agreementReference: 'IAHW-ABC1-5899',
      data: {
        inboundMessage: {
          agreementReference: 'IAHW-ABC1-5899',
          crn: 1234567890,
          customParams: {},
          dateTime: now,
          emailAddress: 'an@email.com',
          notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d99',
          sbi: 123456789
        },
        inboundMessageQueueId: expect.any(String),
        outboundMessage: {
          data: {
            recipient: 'an@email.com',
            commsType: 'email',
            crn: 1234567890,
            notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d99',
            personalisation: {},
            reference: expect.any(String),
            sbi: 123456789,
            sourceSystem: 'ffc-ahwr',
            emailReplyToId: SFD_EMAIL_REPLYTO_ID
          },
          datacontenttype: 'application/json',
          id: expect.any(String),
          source: 'ffc-ahwr',
          specversion: '1.0',
          time: now,
          type: 'uk.gov.fcp.sfd.notification.request'
        }
      },
      id: expect.any(String),
      status: 'UNKNOWN', // <-------- This is the important bit!
      templateId: '123456fc-9999-40c1-a11d-85f55aff4d99'
    })

    expect(updateLogEntry).toHaveBeenCalledWith(
      mockDb,
      expect.any(String),
      'REQUESTED'
    )
  })
})

describe('sendMessageToSingleFrontDoor — instrumentation', () => {
  config.set('sfdEmailReplyToId', SFD_EMAIL_REPLYTO_ID)

  const validInboundMessage = {
    crn: 1234567890,
    sbi: 123456789,
    agreementReference: 'IAHW-ABC1-5899',
    claimReference: 'RESH-F99F-E09F',
    notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d99',
    emailAddress: 'an@email.com',
    customParams: {},
    dateTime: now
  }

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('emits one info line with per-step timings on success', async () => {
    await sendMessageToSingleFrontDoor(
      mockedLogger,
      validInboundMessage,
      'message-id',
      mockDb
    )

    expect(mockedLogger.info).toHaveBeenCalledTimes(1)
    expect(mockedLogger.info).toHaveBeenCalledWith(
      {
        event: {
          action: 'sfd.send-message',
          category: 'process',
          kind: 'metric',
          outcome: 'success',
          duration: expect.any(Number)
        },
        insertMs: expect.any(Number),
        snsMs: expect.any(Number),
        updateMs: expect.any(Number)
      },
      'SFD message processed'
    )
  })

  test('emits timing line with outcome=failure when SFD publish fails', async () => {
    sendSfdMessageRequest.mockImplementationOnce(() => {
      throw new Error('boom')
    })

    await expect(
      sendMessageToSingleFrontDoor(
        mockedLogger,
        validInboundMessage,
        'message-id',
        mockDb
      )
    ).rejects.toThrow('Failed to send outbound message to SFD')

    expect(mockedLogger.info).toHaveBeenCalledTimes(1)
    const [payload, message] = mockedLogger.info.mock.calls[0]
    expect(message).toBe('SFD message processed')
    expect(payload.event.outcome).toBe('failure')
    expect(payload.insertMs).toEqual(expect.any(Number))
    expect(payload.snsMs).toEqual(expect.any(Number))
    expect(payload.updateMs).toEqual(expect.any(Number))
  })

  test('emits timing line with insertMs only when storeMessage fails', async () => {
    createLogEntry.mockImplementationOnce(() => {
      throw new Error('mongo down')
    })

    await expect(
      sendMessageToSingleFrontDoor(
        mockedLogger,
        validInboundMessage,
        'message-id',
        mockDb
      )
    ).rejects.toThrow('Failed to save message log.')

    expect(mockedLogger.info).toHaveBeenCalledTimes(1)
    const [payload] = mockedLogger.info.mock.calls[0]
    expect(payload.event.outcome).toBe('failure')
    expect(payload.insertMs).toBeNull()
    expect(payload.snsMs).toBeNull()
    expect(payload.updateMs).toBeNull()
  })

  test('emits timing line with insertMs and snsMs when updateMessageLog fails', async () => {
    updateLogEntry.mockImplementationOnce(() => {
      throw new Error('mongo down')
    })

    await expect(
      sendMessageToSingleFrontDoor(
        mockedLogger,
        validInboundMessage,
        'message-id',
        mockDb
      )
    ).rejects.toThrow('Failed to update message log.')

    expect(mockedLogger.info).toHaveBeenCalledTimes(1)
    const [payload] = mockedLogger.info.mock.calls[0]
    expect(payload.event.outcome).toBe('failure')
    expect(payload.insertMs).toEqual(expect.any(Number))
    expect(payload.snsMs).toEqual(expect.any(Number))
    expect(payload.updateMs).toBeNull()
  })
})

describe('buildOutboundMessage', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    config.set('sfdEmailReplyToId', SFD_EMAIL_REPLYTO_ID)
  })

  test('throws error when inbound message invalid', () => {
    const invalidInboundMessage = {
      dateTime: now
    }

    expect(() => {
      buildOutboundMessage(mockedLogger, randomUUID(), invalidInboundMessage)
    }).toThrow('The outbound message is invalid.')
    expect(mockedLogger.error).toHaveBeenCalledWith(
      {
        error: expect.any(Object),
        event: {
          type: 'exception',
          category: 'fail-validation',
          kind: 'outbound-message-validation',
          reason: expect.any(String)
        }
      },
      'Message request validation error'
    )
  })

  test('throws error when outbound message invalid due to no replyToId', () => {
    config.set('sfdEmailReplyToId', undefined)
    const validInboundMessage = {
      crn: 1234567890,
      sbi: 123456789,
      agreementReference: 'IAHW-ABC1-5897',
      claimReference: 'RESH-F99F-E09F',
      notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d97',
      emailAddress: 'an@email.com',
      customParams: { reference: 'IAHW-ABC1-5897' },
      dateTime: '2024-11-08T16:54:03.210Z'
    }

    expect(() => {
      buildOutboundMessage(mockedLogger, randomUUID(), validInboundMessage)
    }).toThrow('The outbound message is invalid.')
    expect(mockedLogger.error).toHaveBeenCalledWith(
      {
        error: expect.any(Object),
        event: {
          type: 'exception',
          category: 'fail-validation',
          kind: 'outbound-message-validation',
          reason:
            '[{"message":"\\"data.emailReplyToId\\" is required","path":["data","emailReplyToId"],"type":"any.required","context":{"label":"data.emailReplyToId","key":"emailReplyToId"}}]'
        }
      },
      'Message request validation error'
    )
  })

  test('throws error when outbound message invalid due to no crn', () => {
    const invalidInboundMessage = {
      sbi: 123456789,
      agreementReference: 'IAHW-ABC1-5897',
      claimReference: 'RESH-F99F-E09F',
      notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d97',
      emailAddress: 'an@email.com',
      customParams: { reference: 'IAHW-ABC1-5897' },
      dateTime: '2024-11-08T16:54:03.210Z'
    }

    expect(() => {
      buildOutboundMessage(mockedLogger, randomUUID(), invalidInboundMessage)
    }).toThrow('The outbound message is invalid.')
    expect(mockedLogger.error).toHaveBeenCalledWith(
      {
        error: expect.any(Object),
        event: {
          type: 'exception',
          category: 'fail-validation',
          kind: 'outbound-message-validation',
          reason:
            '[{"message":"\\"data.crn\\" is required","path":["data","crn"],"type":"any.required","context":{"label":"data.crn","key":"crn"}}]'
        }
      },
      'Message request validation error'
    )
  })

  test('verify input and output for: Farmer Claim - Complete', async () => {
    const messageId = randomUUID()
    const inputClaimOldWorld = {
      crn: 1234567890,
      sbi: 123456789,
      agreementReference: 'IAHW-ABC1-5897',
      claimReference: 'RESH-F99F-E09F',
      notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d97',
      emailAddress: 'an@email.com',
      customParams: { reference: 'IAHW-ABC1-5897' },
      dateTime: '2024-11-08T16:54:03.210Z'
    }
    const expectedOutput = {
      id: messageId,
      source: 'ffc-ahwr',
      specversion: '1.0',
      datacontenttype: 'application/json',
      type: 'uk.gov.fcp.sfd.notification.request',
      time: '2024-11-08T16:54:03.210Z',
      data: {
        crn: 1234567890,
        sbi: 123456789,
        sourceSystem: 'ffc-ahwr',
        notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d97',
        commsType: 'email',
        recipient: 'an@email.com',
        personalisation: {
          reference: 'IAHW-ABC1-5897'
        },
        reference: `ffc-ahwr-${messageId}`,
        emailReplyToId: SFD_EMAIL_REPLYTO_ID
      }
    }

    expect(
      buildOutboundMessage(mockedLogger, messageId, inputClaimOldWorld)
    ).toStrictEqual(expectedOutput)
  })

  test('verify input and output for: Farmer Claim - Endemics Follow-up', async () => {
    const messageId = randomUUID()
    const inputClaimEndemicFollowup = {
      crn: 1234567890,
      sbi: 123456789,
      agreementReference: 'IAHW-ABC1-5896',
      claimReference: 'RESH-F99F-E09F',
      notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d96',
      emailAddress: 'an@email.com',
      customParams: {
        reference: 'RESH-F99F-E09F',
        applicationReference: 'IAHW-ABC1-5896',
        amount: '123.45'
      },
      dateTime: '2024-11-08T16:54:03.210Z'
    }
    const expectedOutput = {
      id: messageId,
      source: 'ffc-ahwr',
      specversion: '1.0',
      datacontenttype: 'application/json',
      type: 'uk.gov.fcp.sfd.notification.request',
      time: '2024-11-08T16:54:03.210Z',
      data: {
        crn: 1234567890,
        sbi: 123456789,
        sourceSystem: 'ffc-ahwr',
        notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d96',
        commsType: 'email',
        recipient: 'an@email.com',
        personalisation: {
          reference: 'RESH-F99F-E09F',
          applicationReference: 'IAHW-ABC1-5896',
          amount: '123.45'
        },
        reference: `ffc-ahwr-${messageId}`,
        emailReplyToId: SFD_EMAIL_REPLYTO_ID
      }
    }

    expect(
      buildOutboundMessage(mockedLogger, messageId, inputClaimEndemicFollowup)
    ).toStrictEqual(expectedOutput)
  })

  test('verify input and output for: Farmer Claim - Endemics Review', async () => {
    const messageId = randomUUID()
    const inputClaimEndemicFollowup = {
      crn: 1234567890,
      sbi: 123456789,
      agreementReference: 'IAHW-ABC1-5895',
      claimReference: 'RESH-F99F-E09F',
      notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d95',
      emailAddress: 'an@email.com',
      customParams: {
        reference: 'RESH-F99F-E09F',
        applicationReference: 'IAHW-ABC1-5895',
        amount: '123.45'
      },
      dateTime: '2024-11-08T16:54:03.210Z'
    }
    const expectedOutput = {
      id: messageId,
      source: 'ffc-ahwr',
      specversion: '1.0',
      datacontenttype: 'application/json',
      type: 'uk.gov.fcp.sfd.notification.request',
      time: '2024-11-08T16:54:03.210Z',
      data: {
        crn: 1234567890,
        sbi: 123456789,
        sourceSystem: 'ffc-ahwr',
        notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d95',
        commsType: 'email',
        recipient: 'an@email.com',
        personalisation: {
          reference: 'RESH-F99F-E09F',
          applicationReference: 'IAHW-ABC1-5895',
          amount: '123.45'
        },
        reference: `ffc-ahwr-${messageId}`,
        emailReplyToId: SFD_EMAIL_REPLYTO_ID
      }
    }

    expect(
      buildOutboundMessage(mockedLogger, messageId, inputClaimEndemicFollowup)
    ).toStrictEqual(expectedOutput)
  })

  test('verify input and output with optional replyToId', async () => {
    const messageId = randomUUID()
    const inputClaimEndemicFollowup = {
      crn: 1234567890,
      sbi: 123456789,
      agreementReference: 'IAHW-ABC1-5895',
      claimReference: 'RESH-F99F-E09F',
      notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d95',
      emailReplyToId: '123456fc-9999-40c1-a11d-85f55aff4999',
      emailAddress: 'an@email.com',
      customParams: {
        reference: 'RESH-F99F-E09F',
        applicationReference: 'IAHW-ABC1-5895',
        amount: '123.45'
      },
      dateTime: '2024-11-08T16:54:03.210Z'
    }

    const {
      data: { emailReplyToId }
    } = buildOutboundMessage(mockedLogger, messageId, inputClaimEndemicFollowup)

    expect(emailReplyToId).toStrictEqual('123456fc-9999-40c1-a11d-85f55aff4999')
  })
})
