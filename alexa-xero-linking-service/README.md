# Alexa Xero Linking Service

This is a serverless oAuth 1.0a to oAuth 2.0 converter to allow the Xero Alexa Skill to use the Alexa Account Linking functionality.

## Alexa Account Linking

Alexa offers a function that allows developers to link an Alexa skill to a third party identity service to access functionality.

This process is driven using the Alexa OAuth2.0 linking functionality.

In order to link with Xero, a proxy needed to be created to convert Alexa request parameters and flows to the Xero ones, then convert them back on the way through.

This process uses the following serverless technologies:

- ClaudiaJS API Builder
- AWS API Gateway
- AWS Lambda
- AWS DynamoDB

## Installation

Clone the repo to your directory.

1. Install Claudia JS and Configure AWS Credentials file(https://claudiajs.com/tutorials/installing.html)
2. Run `yarn` to install the dependencies.
3. Run the following script to create the claudia application:
```
claudia create --region us-east-1 --api-module index --profile <profile_from_credentials_file>
```
Note the URL that is returned when this script finishes.  It'll look something like: 

`https://83bc8c3nc.execute-api.us-east-1.amazonaws.com/latest/`

4. Create an `env.json` file as follows:
```
{
    "ConsumerKey": "<FROM DEVELOPER.XERO.COM>",
    "ConsumerSecret": "<FROM DEVELOPER.XERO.COM>",
    "UserAgent": "Alexa Account Linking Service",
    "authorizeCallbackUrl": "https://<URL FROM ABOVE>/RequestTokenRedirect"
}

e.g. 

{
    "ConsumerKey": "AB38CBDFAEFBBA2CB399CB",
    "ConsumerSecret": "993DBC29CF3546DBAAED",
    "UserAgent": "Alexa Account Linking Service",
    "authorizeCallbackUrl": "https://83bc8c3nc.execute-api.us-east-1.amazonaws.com/latest/RequestTokenRedirect"
}

```

5. Update claudia to use the env.json file:

```
claudia update --profile <profile_from_credentials_file> --set-env-from-json env.json
```

This is now set up to add to your Alexa Skill.

## Adding the login process to your Alexa Skill

1. Create an account on developer.amazon.com.
2. Select 'Alexa' and 'Alexa Skills Kit'
3. Select your Skill, or 'Add a New Skill'
4. On the 'Configuration' section, enable 'Account Linking'

Enter the following information:

**Authorization URL:** https://83bc8c3nc.execute-api.us-east-1.amazonaws.com/latest/RequestToken

(Replace with your URL)

**Client ID:** Some value (doesn't matter)

**Domain List:**
- app.xero.com
- Your AWS URL (just the domain e.g. xxxxx.execute-api.us-east-1.amazonaws.com)
- login.xero.com
- go.xero.com
- edge.xero.com
- pitangui.amazon.com
- api.xero.com

**Scope:** None

**Authorization Grant Type:** Auth Code Grant

**Access Token URI:** https://83bc8c3nc.execute-api.us-east-1.amazonaws.com/latest/AccessToken

**Client Secret:** Some value (doesn't matter)

**Client Authentication Scheme:** Credentials in request body

5. Click Save.

Your skill now has account linking enabled.

## Executing the flow

1. Sign in to your Echo device at alexa.amazon.com
2. Search for your skill
3. Click 'Enable' - this will redirect you to Xero
4. Sign in
5. Select your org and click 'Allow'
6. You will be redirected to a page that states 'Connected successfully'.
7. Your skill is now linked.

See the xbot-alexa-skill project for more information about how to use this authorization within the skill.

For more information, tweet @xeroapi or @jordwalsh.

Copyright (c) 2017 Jordan Walsh

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.