'use strict';
const fs = require('fs'),
    xero = require('xero-node'),
    formatCurrency = require('format-currency'),
    moment = require('moment'),
    _ = require('lodash');

//Change the log level
xero.setLogLevel('info');

function XeroDataHelper(privateKey) {
    let config = {
        authorizeCallbackUrl: process.env.authorizeCallbackUrl,
        userAgent: process.env.UserAgent,
        consumerKey: process.env.ConsumerKey,
        consumerSecret: process.env.ConsumerSecret,
        runscopeBucketId: process.env.runscopeBucketId
    };
    config.privateKey = privateKey;
    this.currentApp = new xero.PartnerApplication(config);
};

XeroDataHelper.prototype.setAccessToken = function(accessToken) {
    var tokens = accessToken.split(':');
    var exp = new Date();
    exp.setTime(exp.getTime() + (tokens[3] * 1000));
    var options = {
        accessToken: tokens[0],
        accessSecret: tokens[1],
        sessionHandle: tokens[2],
        tokenExpiry: exp.toString()
    };

    console.log("Setting Options: ", options);
    this.currentApp.setOptions(options)
}

XeroDataHelper.prototype.getOrgName = function() {
    console.log("Getting Org Name");
    return this.currentApp.core.organisations.getOrganisation()
        .then(function(ret) {
            return ret.Name;
        })
        .catch(function(err) {
            console.log(err)
            return '';
        })
};

XeroDataHelper.prototype.formatOrgName = function(orgName) {
    if (orgName) {
        return `You are currently connected to the Zero Organisation: ${orgName}. To get a status report for this organisation, say: weekly status report.`;
    } else {
        return "There was an issue getting the name of your Zero organisation. Please link your account using the Alexa app and try again."
    }

};

XeroDataHelper.prototype.getInvoices = function(f) {
    let filter = {};
    if (f) {
        filter.where = f;
    }

    return this.currentApp.core.invoices.getInvoices(filter)
        .then(function(invoices) {
            return invoices;
        })
        .catch(function(err) {
            console.log(err)
            return [];
        })
};

XeroDataHelper.prototype.getStatusReport = function(type) {

    let endOfWeek = moment().endOf('week').toDate();
    let filter = `Status == "AUTHORISED" && DueDate <= DateTime(${endOfWeek.getYear() + 1900}, ${endOfWeek.getMonth() + 1}, ${endOfWeek.getDate()})`;

    if (type === 'INVOICE') {
        filter += ' && Type == "ACCREC"';
    } else if (type === 'BILL') {
        filter += ' && Type == "ACCPAY"';
    }

    let value = this.getInvoices(filter)
        .then(function(invoices) {
            //Get the total balance of all invoices owed.
            //Get the highest invoice ID, amount and contact
            let invoiceReport = {
                action: `${type}_STATUS`,
                runningTotal: 0,
                highestInvoiceValue: 0,
                highestInvoiceID: '',
                highestInvoiceNumber: '',
                highestInvoiceContactName: '',
                highestInvoiceDueDate: '',
                weekEnding: `${endOfWeek.getYear() + 1900}-${endOfWeek.getMonth() + 1}-${endOfWeek.getDate()}`
            };

            for (var i = 0; i < invoices.length; i++) {
                invoiceReport.runningTotal += Math.ceil(invoices[i].AmountDue * 100) / 100;
                if (invoices[i].AmountDue > invoiceReport.highestInvoiceValue) {
                    invoiceReport.highestInvoiceID = invoices[i].InvoiceID;
                    invoiceReport.highestInvoiceValue = invoices[i].AmountDue;
                    if (invoices[i].InvoiceNumber && invoices[i].InvoiceNumber !== '') {
                        invoiceReport.highestInvoiceNumber = invoices[i].InvoiceNumber;
                    } else if (invoices[i].Reference && invoices[i].Reference !== '') {
                        invoiceReport.highestInvoiceNumber = invoices[i].Reference;
                    } else {
                        invoiceReport.highestInvoiceNumber = "empty";
                    }
                    invoiceReport.highestInvoiceContactName = invoices[i].Contact.Name;
                    invoiceReport.highestInvoiceDueDate = invoices[i].DueDate;
                }
            }

            return invoiceReport;

        })
        .catch(function(err) {
            console.log(err);
        });

    return value;

};

XeroDataHelper.prototype.getInvoiceStatusReport = function() {
    return this.getStatusReport("INVOICE");
}

XeroDataHelper.prototype.getBillStatusReport = function() {
    return this.getStatusReport("BILL");
}

XeroDataHelper.prototype.payInvoice = function(invoiceReport) {

    let filter = 'Type == "BANK" && Status != "ARCHIVED"';
    console.log("Applying Payment for: ", invoiceReport)
    var self = this;
    return self.currentApp.core.accounts.getAccounts({ where: filter })
        .then(function(accounts) {

            var accountCode = '';
            for (var i = 0; i < accounts.length; i++) {
                if (accounts[i].Code) {
                    accountCode = accounts[i].Code
                    break;
                }
            }

            var payment = self.currentApp.core.payments.createPayment({
                Invoice: {
                    InvoiceID: invoiceReport.highestInvoiceID
                },
                Account: {
                    Code: accountCode
                },
                Date: new Date().toISOString().split("T")[0],
                Amount: invoiceReport.highestInvoiceValue
            });

            return payment.save();
        }).then(function(payments) {
            if (payments && payments.entities && payments.entities.length > 0) {
                return true;
            } else {
                return false;
            }
        });
}

XeroDataHelper.prototype.formatInvoiceStatusReport = function(invoiceStatusValues) {

    var compiled;

    if (invoiceStatusValues.runningTotal > 0) {
        compiled = _.template('Invoice status report for week ending ${weekEnding}. You currently have ${runningTotal} worth of invoices that are awaiting payment. ' +
            'The highest outstanding invoice is for ${highestInvoiceValue}. It is due from ${highestInvoiceContactName}, ' +
            'and was due on ${highestInvoiceDueDate}. The invoice ID is ${highestInvoiceNumber}. To pay this invoice now please say Pay Invoice.');
    } else {
        compiled = _.template('Invoice status report for week ending ${weekEnding}. You currently have ${runningTotal} worth of invoices that are awaiting payment. To hear more say, Bill Status Report.');
    }

    let opts = { format: '%s%v', symbol: '$' };
    let input = {
        runningTotal: formatCurrency(invoiceStatusValues.runningTotal, opts),
        highestInvoiceValue: formatCurrency(invoiceStatusValues.highestInvoiceValue, opts),
        highestInvoiceContactName: invoiceStatusValues.highestInvoiceContactName,
        highestInvoiceDueDate: moment(invoiceStatusValues.highestInvoiceDueDate).format('YYYY-MM-DD'),
        highestInvoiceNumber: invoiceStatusValues.highestInvoiceNumber,
        weekEnding: invoiceStatusValues.weekEnding
    }

    return compiled(input);

};

XeroDataHelper.prototype.formatBillStatusReport = function(invoiceStatusValues) {
    var compiled;

    if (invoiceStatusValues.runningTotal > 0) {
        compiled = _.template('Bill status report for week ending ${weekEnding}. You currently have ${runningTotal} worth of bills that are awaiting payment. ' +
            'The highest outstanding bill is for ${highestInvoiceValue}. It is owed to ${highestInvoiceContactName}, ' +
            'and was due on ${highestInvoiceDueDate}. The bill ID is ${highestInvoiceNumber}.  To pay this invoice now please say Pay Invoice.');
    } else {
        compiled = _.template('Bill status report for week ending ${weekEnding}. You currently have ${runningTotal} worth of bills that are awaiting payment. To hear more say, Invoice Status Report.');
    }

    let opts = { format: '%s%v', symbol: '$' };
    let input = {
        runningTotal: formatCurrency(invoiceStatusValues.runningTotal, opts),
        highestInvoiceValue: formatCurrency(invoiceStatusValues.highestInvoiceValue, opts),
        highestInvoiceContactName: invoiceStatusValues.highestInvoiceContactName,
        highestInvoiceDueDate: moment(invoiceStatusValues.highestInvoiceDueDate).format('YYYY-MM-DD'),
        highestInvoiceNumber: invoiceStatusValues.highestInvoiceNumber,
        weekEnding: invoiceStatusValues.weekEnding
    }

    return compiled(input);
};

XeroDataHelper.prototype.saveAction = function(name, value, response) {

    try {
        response.session(name, JSON.stringify(value));
        console.log("Saved data to the session:", value);
    } catch (error) {
        console.log("error saving data to session:", error);
    }

};

XeroDataHelper.prototype.loadAction = function(name, request) {
    var value = "";

    if (request.hasSession()) {
        try {
            var session = request.getSession();
            var data = session.get(name);
            console.log("Retrieved data from the session:", data);
            if (data) {
                value = JSON.parse(data);
            } else {
                console.log("Session data was undefined");
            }
        } catch (error) {
            console.log("error getting data from session:", error);
        }
    } else {
        console.log("retrieving data failed. Session doesn't exist.");
    }

    return value;
}

XeroDataHelper.prototype.deleteAction = function(request) {

    if (request.hasSession()) {
        try {
            var session = request.getSession();
            session.clear(name);
            console.log("Cleared data from the session:", name);
            return { deleted: true };
        } catch (error) {
            console.log("error clearing data from session:", error);
        }
    } else {
        console.log("retrieving data failed. Session doesn't exist.");
    }
    return { deleted: false };
}

module.exports = XeroDataHelper;