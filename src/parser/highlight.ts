import { styleTags, tags } from '@lezer/highlight'

export const highlighting = styleTags({
  Identifier: tags.name,
  Number: tags.number,
  String: tags.string,
  Boolean: tags.bool,
  fn: tags.keyword,
  end: tags.keyword,
  ':': tags.keyword,
  Regex: tags.regexp,
  Operator: tags.operator,
  Command: tags.function(tags.variableName),
  'Params/Identifier': tags.definition(tags.variableName),
  Paren: tags.paren,
})
