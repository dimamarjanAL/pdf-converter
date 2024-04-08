const cron = require("node-cron");
const moment = require("moment");

const { googleDriveScan } = require("../services/googleDriveScan.service");

cron.schedule("*/15 * * * * ", async () => {
  console.log("START A DRIVE SCAN TASK", "|", moment().format("HH:mm:ss"));
  await googleDriveScan();
  console.log("FINISH A DRIVE SCAN TASK", "|", moment().format("HH:mm:ss"));
});
