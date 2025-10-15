import { describe, expect, test } from 'bun:test'
import '../shrimp.grammar' // Importing this so changes cause it to retest!

describe('word interpolation', () => {
  test.only('word with variable interpolation', () => {
    expect('path/$file').toMatchTree(`
      Word
        WordFragment path/
        Interpolation
          Identifier file
    `)
  })

  test('word with expression interpolation', () => {
    expect('prefix-$(123)').toMatchTree(`
      Word
        WordFragment prefix-
        Interpolation
          leftParen
          Number 123
          rightParen
    `)
  })

  test('multiple interpolations in word', () => {
    expect('$user/$file').toMatchTree(`
      Word
        Interpolation
          Identifier user
        WordFragment /
        Interpolation
          Identifier file
    `)
  })

  test('dollar not followed by identifier stays in word', () => {
    expect('price$10').toMatchTree(`
      Word
        WordFragment price$10
    `)
  })

  test('escaped dollar in word', () => {
    expect('price\\$10').toMatchTree(`
      Word
        WordFragment price
        EscapeSeq
        WordFragment 10
    `)
  })

  test('interpolation at start of word', () => {
    expect('$HOME/documents').toMatchTree(`
      Word
        Interpolation
          Identifier HOME
        WordFragment /documents
    `)
  })

  test('interpolation at end of word', () => {
    expect('./path/$filename').toMatchTree(`
      Word
        WordFragment ./path/
        Interpolation
          Identifier filename
    `)
  })

  test('complex expression interpolation', () => {
    expect('output-$(add 1 2).txt').toMatchTree(`
      Word
        WordFragment output-
        Interpolation
          leftParen
          FunctionCall
            Identifier add
            PositionalArg
              Number 1
            PositionalArg
              Number 2
          rightParen
        WordFragment .txt
    `)
  })

  test('emoji in interpolated identifier', () => {
    expect('hello/$😎file').toMatchTree(`
      Word
        WordFragment hello/
        Interpolation
          Identifier 😎file
    `)
  })

  test('escaped space in word', () => {
    expect('my\\ file.txt').toMatchTree(`
      Word
        WordFragment my
        EscapeSeq
        WordFragment file.txt
    `)
  })

  test('multiple escapes and interpolations', () => {
    expect('pre\\$fix-$var-\\$end').toMatchTree(`
      Word
        WordFragment pre
        EscapeSeq
        WordFragment fix-
        Interpolation
          Identifier var
        WordFragment -
        EscapeSeq
        WordFragment end
    `)
  })

  test('plain word without interpolation still works', () => {
    expect('./file.txt').toMatchTree(`
      Word
        WordFragment ./file.txt
    `)
  })

  test('word with URL-like content', () => {
    expect('https://example.com/$path').toMatchTree(`
      Word
        WordFragment https://example.com/
        Interpolation
          Identifier path
    `)
  })

  test('nested expression in interpolation', () => {
    expect('file-$(multiply (add 1 2) 3).txt').toMatchTree(`
      Word
        WordFragment file-
        Interpolation
          leftParen
          FunctionCall
            Identifier multiply
            PositionalArg
              ParenExpr
                leftParen
                FunctionCall
                  Identifier add
                  PositionalArg
                    Number 1
                  PositionalArg
                    Number 2
                rightParen
            PositionalArg
              Number 3
          rightParen
        WordFragment .txt
    `)
  })
})

describe('word interpolation in function calls', () => {
  test('function call with interpolated word argument', () => {
    expect('cat /home/$user/file.txt').toMatchTree(`
      FunctionCall
        Identifier cat
        PositionalArg
          Word
            WordFragment /home/
            Interpolation
              Identifier user
            WordFragment /file.txt
    `)
  })

  test('multiple interpolated word arguments', () => {
    expect('cp $src/$file $dest/$file').toMatchTree(`
      FunctionCall
        Identifier cp
        PositionalArg
          Word
            Interpolation
              Identifier src
            WordFragment /
            Interpolation
              Identifier file
        PositionalArg
          Word
            Interpolation
              Identifier dest
            WordFragment /
            Interpolation
              Identifier file
    `)
  })
})
