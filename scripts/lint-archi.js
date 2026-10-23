import { readFileSync } from 'node:fs';

const fichier = './domain/Alerte.js';
const source = readFileSync(fichier, 'utf8');

if (/^\s*import\s/m.test(source)) {
  console.error('Échec : le domaine ne doit pas importer directement de modules externes.');
  process.exit(1);
}

console.log('Architecture OK : domain/Alerte.js ne contient aucun import.');
