import { createLogEntry, updateLogEntry } from './comms-requests-repository.js'

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
    // const mockLogger = { info: jest.fn() }

    beforeEach(async () => {
      jest.clearAllMocks()
    })

    test('should call messageLog.update with correct parameters', async () => {
      // const agreementReference = 'AHWR-123'
      // const mockUpdatedRows = [{ id: 1 }, { id: 2 }]
      // dataModeller.models.messageLog.update.mockResolvedValue([mockUpdatedRows.length, mockUpdatedRows])
      //
      // await redactPII(agreementReference, mockLogger)
      //
      // expect(dataModeller.models.messageLog.update).toHaveBeenCalledWith(
      //   expect.objectContaining({ data: expect.any(Object) }),
      //   expect.objectContaining({
      //     where: {
      //       agreementReference: 'AHWR-123',
      //       [Op.and]: { val: "data->'outboundMessage'->'data'->'commsAddresses' IS NOT NULL" }
      //     }
      //   })
      // )
      // expect(dataModeller.models.messageLog.update).toHaveBeenCalledWith(
      //   expect.objectContaining({ data: expect.any(Object) }),
      //   expect.objectContaining({
      //     where: {
      //       agreementReference: 'AHWR-123',
      //       [Op.and]: { val: "data->'inboundMessage'->'emailAddress' IS NOT NULL" }
      //     }
      //   })
      // )
      // expect(mockLogger.info).toHaveBeenCalledWith("Redacted field at path 'inboundMessage,emailAddress' in 2 message(s) for agreementReference: AHWR-123")
      // expect(mockLogger.info).toHaveBeenCalledWith("Redacted field at path 'outboundMessage,data,commsAddresses' in 2 message(s) for agreementReference: AHWR-123")
      // expect(mockLogger.info).toHaveBeenCalledWith('Total redacted fields across messages: 4 for agreementReference: AHWR-123')
    })

    test('should log when no messages are updated', async () => {
      // const agreementReference = 'AHWR-123'
      // dataModeller.models.messageLog.update.mockResolvedValue([0, []])
      //
      // await redactPII(agreementReference, mockLogger)
      //
      // expect(mockLogger.info).toHaveBeenCalledWith(
      //   `No messages updated for agreementReference: ${agreementReference}`
      // )
    })
  })
})
