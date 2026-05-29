const userAgent = process.env.npm_config_user_agent ?? '';

if (!userAgent.startsWith('pnpm/')) {
  console.error('This project only supports pnpm. Use: pnpm install');
  process.exit(1);
}