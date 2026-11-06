import { readFile } from 'node:fs/promises';
import { parse, compileScript } from '@vue/compiler-sfc';
export async function load(url, context, nextLoad) {
  if (!url.endsWith('.vue')) return nextLoad(url, context);
  const source = await readFile(new URL(url), 'utf8');
  const { descriptor } = parse(source, { filename: url });
  const script = compileScript(descriptor, { id: url, inlineTemplate: true });
  return { format: 'module', shortCircuit: true, source: script.content };
}
