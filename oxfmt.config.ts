import type { OxfmtConfig } from 'oxfmt'

export default {
  // Generated files keep the style of the tool that writes them. Markdown is left as written:
  // oxfmt would pad every table column, so editing one cell would rewrite the whole table.
  ignorePatterns: ['**/payload-types.ts', '**/importMap.js', '**/*.md', 'tsconfig.json'],
  printWidth: 100,
  semi: false,
  singleQuote: true,
  sortPackageJson: false,
  trailingComma: 'all',
} satisfies OxfmtConfig
