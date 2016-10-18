'use strict'
var Promise     = require('bluebird')
var aws     = require('aws-sdk')

function filterResults (results) {
  return results.Datapoints.filter(function (dp) {
    return dp.Sum > 0
  })
}

function flatten (array) {
  return array.reduce(function (p,c) { return p.concat(c)}, [])
}

// get errors in a specific time and generate time windows from them
module.exports.get = function (region, startDate, endDate, functionName, windowForward, windowBack, take, skip) {
  var cw      = Promise.promisifyAll(new aws.CloudWatch({region: region }))
  return cw.getMetricStatisticsAsync({
    Namespace: 'AWS/Lambda',
    MetricName: 'Errors',
    StartTime: new Date(startDate),
    EndTime: new Date(endDate),
    Period: 3600,
    Statistics: ['Sum'],
    Dimensions: [{
      Name: 'FunctionName',
      Value: functionName,
    }]
  })
  .then(filterResults)
  .tap(function (filteredResults) { console.error('Found %d hours with errors', filteredResults.length) })
  .map(function (dp) {
    return cw.getMetricStatisticsAsync({
      Namespace: 'AWS/Lambda',
      MetricName: 'Errors',
      StartTime: new Date(dp.Timestamp),
      EndTime: new Date(new Date(dp.Timestamp).getTime() + (3600 * 1000)),
      Period: 60,
      Statistics: ['Sum'],
      Dimensions: [{
        Name: 'FunctionName',
        Value: functionName,
      }]
    })
  })
  .map(filterResults)
  .then(flatten)
  .tap(function (datapoints) { console.error('Found %d minutes with errors', datapoints.length)})
  .map(function (dp) { return { timestamp: new Date(dp.Timestamp).getTime() }})
  .then(function (datapoints) {
    // sort descending
    return datapoints.sort(function (a,b) { return (b.timestamp - a.timestamp)  })
  })
  .then(function (array) {
  return array.slice(skip, skip + take)
  })
  .then(function (errors) {
    if ( errors.length === 0) {
      throw { Message: 'No errors found in time frame'}
    }
    
    // add window to error
    errors.map(function (errorWindow) {
      errorWindow.max = errorWindow.timestamp + windowForward
      errorWindow.min = errorWindow.timestamp - windowBack
      return errorWindow
    })

    // merge overlapping error windows
    var newList = errors.reduce(function (p,c) {
      if (p.length === 0) {
        p.push(c)
        return p
      }
      // console.log(p[p.length - 1].min, c.max)
      if (p[p.length - 1].min < c.max) {
        p[p.length - 1].min = c.min
        return p
      } else {
        p.push(c)
        return p
      }
    }, [])

    return newList
  })
}