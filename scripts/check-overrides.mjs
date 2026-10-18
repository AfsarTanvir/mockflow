// Root "postinstall": runs after npm install / npm ci. `npm update` ignores
// "overrides" and can quietly put back a version an override exists to
// replace (the dompurify monaco-editor pins); it runs no root scripts itself,
// so the warning shows on the next install.
import { readFileSync } from 'node:fs';

const { overrides = {} } = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));

// Flatten { name: "1.2.3" } and { parent: { name: "1.2.3" } } to name -> version.
const wanted = {};
(function collect(obj) {
  for (const [name, value] of Object.entries(obj)) {
    if (typeof value === 'string') wanted[name] = value;
    else collect(value);
  }
})(overrides);

const stale = [];
for (const [path, pkg] of Object.entries(lock.packages ?? {})) {
  const name = path.split('node_modules/').pop();
  if (wanted[name] && /^\d/.test(wanted[name]) && pkg.version !== wanted[name]) {
    stale.push(`${path} is ${pkg.version}, override says ${wanted[name]}`);
  }
}

if (stale.length) {
  console.warn(
    `\n⚠ package-lock.json ignores package.json "overrides":\n  ${stale.join('\n  ')}\n` +
      '  This is what `npm update` does. Restore the lockfile and reinstall:\n' +
      '    git checkout package-lock.json && npm ci\n' +
      '  To update packages, use `npm install <name>@latest` instead.\n'
  );
}
