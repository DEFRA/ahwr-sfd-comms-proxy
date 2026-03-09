import {
  getCommsRequestsHandler,
  supportQueueMessagesHandler
} from './support-controller.js'
import {
  getLogEntryByClaimRef,
  getLogEntryByAgreementRef
} from '../../repositories/comms-requests-repository.js'
import { ObjectId } from 'mongodb'
import Boom from '@hapi/boom'
import { sqsClient } from 'ffc-ahwr-common-library'

jest.mock('../../repositories/comms-requests-repository.js')
jest.mock('ffc-ahwr-common-library')
jest.mock('../../config.js', () => {
  const actual = jest.requireActual('../../config.js')

  return {
    config: {
      get: (key) => {
        if (key === 'aws.region') {
          return 'eu-west-2'
        }
        if (key === 'aws.endpointUrl') {
          return 'http://localhost:4566'
        }
        return actual.config.get(key)
      }
    }
  }
})

describe('getCommsRequestsHandler', () => {
  const mockH = {
    response: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis()
  }
  const mockDb = jest.fn()
  const mockLogger = {
    error: jest.fn(),
    info: jest.fn()
  }
  const request = {
    db: mockDb,
    logger: mockLogger,
    query: {}
  }
  const commsRequests = [
    {
      _id: new ObjectId('69736011fb17ee07df3147fc'),
      agreementReference: 'IAHW-ABC1-1061',
      claimReference: 'REPI-ABC1-XYZ1',
      messageType: 'claimCreated',
      data: {
        crn: '1060000000',
        sbi: '987654321',
        orgName: null,
        claimType: 'REVIEW',
        typeOfLivestock: 'pigs',
        email: null,
        orgEmail: null,
        herdName: 'piglets',
        claimAmount: '456'
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should retrieve comms requests for claimReference', async () => {
    getLogEntryByClaimRef.mockResolvedValueOnce(commsRequests)

    const result = await getCommsRequestsHandler(
      { ...request, query: { claimReference: 'REBC-J9AR-KILQ' } },
      mockH
    )

    expect(getLogEntryByClaimRef).toHaveBeenCalledWith(mockDb, 'REBC-J9AR-KILQ')
    expect(mockH.response).toHaveBeenCalledWith({ data: commsRequests })
    expect(mockH.code).toHaveBeenCalledWith(200)
    expect(result).toBe(mockH)
  })

  test('should retrieve comms requests for agreementReference', async () => {
    getLogEntryByAgreementRef.mockResolvedValueOnce(commsRequests)

    const result = await getCommsRequestsHandler(
      { ...request, query: { agreementReference: 'IAHW-ABC1-1061' } },
      mockH
    )

    expect(getLogEntryByAgreementRef).toHaveBeenCalledWith(
      mockDb,
      'IAHW-ABC1-1061'
    )
    expect(mockH.response).toHaveBeenCalledWith({ data: commsRequests })
    expect(mockH.code).toHaveBeenCalledWith(200)
    expect(result).toBe(mockH)
  })

  test('should return 500 error when repo throws error and retrieving by claim reference', async () => {
    getLogEntryByClaimRef.mockRejectedValueOnce(
      new Error('Failed to retrieve comms requests by claim reference')
    )

    expect(
      getCommsRequestsHandler(
        { ...request, query: { claimReference: 'REBC-J9AR-KILQ' } },
        mockH
      )
    ).rejects.toThrow('Failed to retrieve comms requests by claim reference')
  })

  test('should return 500 error when repo throws error and retrieving by agreement reference', async () => {
    getLogEntryByAgreementRef.mockRejectedValueOnce(
      new Error('Failed to retrieve comms requests by agreement reference')
    )

    expect(
      getCommsRequestsHandler(
        { ...request, query: { agreementReference: 'IAHW-ABC1-1061' } },
        mockH
      )
    ).rejects.toThrow(
      'Failed to retrieve comms requests by agreement reference'
    )
  })

  test('should rethrow boom error when getLogEntryByClaimRef throws', async () => {
    getLogEntryByClaimRef.mockRejectedValueOnce(
      Boom.badRequest('Failed to retrieve comms requests by claim reference')
    )

    expect(
      getCommsRequestsHandler(
        { ...request, query: { claimReference: 'REBC-J9AR-KILQ' } },
        mockH
      )
    ).rejects.toThrow('Failed to retrieve comms requests by claim reference')
  })

  test('should rethrow boom error when getLogEntryByAgreementRef throws', async () => {
    getLogEntryByAgreementRef.mockRejectedValueOnce(
      Boom.badRequest(
        'Failed to retrieve comms requests by agreement reference'
      )
    )

    expect(
      getCommsRequestsHandler(
        { ...request, query: { agreementReference: 'IAHW-ABC1-1061' } },
        mockH
      )
    ).rejects.toThrow(
      'Failed to retrieve comms requests by agreement reference'
    )
  })

  test('should return empty array when comms requests does not exist for claim reference', async () => {
    getLogEntryByClaimRef.mockResolvedValueOnce([])

    const result = await getCommsRequestsHandler(
      { ...request, query: { claimReference: 'REBC-J9AR-KILQ' } },
      mockH
    )

    expect(getLogEntryByClaimRef).toHaveBeenCalledWith(mockDb, 'REBC-J9AR-KILQ')
    expect(mockH.response).toHaveBeenCalledWith({ data: [] })
    expect(mockH.code).toHaveBeenCalledWith(200)
    expect(result).toBe(mockH)
  })

  test('should return empty array when comms requests does not exist for agreement reference', async () => {
    getLogEntryByAgreementRef.mockResolvedValueOnce([])

    const result = await getCommsRequestsHandler(
      { ...request, query: { agreementReference: 'IAHW-ABC1-1061' } },
      mockH
    )

    expect(getLogEntryByAgreementRef).toHaveBeenCalledWith(
      mockDb,
      'IAHW-ABC1-1061'
    )
    expect(mockH.response).toHaveBeenCalledWith({ data: [] })
    expect(mockH.code).toHaveBeenCalledWith(200)
    expect(result).toBe(mockH)
  })
})

describe('supportQueueMessagesHandler', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn()
  }
  const mockRequest = {
    logger: mockLogger,
    query: { queueUrl: 'http://localhost:45666/queueName', limit: 10 }
  }
  const mockH = {
    response: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis()
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should retrieve messages and render them', async () => {
    sqsClient.peekMessages.mockResolvedValue([
      {
        id: '1',
        body: { sbi: '123456789', claimRef: 'FUBC-JTTU-SDQ7' },
        attributes: { attr: 'value' },
        messageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: 'uk.gov.ffc.ahwr.set.paid.status'
          }
        }
      }
    ])

    await supportQueueMessagesHandler(mockRequest, mockH)

    expect(sqsClient.setupClient).toHaveBeenCalledWith(
      'eu-west-2',
      'http://localhost:4566',
      mockLogger
    )
    expect(sqsClient.peekMessages).toHaveBeenCalledWith(
      'http://localhost:45666/queueName',
      10
    )
    expect(mockH.response).toHaveBeenCalledWith([
      {
        id: '1',
        body: { sbi: '123456789', claimRef: 'FUBC-JTTU-SDQ7' },
        attributes: { attr: 'value' },
        messageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: 'uk.gov.ffc.ahwr.set.paid.status'
          }
        }
      }
    ])
  })

  it('should return empty array when no messages', async () => {
    sqsClient.peekMessages.mockResolvedValue([])

    await supportQueueMessagesHandler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith([])
  })
})
