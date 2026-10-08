import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const root = process.cwd()
const app = path.resolve(root, 'apps/web/src')
const ui = path.resolve(root, 'packages/ui/src')
const composables = path.resolve(root, 'packages/composables/src')
const failures = []

function files(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) return files(file)
    return /\.(ts|vue)$/.test(file) ? [file] : []
  })
}
function feature(file) {
  return path.relative(app, file).match(/^features\/([^/]+)\//)?.[1]
}
function resolveTarget(file, specifier) {
  if (specifier.startsWith('.'))
    return path.resolve(path.dirname(file), specifier)
  if (specifier === '@talk-coach/ui') return path.join(ui, 'index.ts')
  if (specifier === '@talk-coach/composables')
    return path.join(composables, 'index.ts')
  return undefined
}
function imports(source, file) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const values = []
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      values.push(node.moduleSpecifier.text)
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      values.push(node.arguments[0].text)
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return values
}
for (const file of [...files(app), ...files(ui), ...files(composables)]) {
  if (/\.(test|story)\./.test(file)) continue
  const content = fs.readFileSync(file, 'utf8')
  const source = file.endsWith('.vue')
    ? (() => {
        const { descriptor } = parse(content)
        return [descriptor.script?.content, descriptor.scriptSetup?.content]
          .filter(Boolean)
          .join('\n')
      })()
    : content
  const owner = feature(file)
  const pure = /\/features\/[^/]+\/(domain|application|ports)\//.test(file)
  for (const specifier of imports(source, file)) {
    const target = resolveTarget(file, specifier)
    const targetOwner = target ? feature(target) : undefined
    const report = (reason) =>
      failures.push(
        `${path.relative(root, file)} imports ${specifier}: ${reason}`,
      )
    if (
      file.startsWith(ui) &&
      (specifier.includes('apps/') || target?.startsWith(app))
    )
      report('UI package cannot depend on the application')
    if (
      file.startsWith(composables) &&
      ((!target &&
        !['vue', 'valibot', '@talk-coach/result'].includes(specifier)) ||
        (target && !target.startsWith(composables)))
    )
      report('Composables depend only on Vue, Valibot, and Result')
    if (
      owner &&
      targetOwner &&
      owner !== targetOwner &&
      !/\/index(?:\.ts)?$/.test(target)
    )
      report('Use another feature public index')
    if (
      targetOwner &&
      !owner &&
      !file.startsWith(path.join(app, 'app')) &&
      !/\/index(?:\.ts)?$/.test(target)
    )
      report('Only composition may wire feature internals')
    if (
      pure &&
      ((!target && !['valibot', '@talk-coach/result'].includes(specifier)) ||
        (target &&
          !/\/features\/[^/]+\/(domain|application|ports)\//.test(target)))
    )
      report('Core code depends only on core contracts and validation')
    const layer = file.match(
      /\/features\/[^/]+\/(domain|ports|application)\//,
    )?.[1]
    const targetLayer = target?.match(
      /\/features\/[^/]+\/(domain|ports|application)\//,
    )?.[1]
    if (targetLayer && layer === 'domain' && targetLayer !== 'domain')
      report('Domain cannot depend on ports or application services')
    if (targetLayer === 'application' && layer === 'ports')
      report('Ports cannot depend on application services')
    if (owner && target?.startsWith(path.join(app, 'app')))
      report('Features cannot depend on application composition')
    if (
      /\/features\/[^/]+\/ui\//.test(file) &&
      target &&
      /\/(adapters|platform)\//.test(target)
    )
      report('Feature UI receives capabilities through props or injection')
  }
  if (
    pure &&
    /\b(window|document|navigator|indexedDB|localStorage|sessionStorage)\b/.test(
      source,
    )
  )
    failures.push(
      `${path.relative(root, file)} uses a browser global in core code`,
    )
}
if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else console.log('Architecture boundaries passed')
