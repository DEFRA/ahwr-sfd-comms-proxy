import {
  createLogEntry,
  redactPII,
  updateLogEntry
} from './comms-requests-repository.js'

describe('comms requests repository', () => {
  const mockDb = {
    collection: jest.fn().mockReturnThis(),
    insertOne: jest.fn(),
    updateOne: jest.fn()
  }
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
            'inboundMessage.emailAddress': 'redacted.email@example.com',
            'outboundMessage.data.commsAddresses': 'redacted.email@example.com',
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
