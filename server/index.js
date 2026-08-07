import { criarApp } from './app.js';

const porta = process.env.PORT || 3000;
criarApp().listen(porta, () => console.log(`Origenow no ar na porta ${porta}`));
