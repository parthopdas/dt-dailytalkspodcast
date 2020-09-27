import * as yargs from 'yargs'

const args = yargs
  .commandDir('cmddefs')
  .demandCommand()
  .alias('help', 'h')
  .alias('version', 'V')
  .parse()

console.log('Parsed arguments:', args)
