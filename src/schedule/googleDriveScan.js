const cron = require("node-cron");
const moment = require("moment");
const { APP_ENV } = process.env;
const { PRODUCTION } = require("../constants/general");

const { googleDriveScan } = require("../services/googleDriveScan.service");

if (APP_ENV !== PRODUCTION) {
  cron.schedule("26 * * * * ", async () => {
    console.log("START A DRIVE SCAN TASK", "|", moment().format("HH:mm:ss"));
    await googleDriveScan();
    console.log("FINISH A DRIVE SCAN TASK", "|", moment().format("HH:mm:ss"));
  });
}
