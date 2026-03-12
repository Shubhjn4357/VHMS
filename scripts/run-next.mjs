import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const nextCliPath = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

const env = { ...process.env };
delete env.npm_execpath;
delete env.npm_config_user_agent;
delete env.npm_lifecycle_event;
delete env.npm_lifecycle_script;
delete env.PNPM_SCRIPT_SRC_DIR;

const child = spawn(
  process.execPath,
  [nextCliPath, ...process.argv.slice(2)],
  {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
