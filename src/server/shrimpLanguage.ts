import { parser } from '../parser/shrimp'
import { LRLanguage, LanguageSupport } from '@codemirror/language'
import { highlighting } from '../parser/highlight.js'

export const shrimpLanguage = () => {
  const language = LRLanguage.define({
    parser: parser.configure({ props: [highlighting] }),
  })

  return new LanguageSupport(language)
}
