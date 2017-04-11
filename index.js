#!/usr/bin/env node 
'use strict'

var Promise     = require('bluebird')
var options     = require('./lib/options.js')
var list        = require('./lib/list.js')
var errorWindow = require('./lib/errorWindow.js')

var aws     = require('aws-sdk')
var cwl     = Promise.promisifyAll(new aws.CloudWatchLogs({region: options.argv.region }))

if (options.argv._[0] === 'list')
  if (options.argv.f)
    return list.listLambdas(options.argv.region)
  else 
    return list.listGroups(options.argv.region, options.argv.g === true ? undefined : options.argv.g)


var functionName  = options.argv.functionName
var startDate     = options.argv.startDate
var endDate       = options.argv.endDate
var windowBack    = options.argv.before * 60 * 1000
var windowForward = options.argv.after * 60 * 1000
var take          = options.argv.take
var skip          = options.argv.skip
var logGroupName  = functionName ? '/aws/lambda/' + functionName : options.argv.group
if (options.argv.interval) {
  startDate = new Date(+new Date() - (+options.argv.interval * 1000 * 60))
}

function getStreams (min, max, accumulator, nextToken) {
  return cwl.describeLogStreamsAsync({
    logGroupName: logGroupName,
    descending: true,
    orderBy: 'LastEventTime',
    nextToken: nextToken
  }).then(function (results) {
    var filtered = results.logStreams.filter(function (ls) {
      return (ls.lastEventTimestamp >= min && ls.firstEventTimestamp <= max)
    })
    var emptyLists = accumulator && accumulator.emptyLists || 0
    accumulator = (accumulator || []).concat(filtered)
    console.error('Read %d streams, %d are candidates', results.logStreams.length, filtered.length)
    if (filtered.length === 0 && accumulator.length > 0) {
      emptyLists = emptyLists + 1
    }
    accumulator.emptyLists = emptyLists
    // we need a better base case,
    // and results.logStreams[*].firstEventTime
    if (results.nextToken && (emptyLists <= 5 || (accumulator || []).length === 0)) {
      // recurse
      return getStreams (min, max, accumulator, results.nextToken)
    } else {
      return Promise.resolve(accumulator)
    }
  })
}

function writeData (errorWindow) {
  // now we have a list of errorWindow objects each has list of streams and events object with key=steamname value=list of events
  console.log()
  console.log('For logs/errors between %s and %s', 
              new Date(errorWindow.min).toUTCString(),
              new Date(errorWindow.max).toUTCString())
  console.log('==================================================================================')
  for(var stream in errorWindow.events) {
    console.log()
    console.log('Stream Name: %s', stream)
    console.log('-----------------------------------------------------------------')
    errorWindow.events[stream].forEach(function (e) {
      process.stdout.write(e.message)
    })
  }
}

var windowList

if (functionName) {

  console.error('Getting logs for function %s', functionName)
  console.error('Parameters')
  console.error('----------')
  console.error('Start Date:', new Date(startDate))
  console.error('End Date:  ', new Date(endDate))
  console.error('Log window size: %d minutes before to %d minutes after', options.argv.before, options.argv.after)
  console.error('Skipping %d errors and taking the next %d', skip, take)
  console.error()

  windowList = errorWindow.get(options.argv.region, startDate, endDate, functionName, windowForward, windowBack, take, skip)

} else {
  windowList = Promise.resolve([{
    min: new Date(startDate).getTime(),
    max: new Date(startDate).getTime() + windowForward
  }])
}

// add streams to window list
windowList.then(function (windowList) {
  var max = windowList[0].max
  var min = windowList[windowList.length -1].min
  
  return getStreams(min, max)
  .then(function (streams) {
    // add appropriate streams to error windows
    windowList.forEach(function (errorWindow) {
      errorWindow.streams = streams.filter(function (s) { 
        return s.lastEventTimestamp >= errorWindow.min && s.firstEventTimestamp <= errorWindow.max
      }).map(function (s) { return s.logStreamName })
    })
    return windowList
  })
})
.each(function (errorWindow, index, length) {
  // get the events from the streams
  errorWindow.events = {}
  var streamsRead = 0
  return Promise.map(errorWindow.streams, function (stream, streamIndex, totalStreams) {
    
    return Promise.join(cwl.getLogEventsAsync({
      logGroupName: logGroupName,
      logStreamName: stream,
      endTime: errorWindow.max,
      startTime: errorWindow.min,
      startFromHead: true
    }), Promise.delay(1000)) // Promise.delay(1000) getLogEvents api calls are limited to 10 per second
    .spread(function (results){
      process.stderr.write('Error ' + (index + 1) + ' of ' + length + ' stream ' + (++streamsRead) + ' of ' + totalStreams + '   \r')

      
      errorWindow.events[stream] = results.events
      
      //stream to reduce memory
      writeData(errorWindow)
      delete errorWindow.events[stream]

      return errorWindow
    })
  }, { concurrency: 10} )
})
.catch(function (err) {
  console.log(err)
  if (err.Message) {
    console.error(err.Message)
  } else {
    console.error(err)
  }
})
