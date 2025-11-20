const express = require('express');
const app = express();
const port = process.env.PORT || 4000;

app.get('/minha-rota', (req, res) => {
  res.json({ message: 'Acesso autorizado ao service-b' });
});

app.listen(port, () => console.log(`service-b ouvindo na porta ${port}`));