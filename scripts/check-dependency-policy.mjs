import fs from 'node:fs/promises';

const MIN_AGE_DAYS = Number.parseInt(process.env.MIN_DEPENDENCY_AGE_DAYS ?? '14', 10);
const MANIFEST_PATH = new URL('../package.json', import.meta.url);

function parseExactVersion(spec) {
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(spec) ? spec : null;
}

function ageInDays(publishedAt) {
  return (Date.now() - new Date(publishedAt).getTime()) / 86_400_000;
}

async function fetchPublishTime(name, version) {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);

  if (!response.ok) {
    throw new Error(`npm registry returned HTTP ${response.status}`);
  }

  const data = await response.json();
  const publishedAt = data.time?.[version];

  if (!publishedAt) {
    throw new Error(`version ${version} is missing from npm publish metadata`);
  }

  return publishedAt;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  const sections = ['dependencies', 'devDependencies'];
  const issues = [];

  for (const section of sections) {
    const entries = Object.entries(manifest[section] ?? {});

    for (const [name, spec] of entries) {
      const version = parseExactVersion(spec);

      if (!version) {
        issues.push(`${section}:${name} uses non-fixed specifier ${spec}`);
        continue;
      }

      try {
        const publishedAt = await fetchPublishTime(name, version);
        const daysOld = ageInDays(publishedAt);

        if (daysOld < MIN_AGE_DAYS) {
          issues.push(
            `${section}:${name}@${version} is only ${daysOld.toFixed(1)} days old (minimum ${MIN_AGE_DAYS})`,
          );
          continue;
        }

        console.log(`${section}:${name}@${version} ok (${daysOld.toFixed(1)} days old)`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push(`${section}:${name}@${spec} could not be verified: ${message}`);
      }
    }
  }

  if (issues.length > 0) {
    console.error('\nDependency policy check failed:');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(`\nDependency policy check passed with minimum age ${MIN_AGE_DAYS} days.`);
}

await main();