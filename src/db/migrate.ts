import { ensureDatabaseMigrated } from './index';

async function main() {
  console.log('Aplicando migraciones de Marchante (esquema + políticas RLS)...');
  await ensureDatabaseMigrated();
  console.log('✅ Base de datos migrada y políticas RLS activas.');
}

main().catch((err) => {
  console.error('❌ Error al migrar la base de datos:', err);
  process.exit(1);
});
