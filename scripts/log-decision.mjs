import { appendFileSync, existsSync, writeFileSync } from 'node:fs'

const [phase, decision, why, evidence, result] = process.argv.slice(2)
if (![phase, decision, why, evidence, result].every(Boolean)) {
  throw new Error(
    'Usage: node scripts/log-decision.mjs phase decision why evidence result',
  )
}
const file = 'docs/decisions.tsv'
if (!existsSync(file))
  writeFileSync(file, 'ts\tphase\tdecision\twhy\tevidence\tresult\n')
const clean = (value) => {
  const text = value.replace(/[\t\r\n]+/g, ' ')
  return /^[=+@-]/.test(text) ? `'${text}` : text
}
appendFileSync(
  file,
  [new Date().toISOString(), phase, decision, why, evidence, result]
    .map(clean)
    .join('\t') + '\n',
)
