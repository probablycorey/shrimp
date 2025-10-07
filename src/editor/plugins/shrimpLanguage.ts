import { parser } from '#/parser/shrimp'
import { LRLanguage, LanguageSupport } from '@codemirror/language'
import { highlighting } from '#/parser/highlight.js'

const language = LRLanguage.define({
  parser: parser.configure({ props: [highlighting] }),
})

export const shrimpLanguage = new LanguageSupport(language)
