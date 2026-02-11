import { createServer } from '../../server.js'
import { createSfdProxyIndexes } from '../../repositories/comms-requests-repository.js'

const mockCreateIndex = jest.fn()
const mockCollection = jest.fn(() => {
  return {
    createIndex: mockCreateIndex
  }
})
const mockDb = jest.fn((databaseName) => {
  return {
    collection: mockCollection,
    databaseName,
    namespace: databaseName
  }
})
jest.mock('../../repositories/comms-requests-repository.js')

jest.mock('mongodb', () => ({
  ...jest.requireActual('mongodb'),
  MongoClient: {
    connect: jest.fn(() => ({
      db: mockDb,
      close: jest.fn()
    }))
  }
}))

describe('#mongoDb', () => {
  let server

  describe('Set up', () => {
    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
    })

    test('Server should have expected MongoDb decorators', () => {
      expect(server.db).toEqual(mockDb('ahwr-sfd-comms-proxy'))
      expect(createSfdProxyIndexes).toHaveBeenCalled()
    })

    test('MongoDb should have expected database name', () => {
      expect(server.db.databaseName).toBe('ahwr-sfd-comms-proxy')
    })

    test('MongoDb should have expected namespace', () => {
      expect(server.db.namespace).toBe('ahwr-sfd-comms-proxy')
    })
  })

  describe('Shut down', () => {
    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
    })

    test('Should close Mongo client on server stop', async () => {
      const closeSpy = jest.spyOn(server.mongoClient, 'close')
      await server.stop({ timeout: 1000 })

      expect(closeSpy).toHaveBeenCalledWith(true)
    })
  })
})
