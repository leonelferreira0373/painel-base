-- A contagem do que a IA gastou: uma linha por chamada, só com números (o texto das perguntas nunca se guarda aqui).
CREATE TABLE IF NOT EXISTS uso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quando TEXT NOT NULL,
  dia TEXT NOT NULL,
  origem TEXT NOT NULL,
  modelo TEXT NOT NULL,
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  neurons REAL NOT NULL,
  custo_usd REAL NOT NULL,
  ms INTEGER NOT NULL,
  estimado INTEGER NOT NULL DEFAULT 0,
  sessao TEXT
);
CREATE INDEX IF NOT EXISTS uso_dia ON uso (dia);
