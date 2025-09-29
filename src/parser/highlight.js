import { Identifier, Params } from '@/parser/shrimp.terms'
import { styleTags, tags } from '@lezer/highlight'

export const highlighting = styleTags({
  Identifier: tags.name,
  Number: tags.number,
  String: tags.string,
  Boolean: tags.bool,
  Keyword: tags.keyword,
  Operator: tags.operator,
  // Params: tags.definition(tags.variableName),
  'Params/Identifier': tags.definition(tags.variableName),
  Paren: tags.paren,
})
