import { Server } from '@hapi/hapi'
import { supportRoutes } from './support-routes.js'
import { getCommsRequestsHandler } from './support-controller.js'

jest.mock('./support-controller.js')

const commsRequests = [
  {
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
]
describe('support-routes', () => {
  let server

  beforeAll(async () => {
    server = new Server()
    server.route(supportRoutes)
    await server.initialize()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/support/comms-requests', () => {
    it('should validate request and call correct handler when query has agreementReference', async () => {
      getCommsRequestsHandler.mockImplementation(async (_, h) => {
        return h.response(commsRequests).code(200)
      })

      const res = await server.inject({
        method: 'GET',
        url: '/api/support/comms-requests?agreementReference=IAHW-ABC1-1061'
      })

      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual(commsRequests)
      expect(getCommsRequestsHandler).toHaveBeenCalledTimes(1)
    })
  })

  it('should validate request and call correct handler when query has claimReference', async () => {
    getCommsRequestsHandler.mockImplementation(async (_, h) => {
      return h.response(commsRequests).code(200)
    })

    const res = await server.inject({
      method: 'GET',
      url: '/api/support/comms-requests?claimReference=REPI-ABC1-XYZ1'
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toEqual(commsRequests)
    expect(getCommsRequestsHandler).toHaveBeenCalledTimes(1)
  })

  it('should return 400 when query is missing required params', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/support/comms-requests'
    })

    expect(res.statusCode).toBe(400)
    expect(res.result).toEqual({
      error: 'Bad Request',
      message: 'Invalid request query input',
      statusCode: 400
    })
    expect(getCommsRequestsHandler).not.toHaveBeenCalled()
  })
})
