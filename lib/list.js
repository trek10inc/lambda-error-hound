'use strict'

const aws     = require('aws-sdk')
const Promise = require('bluebird')

module.exports.listLambdas = function (region) {
  const lambda  = new aws.Lambda({region: region})
  return lambda.listFunctions({},function (err, data) {
    if (err) console.log(err)
    else {
      data.Functions.forEach((f) => console.log(f.FunctionName))
    }
  })
}

module.exports.listGroups = function (region, prefix) {
  const cwl = Promise.promisifyAll(new aws.CloudWatchLogs({region: region }))

  return listGroupsRecursively(cwl, [], prefix).each( (g) => console.log(g))
}

function listGroupsRecursively (cwl, groups, prefix, nextToken) {
  groups = groups || []
  return cwl.describeLogGroupsAsync({
    nextToken: nextToken,
    logGroupNamePrefix: prefix
  }).then( function (data) {
    groups = groups.concat(data.logGroups.map( (g) => g.logGroupName ))
    if (data.nextToken)
      return listGroupsRecursively(cwl, groups, prefix, data.nextToken)
    else
      return Promise.resolve(groups)
  })
}
