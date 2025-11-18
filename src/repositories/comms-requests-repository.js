// import { REDACT_PII_VALUES } from 'ffc-ahwr-common-library'

export const createLogEntry = async (db, data) => {
  return db.collection('commsrequests').insertOne({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date()
  })
}

export const updateLogEntry = async (db, id, status) => {
  const result = await db.collection('commsrequests').updateOne(
    { _id: id },
    {
      $set: {
        status,
        updatedAt: new Date()
      }
    }
  )
  return result.modifiedCount
}

export const redactPII = async (agreementReference, logger) => {
  // const { models } = dataModeller

  // const redactedValueByJSONPath = {
  //   'inboundMessage,emailAddress': REDACT_PII_VALUES.REDACTED_EMAIL,
  //   'outboundMessage,data,commsAddresses': REDACT_PII_VALUES.REDACTED_EMAIL
  // }

  const totalUpdates = 0

  // for (const [jsonPath, redactedValue] of Object.entries(redactedValueByJSONPath)) {
  //   const jsonPathSql = jsonPath.split(',').map(key => `->'${key}'`).join('')
  //
  //   const [affectedCount] = await models.messageLog.update(
  //     {
  //       data: Sequelize.fn(
  //         'jsonb_set',
  //         Sequelize.col('data'),
  //         Sequelize.literal(`'{${jsonPath}}'`),
  //         Sequelize.literal(`'"${redactedValue}"'`)
  //       )
  //     },
  //     {
  //       where: {
  //         agreementReference,
  //         [Op.and]: Sequelize.literal(`data${jsonPathSql} IS NOT NULL`)
  //       }
  //     }
  //   )
  //
  //   totalUpdates += affectedCount
  //   logger.info(`Redacted field at path '${jsonPath}' in ${affectedCount} message(s) for agreementReference: ${agreementReference}`)
  // }

  if (totalUpdates > 0) {
    logger.info(
      `Total redacted fields across messages: ${totalUpdates} for agreementReference: ${agreementReference}`
    )
  } else {
    logger.info(
      `No messages updated for agreementReference: ${agreementReference}`
    )
  }
}
