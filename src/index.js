const express = require("express");
const cors = require("cors");

require("dotenv").config();

const { SERVER_PORT } = process.env;

const app = express();

app.use(
  cors({
    origin: ["https://app.docuseer.com", "http://localhost:3000"],
    methods: ["GET", "POST"],
  })
);

app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json());

const routes = require("./routes");
app.use("/api/", routes);

app.listen(SERVER_PORT, () => {
  console.log(`Server is running on port ${SERVER_PORT}`);
});
