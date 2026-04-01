const { ServiceRequestRepository } = require('../repositories/serviceRequestRepository');

class GoogleSheetsServiceRequestRepository extends ServiceRequestRepository {
  constructor({ spreadsheetId, credentialsJson }) {
    super();
    this.spreadsheetId = spreadsheetId;
    this.credentialsJson = credentialsJson;
  }
}

module.exports = { GoogleSheetsServiceRequestRepository };
