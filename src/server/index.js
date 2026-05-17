const app = require("./app");
const { initSchema } = require("./db/schema");
const { ensurePointsSeed } = require("./services/pointsSeed");

const PORT = process.env.PORT || 3001;

initSchema();
ensurePointsSeed();

app.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
