import { StatusCodes } from 'http-status-codes'
import Boom from '@hapi/boom'
import {
  getLogEntryByClaimRef,
  getLogEntryByAgreementRef
} from '../../repositories/comms-requests-repository.js'

export const getCommsRequestsHandler = async (request, h) => {
  try {
    const {
      db,
      logger,
      query: { agreementReference, claimReference }
    } = request
    logger.info(
      `Get comms requests, agreementReference: ${agreementReference}, claimReference: ${claimReference}`
    )

    const commsRequests = claimReference
      ? await getLogEntryByClaimRef(db, claimReference)
      : await getLogEntryByAgreementRef(db, agreementReference)

    return h.response({ data: commsRequests }).code(StatusCodes.OK)
  } catch (error) {
    request.logger.error({ error }, 'Failed to retrieve comms requests')

    if (Boom.isBoom(error)) {
      throw error
    }

    throw Boom.internal(error)
  }
}
