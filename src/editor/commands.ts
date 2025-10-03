export type CommandShape = {
  command: string
  description?: string
  args: ArgShape[]
  execute: string | ((...args: any[]) => any)
}

type ArgShape<T extends keyof ArgTypeMap = keyof ArgTypeMap> =
  | {
      name: string
      type: T
      description?: string
      named?: false
    }
  | {
      name: string
      type: T
      description?: string
      named: true
      default: ArgTypeMap[T]
    }

type ArgTypeMap = {
  string: string
  number: number
  boolean: boolean
}

const commandShapes: CommandShape[] = [
  {
    command: 'ls',
    description: 'List the contents of a directory',
    execute: './commands/ls.ts',
    args: [
      { name: 'path', type: 'string', description: 'The path to list' },
      { name: 'all', type: 'boolean', description: 'Show hidden files', default: false },
      { name: 'long', type: 'boolean', description: 'List in long format', default: false },
      {
        name: 'short-names',
        type: 'boolean',
        description: 'Only print file names',
        default: false,
      },
      { name: 'full-paths', type: 'boolean', description: 'Display full paths', default: false },
    ],
  },

  {
    command: 'cd',
    description: 'Change the current working directory',
    execute: './commands/cd.ts',
    args: [{ name: 'path', type: 'string', description: 'The path to change to' }],
  },

  {
    command: 'cp',
    description: 'Copy files or directories',
    execute: './commands/cp.ts',
    args: [
      { name: 'source', type: 'string', description: 'Source file or directory' },
      { name: 'destination', type: 'string', description: 'Destination path' },
      { name: 'recursive', type: 'boolean', description: 'Copy recursively', default: false },
      { name: 'verbose', type: 'boolean', description: 'Verbose output', default: false },
    ],
  },

  {
    command: 'mv',
    description: 'Move files or directories',
    execute: './commands/mv.ts',
    args: [
      { name: 'source', type: 'string', description: 'Source file or directory' },
      { name: 'destination', type: 'string', description: 'Destination path' },
      { name: 'verbose', type: 'boolean', description: 'Verbose output', default: false },
    ],
  },

  {
    command: 'rm',
    description: 'Remove files or directories',
    execute: './commands/rm.ts',
    args: [
      { name: 'path', type: 'string', description: 'Path to remove' },
      { name: 'recursive', type: 'boolean', description: 'Remove recursively', default: false },
      { name: 'force', type: 'boolean', description: 'Force removal', default: false },
      { name: 'verbose', type: 'boolean', description: 'Verbose output', default: false },
    ],
  },

  {
    command: 'mkdir',
    description: 'Create directories',
    execute: './commands/mkdir.ts',
    args: [
      { name: 'path', type: 'string', description: 'Directory path to create' },
      { name: 'verbose', type: 'boolean', description: 'Verbose output', default: false },
    ],
  },

  {
    command: 'touch',
    description: 'Create empty files or update timestamps',
    execute: './commands/touch.ts',
    args: [
      { name: 'path', type: 'string', description: 'File path to touch' },
      { name: 'access', type: 'boolean', description: 'Update access time only', default: false },
      {
        name: 'modified',
        type: 'boolean',
        description: 'Update modified time only',
        default: false,
      },
    ],
  },

  {
    command: 'echo',
    description: 'Display a string',
    execute: './commands/echo.ts',
    args: [
      { name: 'text', type: 'string', description: 'Text to display' },
      { name: 'no-newline', type: 'boolean', description: "Don't append newline", default: false },
    ],
  },

  {
    command: 'cat',
    description: 'Display file contents',
    execute: './commands/cat.ts',
    args: [
      { name: 'path', type: 'string', description: 'File to display' },
      { name: 'numbered', type: 'boolean', description: 'Show line numbers', default: false },
    ],
  },

  {
    command: 'head',
    description: 'Show first lines of input',
    execute: './commands/head.ts',
    args: [
      { name: 'path', type: 'string', description: 'File to read from' },
      { name: 'lines', type: 'number', description: 'Number of lines', default: 10 },
    ],
  },

  {
    command: 'tail',
    description: 'Show last lines of input',
    execute: './commands/tail.ts',
    args: [
      { name: 'path', type: 'string', description: 'File to read from' },
      { name: 'lines', type: 'number', description: 'Number of lines', default: 10 },
      { name: 'follow', type: 'boolean', description: 'Follow file changes', default: false },
    ],
  },

  {
    command: 'grep',
    description: 'Search for patterns in text',
    execute: './commands/grep.ts',
    args: [
      { name: 'pattern', type: 'string', description: 'Pattern to search for' },
      {
        name: 'ignore-case',
        type: 'boolean',
        description: 'Case insensitive search',
        default: false,
      },
      { name: 'invert-match', type: 'boolean', description: 'Invert match', default: false },
      { name: 'line-number', type: 'boolean', description: 'Show line numbers', default: false },
    ],
  },

  {
    command: 'sort',
    description: 'Sort input',
    execute: './commands/sort.ts',
    args: [
      { name: 'reverse', type: 'boolean', description: 'Sort in reverse order', default: false },
      {
        name: 'ignore-case',
        type: 'boolean',
        description: 'Case insensitive sort',
        default: false,
      },
      { name: 'numeric', type: 'boolean', description: 'Numeric sort', default: false },
    ],
  },

  {
    command: 'uniq',
    description: 'Filter out repeated lines',
    execute: './commands/uniq.ts',
    args: [
      { name: 'count', type: 'boolean', description: 'Show count of occurrences', default: false },
      {
        name: 'repeated',
        type: 'boolean',
        description: 'Show only repeated lines',
        default: false,
      },
      { name: 'unique', type: 'boolean', description: 'Show only unique lines', default: false },
    ],
  },

  {
    command: 'select',
    description: 'Select specific columns from data',
    execute: './commands/select.ts',
    args: [{ name: 'columns', type: 'string', description: 'Columns to select' }],
  },

  {
    command: 'where',
    description: 'Filter data based on conditions',
    execute: './commands/where.ts',
    args: [{ name: 'condition', type: 'string', description: 'Filter condition' }],
  },

  {
    command: 'group-by',
    description: 'Group data by column values',
    execute: './commands/group-by.ts',
    args: [{ name: 'column', type: 'string', description: 'Column to group by' }],
  },

  {
    command: 'ps',
    description: 'List running processes',
    execute: './commands/ps.ts',
    args: [
      { name: 'long', type: 'boolean', description: 'Show detailed information', default: false },
    ],
  },

  {
    command: 'sys',
    description: 'Show system information',
    execute: './commands/sys.ts',
    args: [],
  },

  {
    command: 'which',
    description: 'Find the location of a command',
    execute: './commands/which.ts',
    args: [
      { name: 'command', type: 'string', description: 'Command to locate' },
      { name: 'all', type: 'boolean', description: 'Show all matches', default: false },
    ],
  },
] as const

let commandSource = () => commandShapes
export const setCommandSource = (fn: () => CommandShape[]) => {
  commandSource = fn
}

export const resetCommandSource = () => {
  commandSource = () => commandShapes
}

export const matchingCommands = (prefix: string) => {
  const match = commandSource().find((cmd) => cmd.command === prefix)
  const partialMatches = commandSource().filter((cmd) => cmd.command.startsWith(prefix))

  return { match, partialMatches }
}
