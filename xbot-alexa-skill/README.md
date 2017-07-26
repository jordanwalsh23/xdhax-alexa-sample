## Xero Alexa Skill (X-BOT)

This is an alexa skill that allows the user to access the information in their Xero file using only voice commands.

This skill requires the Alexa Account Linking to be set up, so please see the `alexa-xero-linking-service` first.

### Functions

- Check which org you are connected to
- Get a weekly bill status report
- Get a weekly invoice status report

## Installation

This skill has been packaged to be installed as a Lambda Function.  Simply zip the contents into a file and upload to AWS Lambda.

This will give you an AWS ARN for the Lambda function e.g. 
`arn:aws:lambda:us-east-1:82382322931:function:my_alexa_skill`

Copy/Paste this value into your Alexa Skills Kit and use the `interaction-model.json` file to populate your Interaction Model.

Save your skill and it should be available on your alexa account for testing.

## Sample Utterances

- `Open ex bot`
- `Ask ex bot which org am I connected to?`
- `Ask ex bot for my weekly invoice status report.`
- `Ask ex bot for my weekly bill status report.`
- `Tell ex bot commence bot building process` (.... mwa ha ha)

For more information, tweet @xeroapi or @jordwalsh.

Copyright (c) 2017 Jordan Walsh

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.