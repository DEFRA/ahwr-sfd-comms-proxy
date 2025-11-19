import { startServer } from '../../../src/common/helpers/start-server.js'
import { startMessagingService } from '../../../src/messaging/fcp-messaging-service.js'
import { configureAndStart } from '../../../src/messaging/message-request-queue-subscriber.js'

jest.mock('../../../src/messaging/message-request-queue-subscriber.js')
jest.mock('../../../src/messaging/fcp-messaging-service.js')

describe('health endpoint test', () => {
  let server

  beforeEach(async () => {
    startMessagingService.mockResolvedValueOnce()
    configureAndStart.mockResolvedValueOnce()
    server = await startServer()
  })

  test('GET /health route returns 200', async () => {
    const options = {
      method: 'GET',
      url: '/health'
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)
  })

  afterEach(async () => {
    if (server) {
      await server.stop()
    }
    jest.clearAllMocks()
  })
})
