import { MongoMemoryServer } from 'mongodb-memory-server'
import { config } from '../src/config.js'

export default async function globalSetup() {
  const dbName = 'ahwr-sfd-comms-proxy'
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName
    },
    binary: {
      version: '7.0.0'
    }
  })
  const mongoUri = mongoServer.getUri()

  process.env.MONGO_URI = mongoUri
  process.env.MONGO_DATABASE = dbName
  process.env.MESSAGE_QUEUE_USER = 'dummy'
  process.env.MESSAGE_QUEUE_PASSWORD = 'dummy'
  global.__MONGOD__ = mongoServer

  config.set('mongo.mongoUrl', mongoUri)
  config.set('mongo.databaseName', dbName)
}
