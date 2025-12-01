const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const stringify = require("csv-stringify").stringify;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ------------
// POST /save  
// ------------
app.post("/save", async (req, res) => {
  try {
    const { nota, origem } = req.body;

    if (!nota || nota < 1 || nota > 5) {
      return res.status(400).json({ error: "nota inválida" });
    }

    const result = await pool.query(
      "INSERT INTO votos (nota, origem) VALUES ($1, $2) RETURNING id, created_at",
      [nota, origem || null]
    );

    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------
// GET /list 
// ----------
app.get("/list", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nota, origem, created_at FROM votos ORDER BY id DESC LIMIT 1000"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------
// GET /export  
// -------------
app.get("/export", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nota, origem, created_at FROM votos ORDER BY id DESC"
    );

    let csvData = [];
    csvData.push(["id", "created_at", "origem", "nota"]);

    result.rows.forEach((r) => {
      csvData.push([
        r.id,
        r.created_at.toISOString(),
        r.origem || "",
        r.nota,
      ]);
    });

    stringify(csvData, (err, output) => {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=votos.csv"
      );
      res.send(output);
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Backend rodando na porta " + PORT));
