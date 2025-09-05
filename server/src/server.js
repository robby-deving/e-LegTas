const app = require('./app');
const dotenv = require('dotenv');
const logger = require('./utils/logger');

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});