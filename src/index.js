const express = require('express');
const cors = require('cors');
const config = require('./config');

const app = express();

app.use(cors());
app.use(express.json());

const routes = require('./routes');
app.use('/api/', routes);

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
