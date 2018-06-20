import path from 'path';
import express from 'express';

const app = express();

app.use(express.static(path.join(__dirname, 'dist')));

app.use(function(_req, res) {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

console.log('Starting server...');
app.listen(3000, () => console.log('Server is started on port 3000'));
