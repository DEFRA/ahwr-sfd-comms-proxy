import {
  createLogEntry,
  redactPII,
  updateLogEntry,
  getLogEntryByAgreementRef,
  getLogEntryByClaimRef
} from './comms-requests-repository.js'

describe('comms requests repository', () => {
  const mockToArray = jest.fn()
  const mockDb = {
    collection: jest.fn().mockReturnThis(),
    insertOne: jest.fn(),
    updateOne: jest.fn(),
    find: jest.fn(() => ({
      toArray: mockToArray
    }))
  }

  const logEntry = {
    agreementReference: 'IAHW-ABC1-1060',
    claimReference: 'FUBC-JTTU-SDQ7',
    createdAt: {
      $date: '2024-11-11T14:42:06.330Z'
    },
    updatedAt: {
      $date: '2024-11-11T14:45:16.121Z'
    },
    legacyData: {
      legacyId: '4004780a-2908-4012-abc6-29a73e14c6f5'
    },
    templateId: '2f9b1e0e-b678-481c-839e-892ebf42fddf',
    status: 'UNKNOWN',
    data: {
      inboundMessage: {
        crn: 1060000000,
        sbi: 987654321,
        dateTime: '2024-11-11T12:01:01.001Z',
        customParams: {
          reference: 'IAHW-ABC1-1001'
        },
        emailAddress: 'Ben.Hope@defra.gov.uk',
        notifyTemplateId: '2f9b1e0e-b678-481c-839e-892ebf42fddf',
        agreementReference: 'IAHW-ABC1-1060'
      },
      outboundMessage: {
        id: '4004780a-2908-4012-abc6-29a73e14c6f5',
        data: {
          crn: 1060000000,
          sbi: 987654321,
          commsType: 'email',
          reference: 'ffc-ahwr-4004780a-2908-4012-abc6-29a73e14c6f5',
          sourceSystem: 'ffc-ahwr',
          commsAddresses: 'Ben.Hope@defra.gov.uk',
          personalisation: {
            reference: 'IAHW-ABC1-1001'
          },
          notifyTemplateId: '2f9b1e0e-b678-481c-839e-892ebf42fddf'
        },
        time: '2024-11-11T12:01:01.001Z',
        type: 'uk.gov.ffc.ahwr.comms.request',
        source: 'ffc-ahwr',
        specversion: '1.0.2',
        datacontenttype: 'application/json'
      },
      inboundMessageQueueId: '5e376a8c1a9549b6bc81604e93f145ba'
    }
  }

  describe('getLogEntryByClaimRef', () => {
    test('should return documents when the claim reference matches', async () => {
      mockToArray.mockResolvedValueOnce([logEntry])

      const result = await getLogEntryByClaimRef(mockDb, 'TEMP-O9UD-22F6')

      expect(mockDb.find).toHaveBeenCalledWith({
        claimReference: 'TEMP-O9UD-22F6'
      })
      expect(result).toEqual([logEntry])
    })

    test('should return emptry array if no result is found', async () => {
      mockToArray.mockResolvedValueOnce([])

      const result = await getLogEntryByClaimRef(mockDb, 'TEMP-O9UD-22F6')

      expect(result).toEqual([])
    })
  })

  describe('getLogEntryByAgreementRef', () => {
    test('should return documents when the agreement reference matches', async () => {
      mockToArray.mockResolvedValueOnce([logEntry])

      const result = await getLogEntryByAgreementRef(mockDb, 'TEMP-O9UD-22F6')

      expect(mockDb.find).toHaveBeenCalledWith({
        agreementReference: 'TEMP-O9UD-22F6'
      })
      expect(result).toEqual([logEntry])
    })

    test('should return emptry array if no result is found', async () => {
      mockToArray.mockResolvedValueOnce([])

      const result = await getLogEntryByAgreementRef(mockDb, 'TEMP-O9UD-22F6')

      expect(result).toEqual([])
    })
  })

  test('it saves new data to the DB', async () => {
    const testData = { id: 'test-id-1', someOtherStuff: 'im-the-other-stuff' }
    await createLogEntry(mockDb, testData)
    expect(mockDb.insertOne).toHaveBeenCalledTimes(1)
    expect(mockDb.insertOne).toHaveBeenCalledWith({
      id: 'test-id-1',
      someOtherStuff: 'im-the-other-stuff',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date)
    })
  })

  test('calls through to update the DB', async () => {
    mockDb.updateOne.mockReturnValueOnce({ updatedCount: 1 })
    await updateLogEntry(mockDb, 'id1', 'a-status')
    expect(mockDb.updateOne).toHaveBeenCalledTimes(1)
    expect(mockDb.updateOne).toHaveBeenCalledWith(
      { id: 'id1' },
      { $set: { status: 'a-status', updatedAt: expect.any(Date) } }
    )
  })

  describe('redactPII', () => {
    const mockLogger = { info: jest.fn() }
    const mockDb = {
      collection: jest.fn().mockReturnThis(),
      updateMany: jest.fn()
    }

    beforeEach(async () => {
      jest.clearAllMocks()
    })

    test('should call update with correct parameters', async () => {
      const agreementReferences = ['AHWR-123', 'IAHW-456']
      mockDb.updateMany.mockResolvedValueOnce({ modifiedCount: 2 })

      await redactPII(mockDb, agreementReferences, mockLogger)

      expect(mockDb.updateMany).toHaveBeenCalledWith(
        { agreementReference: { $in: ['AHWR-123', 'IAHW-456'] } },
        {
          $set: {
            'data.inboundMessage.emailAddress': 'redacted.email@example.com',
            'data.outboundMessage.data.commsAddresses':
              'redacted.email@example.com',
            updatedAt: expect.any(Date)
          }
        }
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Total redacted fields across comms log entries: 2 for agreementReferences: AHWR-123,IAHW-456'
      )
    })

    test('should log when no messages are updated', async () => {
      const agreementReferences = ['AHWR-123', 'IAHW-456']
      mockDb.updateMany.mockResolvedValueOnce({ modifiedCount: 0 })

      await redactPII(mockDb, agreementReferences, mockLogger)

      expect(mockLogger.info).toHaveBeenCalledWith(
        `No comms log entries updated for agreementReference: ${agreementReferences}`
      )
    })
  })
})
