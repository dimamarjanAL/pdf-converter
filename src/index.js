const express = require("express");
const cors = require("cors");
const config = require("./config");

const app = express();

app.use(
  cors({
    origin: ["https://app.docuseer.com", "http://localhost:3000"],
    methods: ["GET", "POST"],
  }),
);

app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json());

const routes = require("./routes");
app.use("/api/", routes);

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
