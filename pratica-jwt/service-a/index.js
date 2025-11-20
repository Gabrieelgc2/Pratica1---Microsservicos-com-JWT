const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

app.get('/call', async (req, res) => {
  // Exemplo simples de requisição para service-b (sem token aqui)
  const r = await fetch('http://localhost:4000/minha-rota');
  const body = await r.json();
  res.json({ from: 'service-a', serviceB: body });
});

app.listen(port, () => console.log(`service-a ouvindo na porta ${port}`));