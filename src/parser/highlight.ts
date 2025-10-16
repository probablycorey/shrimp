import { styleTags, tags } from '@lezer/highlight'

export const highlighting = styleTags({
  Identifier: tags.name,
  Number: tags.number,
  String: tags.string,
  Boolean: tags.bool,
  keyword: tags.keyword,
  end: tags.keyword,
  ':': tags.keyword,
  Null: tags.keyword,
  Regex: tags.regexp,
  Operator: tags.operator,
  Word: tags.variableName,
  Command: tags.function(tags.variableName),
  'Params/Identifier': tags.definition(tags.variableName),
  Paren: tags.paren,
})
