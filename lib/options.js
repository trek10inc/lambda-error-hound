'use strict'

function yesterday () {
  return new Date(new Date().setDate(new Date().getDate()-1))
}

var yargs = require('yargs')
          .help()
          .usage('\nUsage: $0 command options')
          .command('list', 'list all lambda functions', function (yargs) {
            return yargs
            .help()
            .options('f', {
              alias: 'functionName',
              describe: 'List lambda functions',
              demand: false,
              nargs: 0 })
            .options('g', {
              alias: 'group',
              describe: 'List group names, optionally provide a prefix to filter',
              demand: false,
              nargs: 0 })
            .check( function (args) {
              if (args.functionName || args.group)
                return true
              else
                return 'You must specify either functions or groups'
            })
          })
          .command('error', 'get logs around lambda errors', function (yargs) {
            return yargs
            .help()
            .options('f', {
              alias: 'functionName',
              describe: 'Lambda function name',
              demand: true,
              nargs: 1 })

            .options('s', {
              alias: 'startDate',
              describe: 'search starting date/time',
              demand: false,
              default: yesterday,
              nargs: 1 })
           
            .options('e', {
              alias: 'endDate',
              describe: 'search upto date/time',
              demand: false,
              nargs: 1,
              default: Date.now })
            
            .options('i', {
              alias: 'interval',
              describe: 'search previous n minutes',
              demand: false,
              nargs: 1 })

            .options('a', {
              alias: 'after',
              describe: 'minutes of logs after error to find',
              demand: false,
              nargs: 1,
              default: 1 })

            .options('b', {
              alias: 'before',
              describe: 'minutes of logs before error to find',
              demand: false,
              nargs: 1,
              default: 1 })
           
           .options('k', {
              alias: 'skip',
              describe: 'number of errors to skip',
              demand: false,
              nargs: 1,
              default: 0 })

            .options('t', {
              alias: 'take',
              describe: 'number of errors to find logs for',
              demand: false,
              nargs: 1,
              default: 5 })
          })
          .command('group', 'get logs from a cloudwatch group for a specific interval', function (yargs) {
            return yargs
            .help()
            .options('g', {
              alias: 'group',
              describe: 'log group to search',
              demand: true,
              nargs: 1,
              default: undefined
            })
            .options('s', {
              alias: 'startDate',
              describe: 'starting date/time',
              demand: true,
              nargs: 1
            })
           
            .options('a', {
              alias: 'after',
              describe: 'minutes of logs to get',
              demand: false,
              nargs: 1,
              default: 10 })
          })

          .options('r', {
            alias: 'region',
            describe: 'aws region to use',
            demand: false,
            nargs: 1,
            global: true,
            default: undefined
            })
          .demand(1, 'Command required')
          
var argv = yargs.argv

if (['list','error', 'group'].indexOf(argv._[0]) === -1)
  yargs.showHelp()

module.exports.argv = argv
module.exports.yargs = yargs
           