const fs = require("fs");
const path = require("path");

const directoryPath = path.join(__dirname, "./");
fs.readdirSync(directoryPath).forEach((file) => {
  if (fs.statSync(path.join(directoryPath, file)).isFile()) {
    require(path.join(directoryPath, file));
  }
});
