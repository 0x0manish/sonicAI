// Register module aliases before importing any modules
import * as path from 'path';
import moduleAlias from 'module-alias';

// Register the @ alias to point to the src directory
moduleAlias.addAliases({
  '@': path.join(__dirname, '..')
});

// Now import the bot
import '../bot/standalone-bot'; 