import { handleCliqCommand } from './integrations/cliq.js';
import { initializeDatabase } from './db/init.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const param = args.slice(1).join(' ');

  if (command === 'init') {
    await initializeDatabase();
    return;
  }

  const res = await handleCliqCommand(command, param, 'Admin');
  console.log('\n--- ERP Response ---');
  console.log(res.text);
  if (res.card) {
    console.log('\n[Card Details]');
    console.log(res.card.title);
    res.card.sections?.forEach(s => console.log(s.text));
  }
}

main().catch(err => {
  console.error('[CLI Error]:', err);
  process.exit(1);
});
