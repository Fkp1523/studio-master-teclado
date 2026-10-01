const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());

// Serve os ficheiros estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Rota explícita para o index.html dentro da pasta public
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const SCORE_FILE = path.join(__dirname, 'public', 'score.json');

// Endpoint para ler o recorde guardado no servidor
app.get('/api/recorde', (req, res) => {
    if (fs.existsSync(SCORE_FILE)) {
        const data = fs.readFileSync(SCORE_FILE, 'utf8');
        res.json(JSON.parse(data));
    } else {
        res.json({ recorde: 0 });
    }
});

// Endpoint para atualizar e guardar o recorde no servidor
app.post('/api/recorde', (req, res) => {
    const { pontos } = req.body;
    let currentRecord = 0;

    if (fs.existsSync(SCORE_FILE)) {
        const data = fs.readFileSync(SCORE_FILE, 'utf8');
        currentRecord = JSON.parse(data).recorde || 0;
    }

    if (pontos > currentRecord) {
        fs.writeFileSync(SCORE_FILE, JSON.stringify({ recorde: pontos }));
        res.json({ recorde: pontos, novoRecorde: true });
    } else {
        res.json({ recorde: currentRecord, novoRecorde: false });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});