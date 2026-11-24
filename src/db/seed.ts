import { ensureDemoSellerAccount } from '@/modules/auth/service';

async function main() {
  console.log('Sembrando tienda de demostración de Marchante (Horno & Canela)...');
  const session = await ensureDemoSellerAccount();
  console.log(`✅ Tienda demo lista:`);
  console.log(`   - Negocio: ${session.businessName} (/${session.slug})`);
  console.log(`   - Correo:  ${session.email}`);
  console.log(`   - Clave:   demo-marchante-2026`);
}

main().catch((err) => {
  console.error('❌ Error al sembrar datos de demostración:', err);
  process.exit(1);
});
