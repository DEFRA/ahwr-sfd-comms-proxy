import { REDACT_PII_VALUES } from 'ffc-ahwr-common-library'

const COLLECTION = 'commsrequests'

export const getLogEntryByAgreementRef = async (db, agreementReference) => {
  return db
    .collection(COLLECTION)
    .find({
      agreementReference
    })
    .toArray()
}

export const getLogEntryByClaimRef = async (db, claimReference) => {
  return db
    .collection(COLLECTION)
    .find({
      claimReference
    })
    .toArray()
}

export const createLogEntry = async (db, data) => {
  return db.collection(COLLECTION).insertOne({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date()
  })
}

export const updateLogEntry = async (db, id, status) => {
  const result = await db.collection(COLLECTION).updateOne(
    { id },
    {
      $set: {
        status,
        updatedAt: new Date()
      }
    }
  )
  return result.modifiedCount
}

export const redactPII = async (db, agreementReferences, logger) => {
  const result = await db.collection(COLLECTION).updateMany(
    { agreementReference: { $in: agreementReferences } },
    {
      $set: {
        'data.inboundMessage.emailAddress': REDACT_PII_VALUES.REDACTED_EMAIL,
        'data.outboundMessage.data.commsAddresses':
          REDACT_PII_VALUES.REDACTED_EMAIL,
        updatedAt: new Date()
      }
    }
  )

  const totalUpdates = result.modifiedCount

  if (totalUpdates > 0) {
    logger.info(
      `Total redacted fields across comms log entries: ${totalUpdates} for agreementReferences: ${agreementReferences}`
    )
  } else {
    logger.info(
      `No comms log entries updated for agreementReference: ${agreementReferences}`
    )
  }
}
