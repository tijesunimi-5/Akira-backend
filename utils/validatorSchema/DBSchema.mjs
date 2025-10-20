import { Pool } from "pg";

const pool = new Pool({
  connectionString: "postgresql://postgres:musictutor@localhost:8080/AkiraDB",
});

pool.on("error", (err, _) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export default pool