const ApiBuilder = require('claudia-api-builder'),
    api = new ApiBuilder(),
    qs = require('qs'),
    xero = require('xero-node'),
    lib = require('claudiajs-dynamodb'),
    AWS = require('aws-sdk');

AWS.config.region = 'us-east-1';

function initXeroClient() {

    let config = {
        authorizeCallbackUrl: process.env.authorizeCallbackUrl,
        userAgent: process.env.UserAgent,
        consumerKey: process.env.ConsumerKey,
        consumerSecret: process.env.ConsumerSecret,
        s3BucketName: process.env.s3BucketName,
        runscopeBucketId: process.env.runscopeBucketId,
        privateKeyFileName: process.env.privateKeyName
    };

    var s3 = new AWS.S3();
    return s3.getObject({ Bucket: config.s3BucketName, Key: config.privateKeyFileName }).promise()
        .then(function(data) {
            config.privateKey = data.Body.toString();
            return new xero.PartnerApplication(config);
        })
        .catch(function(err) {
            console.log("Error:", err);
        })
}

function initDynamoClient() {
    let dynamoconfig = {
        region: "us-east-1"
    };
    var dynamo = new lib.dynamo(dynamoconfig);
    dynamo.tableName = "alexa-xbot-link";
    return dynamo;
}

function saveData(data) {
    //returns a promise from the AWS API
    return lib.create(data, initDynamoClient());
}

function queryData(token) {
    //returns a promise from the AWS API
    return lib.query(token, initDynamoClient());
}

function scanData(filter) {

    var options = {
        filter: filter
    };

    //returns a promise from the AWS API
    return lib.scan(initDynamoClient(), options);
}

//Redirect to xero and perform the authorisation
api.get('/RequestToken', (req, res) => {
    var xeroClient;
    return initXeroClient().then(function(thisClient) {
            xeroClient = thisClient;
            return xeroClient.getRequestToken();
        })
        .then(function(data) {
            console.log("got request token", data.token);

            Object.assign(data, req.queryString);
            console.log("storing data in dynamo: ", data);
            return saveData(data).then(function(response) {
                if (!response.err) {
                    console.log("no error, building url");
                    let url = xeroClient.buildAuthorizeUrl(data.token);
                    return url;
                } else {
                    console.log("error occurred:", response.err);
                    throw new Error("Error Occurred. Please check the logs.")
                }
            }).catch(function(err) {
                console.log(err);
                throw new Error("Error Occurred. Please check the logs.")
            });
        })
        .catch(function(err) {
            console.log(err);
            throw new Error("Error Occurred. Please check the logs.")
        });
}, { success: 302, error: 500 });



api.get('/RequestTokenRedirect', (req, res) => {

    console.log("Request: ", req.queryString)

    var data = {
        token: req.queryString.oauth_token
    };

    return queryData(data).then(function(response) {
            console.log("Database Response: ", response);
            var item = response.Items[0];
            var redirect_uri = item.redirect_uri;
            var state = item.state;
            item.code = req.queryString.oauth_verifier;

            console.log("storing data in dynamo: ", item);
            return saveData(item).then(function(response) {
                if (!response.err) {
                    console.log("no error,redirecting to get the access token");
                    return `${redirect_uri}?state=${state}&code=${item.code}`;
                } else {
                    console.log("error occurred:", data.err);
                    throw new Error("Error Occurred. Please check the logs.")
                }
            }).catch(function(err) {
                console.log(err);
                throw new Error("Error Occurred. Please check the logs.")
            });
        })
        .catch(function(err) {
            console.log(err);
            throw new Error("Error Occurred. Please check the logs.")
        });


}, { success: 301, error: 500 });

//Handles Access Token and refresh calls
api.post('/AccessToken', (req, res) => {

    console.log("Request: ", req.body)

    var data = qs.parse(req.body);

    console.log("Data: ", data)

    if (data.grant_type === 'authorization_code' && data.code) {
        var filter = {
            code: data.code
        };

        console.log("Scanning DB for:", filter);

        return scanData(filter).then(function(response) {
                console.log("Returned from DB: ", response);
                var item = response.Items[0];
                var oauth_token = item.token;
                var oauth_secret = item.secret;
                var oauth_verifier = item.code;

                var xeroClient;

                return initXeroClient()
                    .then(function(thisClient) {
                        xeroClient = thisClient;
                        return xeroClient.setAccessToken(item.token, item.secret, item.code)
                    })
                    .then(returnResults)
                    .catch(throwError);

            })
            .catch(function(err) {
                console.log(err);
                throw new Error("Error Occurred. Please check the logs.")
            });
    } else if (data.grant_type === 'refresh_token' && data.refresh_token) {
        return initXeroClient().then(function(thisClient) {
            xeroClient = thisClient;
            var tokens = data.refresh_token.split(':');

            var options = {
                accessToken: tokens[0],
                accessSecret: tokens[1],
                sessionHandle: tokens[2]
            };

            console.log("Setting Options: ", options);
            xeroClient.setOptions(options)
            return xeroClient.refreshAccessToken()
                .then(returnResults)
                .catch(throwError);
        });
    }
}, { success: 200, error: 500 });

function returnResults(xeroResponse) {
    console.log("Xero Response: ", xeroResponse);

    var token = {
        access_token: `${xeroResponse.results.oauth_token}:${xeroResponse.results.oauth_token_secret}:${xeroResponse.results.oauth_session_handle}:${xeroResponse.results.oauth_expires_in}`,
        refresh_token: `${xeroResponse.results.oauth_token}:${xeroResponse.results.oauth_token_secret}:${xeroResponse.results.oauth_session_handle}:${xeroResponse.results.oauth_expires_in}`,
        token_type: "Bearer",
        expires_in: `${xeroResponse.results.oauth_expires_in}`
    };

    console.log("no error,sending back the access token:", token);
    return token;
}

function throwError(err) {
    console.log(err);
    throw new Error("Error Occurred. Please check the logs.")
}

module.exports = api;