'use strict';
module.change_code = 1;
var Alexa = require('alexa-app');
var app = new Alexa.app('xbot');
var XeroDataHelper = require('./xeroDataHelper');
var formatCurrency = require('format-currency');
var AWS = require("aws-sdk");
var xeroDataHelper = null;

AWS.config.region = 'us-east-1';

app.launch(function(req, res) {
    var prompt = 'Welcome to ex bot. This application helps you run your business by surfacing insights from your Zero account. You can ask which org am I connected to, or ask for your weekly status report. So how can I help you today?';
    res.say(prompt).reprompt(prompt).shouldEndSession(false);
});

/**
 * Get Current Connected Xero Org
 */
app.intent('getOrgName', {
    'slots': {},
    'utterances': ['{which|what} {|zero} {org|organisation|account|company|file} {|am I} {connected|attached|looking} {|at|to|on|in}'],
}, function(req, res) {
    return checkSession(req)
        .then(function(xeroDataHelper) {
            return xeroDataHelper.getOrgName()
                .then(function(orgName) {
                    res.say(xeroDataHelper.formatOrgName(orgName)).shouldEndSession(false).send();
                })
                .catch(function(err) {
                    console.log(err.statusCode);
                    var prompt = 'I couldn\'t find the connected org for you. Sorry.';
                    res.say(prompt).shouldEndSession(true).send();
                });
        })
        .catch(function(err) {
            console.log(err);
            res.linkAccount().shouldEndSession(true).say('Your Zero account is not linked. Please use the Alexa App to link your account.');
            return true;
        });

});

//https://gist.github.com/jordanwalsh23/c12c2c62628447a76252aeb624faae0e

/**
 * Get Invoice Status Report
 */
app.intent('getInvoiceStatusReport', {
    'slots': {},
    'utterances': ['{|get me|can I have|I want} {|my} {|weekly|this week\'s} invoice {report|status|status report} {|for this week}'],
}, function(req, res) {
    return checkSession(req)
        .then(function(xeroDataHelper) {
            return xeroDataHelper.getInvoiceStatusReport().then(function(invoiceReport) {
                    xeroDataHelper.saveAction('data', invoiceReport, res);
                    res.say(xeroDataHelper.formatInvoiceStatusReport(invoiceReport)).shouldEndSession(false).send();
                })
                .catch(function(err) {
                    console.log(err.statusCode);
                    var prompt = 'I couldn\'t find the invoice status report for you. Sorry.';
                    res.say(prompt).shouldEndSession(true).send();
                });
        })
        .catch(function(err) {
            res.linkAccount().shouldEndSession(true).say('Your Zero account is not linked. Please use the Alexa App to link your account.');
            return true;
        });
});

app.intent('getBillStatusReport', {
    'slots': {},
    'utterances': ['{|get me|can I have|I want} {|my} {|weekly|this week\'s} bill {report|status|status report} {|for this week}'],
}, function(req, res) {
    return checkSession(req)
        .then(function(xeroDataHelper) {
            return xeroDataHelper.getBillStatusReport().then(function(invoiceReport) {
                    xeroDataHelper.saveAction('data', invoiceReport, res);
                    res.say(xeroDataHelper.formatBillStatusReport(invoiceReport)).shouldEndSession(false).send();
                })
                .catch(function(err) {
                    console.log(err.statusCode);
                    var prompt = 'I couldn\'t find the bill status report for you. Sorry.';
                    res.say(prompt).shouldEndSession(true).send();
                });
        })
        .catch(function(err) {
            console.log(err);
            res.linkAccount().shouldEndSession(true).say('Your Zero account is not linked. Please use the Alexa App to link your account.');
            return true;
        });
});

app.intent('commenceBotBuild', {
    'slots': {},
    'utterances': ['commence bot {build|building} {|process}'],
}, function(req, res) {

    return checkSession(req)
        .then(function(xeroDataHelper) {
            xeroDataHelper.saveAction('data', { action: "botbuild" }, res);
            res.say("Commencing bot building process. Would you like to join me in an evil laugh?").shouldEndSession(false).send();
        })
        .catch(function(err) {
            console.log(err);
            res.linkAccount().shouldEndSession(true).say('Your Zero account is not linked. Please use the Alexa App to link your account.');
            return true;
        });
});

app.intent('confirmActionIntent', {
    'slots': {},
    'utterances': ['{confirm payment|pay invoice|pay now|yes}'],
}, function(req, res) {

    return checkSession(req)
        .then(function(xeroDataHelper) {
            var invoiceReport = xeroDataHelper.loadAction('data', req);

            if (invoiceReport && invoiceReport.action) {

                if (invoiceReport.action === 'botbuild') {
                    var laugh = '<p><prosody pitch="low">mwahaha haha hah hahah hah</prosody></p>' +
                        '<p><prosody pitch="medium">mwahaha haha hahah haha haha ha</prosody></p>' +
                        '<p><prosody pitch="medium">mwahaha haha hahah</prosody></p>' +
                        '<p><prosody pitch="high">mwahaha haha hahah</prosody></p>' +
                        '<p><prosody pitch="x-high">mwahaha haha hah hahah hah</prosody></p>' +
                        '<p><prosody pitch="x-high">mwahaha haha hahah haha haha ha</prosody></p>' +
                        '<p><prosody pitch="x-high">mwahaha haha hahah</prosody></p>' +
                        '<p><prosody pitch="x-high">mwahaha haha hahah</prosody></p>';
                    res.say(laugh).send();
                } else {
                    var status = xeroDataHelper.payInvoice(invoiceReport);

                    if (status) {
                        let opts = { format: '%s%v', symbol: '$' };
                        let value = formatCurrency(invoiceReport.highestInvoiceValue, opts);
                        res.say(`Payment of ${value} to ${invoiceReport.highestInvoiceContactName} was succesfully processed`).send();
                    } else {
                        res.say("There was an issue with applying the payment. Please log in to your Zero account and check the data there.").send();
                    }
                }
            } else {
                res.say("I am not feeling in a laughing mood.").send();
            }
        })
        .catch(function(err) {
            console.log(err);
            res.linkAccount().shouldEndSession(true).say('Your Zero account is not linked. Please use the Alexa App to link your account.');
            return true;
        });

});

function checkSession(req, res) {
    console.log(req);
    return new Promise(function(resolve, reject) {
        if (req && req.sessionDetails && req.sessionDetails.accessToken) {
            var s3 = new AWS.S3();
            return s3.getObject({ Bucket: process.env.s3BucketName, Key: process.env.privateKeyFileName }).promise()
                .then(function(data) {
                    xeroDataHelper = new XeroDataHelper(data.Body.toString());
                    xeroDataHelper.setAccessToken(req.sessionDetails.accessToken);
                    return resolve(xeroDataHelper);
                })
                .catch(function(err) {
                    console.log("Error:", err);
                    reject(err);
                })
        } else {
            reject("Xero Account not linked");
        }

    });
}

//hack to support custom utterances in utterance expansion string
var utterancesMethod = app.utterances;
app.utterances = function() {
    return utterancesMethod().replace(/\{\-\|/g, '{');
};

module.exports = app;