import { styleTags, tags } from '@lezer/highlight'
import { Command, Identifier, Params } from '#/parser/shrimp.terms'

export const highlighting = styleTags({
  Identifier: tags.name,
  Number: tags.number,
  String: tags.string,
  Boolean: tags.bool,
  Keyword: tags.keyword,
  Operator: tags.operator,
  Command: tags.function(tags.variableName),
  CommandPartial: tags.function(tags.invalid),
  // Params: tags.definition(tags.variableName),
  'Params/Identifier': tags.definition(tags.variableName),
  Paren: tags.paren,
})
