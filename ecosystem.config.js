/**
 * pm2 process harness for 24/7 operation.
 *
 * The AutonomousEngine self-starts inside the Next.js server when
 * EXECUTIVE_ENGINE_AUTOSTART=true (see src/instrumentation.ts), so a single
 * pm2 process is enough — no separate worker needed.
 *
 * Usage on the VPS:
 *   pm2 start ecosystem.config.js
 *   pm2 save            # persist so it resurrects on reboot
 *   pm2 startup         # generate the boot-time resurrect command
 */
module.exports = {
  apps: [
    {
      name: "sitelens",
      script: "npm",
      args: "run start",
      instances: 1, // engine runs in-process; keep a single instance
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // Fill these in on the server (or rely on a deployed .env file):
        // OPENROUTER_API_KEY=sk-...
        // GITHUB_REPO=Moataz301179/hotels-vendors
        // GITHUB_TOKEN=ghp_...
        // APPLY_ENABLED=false
        // EXECUTIVE_ENGINE_AUTOSTART=true
        // EXECUTIVE_TARGET_URL=https://www.hotelsvendors.com
        // DATABASE_URL=postgres://...
      },
    },
  ],
};
