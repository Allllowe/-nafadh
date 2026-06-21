const app = require('./src/app');
const config = require('./src/config');

app.listen(config.port, () => {
  console.log(`✅ Nafadh backend running on http://localhost:${config.port}`);
  console.log(`   API base: http://localhost:${config.port}/api`);
});
