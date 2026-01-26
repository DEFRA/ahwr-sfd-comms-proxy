/* global db */

// Switch to (or create) a database, e.g. "testdb"
/* eslint-disable-next-line no-global-assign */
db = db.getSiblingDB('ahwr-sfd-comms-proxy')

db.createCollection('commsrequests')

const fs = require('fs')
const commsLogEntries = fs.readFileSync('/temp/CommsLogEntries.json')
const docs = JSON.parse(commsLogEntries)
db.commsrequests.insertMany(docs)
