const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const stringify = require("csv-stringify").stringify;

const app = express();

// Configuração de CORS mais permissiva para produção
app.use(cors({
  origin: '*', // Permite todas as origens (em produção, restrinja isso)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Configuração do pool do PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Rota de saúde para o Railway
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
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
    console.error("Erro em /save:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
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
    console.error("Erro em /list:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
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
      if (err) {
        console.error("Erro ao gerar CSV:", err);
        return res.status(500).json({ error: "Erro ao gerar CSV" });
      }
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=votos.csv"
      );
      res.send(output);
    });

  } catch (err) {
    console.error("Erro em /export:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Rota raiz para teste
app.get("/", (req, res) => {
  res.json({
    message: "API do Totem de Satisfação",
    endpoints: {
      save: "POST /save",
      list: "GET /list",
      export: "GET /export",
      health: "GET /health"
    }
  });
});

// ------------------------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));