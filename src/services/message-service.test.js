import { v4 as uuidv4 } from 'uuid'
import {
  sendMessageToSingleFrontDoor,
  buildOutboundMessage
} from './message-service'
import {
  createLogEntry,
  updateLogEntry
} from '../repositories/comms-requests-repository.js'
import { config } from '../config.js'
import { sendSfdMessageRequest } from '../messaging/fcp-messaging-service.js'

const now = new Date().toISOString()
const SFD_EMAIL_REPLYTO_ID = 'c3e9149b-9490-4321-808c-72e709d9d814'

jest.mock('../repositories/comms-requests-repository.js', () => ({
  createLogEntry: jest.fn(),
  updateLogEntry: jest.fn()
}))

jest.mock('../messaging/fcp-messaging-service.js', () => ({
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

  test('returns message with id when processing is successful', async () => {
    const outboundMessage = await sendMessageToSingleFrontDoor(
      mockedLogger,
      validInboundMessage,
      mockDb
    )

    expect(outboundMessage).not.toBeNull()
    expect(outboundMessage).toHaveProperty('id')
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
    expect(updateLogEntry).toHaveBeenCalledTimes(1)
    expect(mockSetBindingsLogger).toHaveBeenCalledTimes(2)
  })

  test('stores that the message was not sent, if the SFD request fails', async () => {
    sendSfdMessageRequest.mockImplementation(() => {
      throw new Error('Faked message send error')
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
            commsAddresses: 'an@email.com',
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
          specversion: '2.0.0',
          time: now,
          type: 'uk.gov.ffc.ahwr.comms.request'
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
            commsAddresses: 'an@email.com',
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
          specversion: '2.0.0',
          time: now,
          type: 'uk.gov.ffc.ahwr.comms.request'
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
      buildOutboundMessage(uuidv4(), invalidInboundMessage)
    }).toThrow('The outbound message is invalid.')
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
      buildOutboundMessage(uuidv4(), validInboundMessage)
    }).toThrow('The outbound message is invalid.')
  })

  test('verify input and output for: Farmer Claim - Complete', async () => {
    const messageId = uuidv4()
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
      specversion: '2.0.0',
      datacontenttype: 'application/json',
      type: 'uk.gov.ffc.ahwr.comms.request',
      time: '2024-11-08T16:54:03.210Z',
      data: {
        crn: 1234567890,
        sbi: 123456789,
        sourceSystem: 'ffc-ahwr',
        notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d97',
        commsType: 'email',
        commsAddresses: 'an@email.com',
        personalisation: {
          reference: 'IAHW-ABC1-5897'
        },
        reference: `ffc-ahwr-${messageId}`,
        emailReplyToId: SFD_EMAIL_REPLYTO_ID
      }
    }

    expect(buildOutboundMessage(messageId, inputClaimOldWorld)).toStrictEqual(
      expectedOutput
    )
  })

  test('verify input and output for: Farmer Claim - Endemics Follow-up', async () => {
    const messageId = uuidv4()
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
      specversion: '2.0.0',
      datacontenttype: 'application/json',
      type: 'uk.gov.ffc.ahwr.comms.request',
      time: '2024-11-08T16:54:03.210Z',
      data: {
        crn: 1234567890,
        sbi: 123456789,
        sourceSystem: 'ffc-ahwr',
        notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d96',
        commsType: 'email',
        commsAddresses: 'an@email.com',
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
      buildOutboundMessage(messageId, inputClaimEndemicFollowup)
    ).toStrictEqual(expectedOutput)
  })

  test('verify input and output for: Farmer Claim - Endemics Review', async () => {
    const messageId = uuidv4()
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
      specversion: '2.0.0',
      datacontenttype: 'application/json',
      type: 'uk.gov.ffc.ahwr.comms.request',
      time: '2024-11-08T16:54:03.210Z',
      data: {
        crn: 1234567890,
        sbi: 123456789,
        sourceSystem: 'ffc-ahwr',
        notifyTemplateId: '123456fc-9999-40c1-a11d-85f55aff4d95',
        commsType: 'email',
        commsAddresses: 'an@email.com',
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
      buildOutboundMessage(messageId, inputClaimEndemicFollowup)
    ).toStrictEqual(expectedOutput)
  })

  test('verify input and output with optional replyToId', async () => {
    const messageId = uuidv4()
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
    } = buildOutboundMessage(messageId, inputClaimEndemicFollowup)

    expect(emailReplyToId).toStrictEqual('123456fc-9999-40c1-a11d-85f55aff4999')
  })
})
