# lambda-error-hound
Utility for quickly finding cloudwatch logs surrounding an lambda error 

## Installation

`npm install -g lambda-error-hound`

## Example

`lambdaErrorHound error -f myfunctionwitherrors`

## Usage

Lambda error hounds has three modes, error, group and list

### List
This is a convenience operation. It lists either Lambda functions or Cloudwatch log groups.

`lambdaErrorHound list -f` lists all Lambda functions.

`lambdaErrorHound list -g` lists all CloudWatch log groups


### Error
Finds CloudWatch error metrics for the specified function in the specified time interval. Then it pulls logs from the corresponding log group's log streams.

Options

	-r, --region        aws region to use

This is required if the AWS_DEFAULT_REGION environment variable is not set.

	-f, --functionName  Lambda function name                            [required]

Lambda function

	-s, --startDate     search starting date/time           [default: (yesterday)]

Beginning date in format yyyy-mm-dd hh:mm:ss in local time.

	-e, --endDate       search upto date/time                     [default: (now)]

Ending date in format yyyy-mm-dd hh:mm:ss in local time.

	-i, --inteval       search previous n minutes

Sets start time to n minutes in the past

	-a, --after         minutes of logs after error to find           [default: 1]

For every error found get all logs from this many minutes after the time of the error metric.
This should be greater then the run time of the function.

	-b, --before        minutes of logs before error to find          [default: 1]

For every error found get all logs from this many minutes after the time of the error metric.

	-k, --skip          number of errors to skip                      [default: 0]

Skip this many errors. Useful if you have hundreds of errors and only want to look at a few at a time.

	-t, --take          number of errors to find logs for             [default: 5]

Look at this many errors. Useful if you have hundreds of errors and only want to look at a few at a time.

### Group
Get Cloudwatch logs from a log group for a specific timeframe.

Options

	-r, --region        aws region to use

This is required if the AWS_DEFAULT_REGION environment variable is not set.

	-g, --group         log group to search                             [required]

Aws Cloudwatch Log group to get logs from. Don't forget leading `/` if it exists

	-s, --startDate     search starting date/time           [default: (yesterday)]

Beginning date in format yyyy-mm-dd hh:mm:ss in local time.

    -a, --after      minutes of logs to get                          [default: 10]

Number of minutes of logs to get.


## Credentials

Lambda Error Hound uses the aws nodejs sdk with out specifying credentials.
This means that the sdk will look for credentials in the following order.
1. Environment variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and optionally AWS_SESSION_TOKEN
2. If AWS_PROFILE is set that profile is used from the ~/.aws/config file.
3. EC2 Instance metadata

