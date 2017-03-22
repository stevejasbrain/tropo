'use strict';

const express = require('express');
var ssl = require('express-ssl');
var tropowebapi = require('tropo-webapi');
var https = require('https');
var fs = require('fs');
var bodyParser = require('body-parser');
var sslOptions = {
	key: fs.readFileSync('ehi.pi.key'),
	cert: fs.readFileSync('ehi.pi.crt')
};
// Constants
const PORT = 8443;
// App
const app = express();
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
https.createServer(sslOptions,app).listen(PORT);
console.log('Running on https://localhost:' + PORT);
const request = require('request');

const globalConfig = require('./config/global.json');
const Q = require('q');


//-------------------------------
//log4js config
const log4js = require('log4js');
log4js.configure({
	appenders: [
		{
			type: 'file',
			filename: '/data/logs/tropo-access.log',
			maxLogSize: 20480,
			backups: 3,
			category: 'normal'
		},
		{
			type: 'console'
		}
		
	],
	replaceConsole: true
});
const logger = log4js.getLogger('normal');
logger.setLevel('INFO');
app.use(log4js.connectLogger(logger, {level:log4js.levels.INFO}));
//-----------------------------


const ivrSessionService = require('./modules/ivr-session-service.js');


app.post('/ivr-tropo', function (req, res) {
    // Create a new instance of the TropoWebAPI object.
    logger.info("Helll log");
    var tropo = new tropowebapi.TropoWebAPI();
	// Use the say method https://www.tropo.com/docs/webapi/say.htm
	tropo.say("Hello World! I am ivr-tropo!");
	res.send(tropowebapi.TropoJSON(tropo));
});


app.post('/ivr-tropo/init', function(req, res) {
	let session = req.body['session'];
	logger.info("session.userType:" + session.userType);
	logger.info("init session: " + JSON.stringify(session));
	var tropo = new tropowebapi.TropoWebAPI();
	//Create event objects
	var e1 = {"value":"Sorry, I did not hear anything.","event":"timeout"};
    var e2 = {"value":"Sorry, that was not a valid option.","event":"nomatch:1"};
    var e3 = {"value":"Nope, still not a valid response","event":"nomatch:2"};
    
    //Create an array of all events
    var e = new Array(e1,e2,e3);

	var say = new Say("Please enter session id?", null, e, null, null, null);
	var choices = new Choices("[1-20 DIGITS]");
	// (choices, attempts, bargein, minConfidence, name, recognizer, required, say, timeout, voice);
	if(session.headers['X-Cisco-Call-ID']) {
		tropo.say('X-Cisco-Call-ID header value is ' + session.headers['X-Cisco-Call-ID']);
	}else {
		tropo.say('X-Cisco-Call-ID header value was not found');
	}

	if(session.headers['Content-Length']) {
		tropo.say('Content-Length is  ' + session.headers['Content-Length']);
	}else {
		tropo.say('the Content-Length header value was not found');
	}

	if(session.headers['from']) {
		tropo.say('I found the from header and logged it');
		logger.info('Your header from value is ' + session.headers['from']);
	}else {
		tropo.say("the from header value was not found");
	}

	tropo.ask(choices, 3, false, null, "sessionId", null, true, say, 60, null);
	tropo.on("continue", null, "/ivr-tropo/start", true);
	res.send(tropowebapi.TropoJSON(tropo));
});

app.post('/ivr-tropo/start-mock', (req, res) => {
	let sessionId = req.query.sessionId;
	ivrSessionService.getApiToken().then(function(tokenJson) {
		return ivrSessionService.getIvrSession(tokenJson, sessionId);
	}).then(function(ivrSession) {
		let tropo = new tropowebapi.TropoWebAPI();
		/*tropo.say("Hello " + ivrSession.leadFirstName + "To complete this enrollment,\
			you must stay on the phone and listen to some important,\
			pre-recorded information. There are three sections,\
			which take about 6 minutes total. At the end of the last section,\
			you will be given instructions on how to leave your voice signature.\
			Here's section one.");*/
		tropo.say("Hello " + ivrSession.leadFirstName);
		tropo.say(ivrSession.carrierName + " is a Medicare Advantage plan and has a contract with the Federal government.");
		tropo.say("You choose plan " + ivrSession.planName);
		tropo.on("continue", null, "/ivr-tropo/ask_part_a_month?sessionId="+sessionId, true);
		console.log(tropo.tropo[0]);
		res.send(tropowebapi.TropoJSON(tropo));
	});
});

app.post('/ivr-tropo/start', function (req, res) {
	let session = req.body['result'];
	logger.info("session.userType:" + session.userType);
	logger.info("start session: " + JSON.stringify(session));

	var sessionId = req.body['result']['actions']['value'];
	ivrSessionService.getApiToken().then(function(tokenJson) {
		return ivrSessionService.getIvrSession(tokenJson, sessionId);
	}).then(function(ivrSession) {
		var tropo = new tropowebapi.TropoWebAPI();
		/*tropo.say("Hello " + ivrSession.leadFirstName + "To complete this enrollment,\
			you must stay on the phone and listen to some important,\
			pre-recorded information. There are three sections,\
			which take about 6 minutes total. At the end of the last section,\
			you will be given instructions on how to leave your voice signature.\
			Here's section one.");*/
		tropo.say("Hello " + ivrSession.leadFirstName);
		tropo.say(ivrSession.carrierName + " is a Medicare Advantage plan and has a contract with the Federal government.");
		tropo.say("You choose plan " + ivrSession.planName);
		tropo.on("continue", null, "/ivr-tropo/ask_part_a_month?sessionId="+sessionId, true);
		console.log(tropo.tropo[0]);
		res.send(tropowebapi.TropoJSON(tropo));
	});
});

/*app.post('/ivr-tropo/disclaimer_1', function(req, res) {
	var tropo = new tropowebapi.TropoWebAPI();
	tropo.say("HCSC is a Medicare Advantage plan and has a contract with the Federal government.");
	tropo.on("continue", null, "/ivr-tropo/ask_part_a_month", true);
	res.send(tropowebapi.TropoJSON(tropo));
});*/

app.post('/ivr-tropo/ask_part_a_month', function(req, res) {
	var sessionId = req.query.sessionId;
	var tropo = new tropowebapi.TropoWebAPI();
	var say = new Say("Please enter part a effective month?");
	var choices = new Choices("[2 DIGITS]");
		// (choices, attempts, bargein, minConfidence, name, recognizer, required, say, timeout, voice);
		tropo.ask(choices, 3, false, null, "month", null, true, say, 60, null);
		tropo.on("continue", null, "/ivr-tropo/ask_part_a_year?sessionId="+sessionId, true);
		res.send(tropowebapi.TropoJSON(tropo));
	});

app.post('/ivr-tropo/ask_part_a_year', function(req, res) {
	var sessionId = req.query.sessionId;
	var partAMonth = req.body['result']['actions']['value'];
	var ivrSession = {'partAEffectiveMonth': partAMonth, 'scriptSessionId': sessionId};
	ivrSessionService.updateIvrSession(ivrSession);
	var tropo = new tropowebapi.TropoWebAPI();
	var say = new Say("Please enter part a effective year?");
	var choices = new Choices("[4 DIGITS]");
	// (choices, attempts, bargein, minConfidence, name, recognizer, required, say, timeout, voice);
	tropo.ask(choices, 3, false, null, "year", null, true, say, 60, null);
	tropo.on("continue", null, "/ivr-tropo/ask_end_stage_renal_disease?sessionId="+sessionId, true);
	res.send(tropowebapi.TropoJSON(tropo));
});

app.post('/ivr-tropo/ask_end_stage_renal_disease', function(req, res) {
	var sessionId = req.query.sessionId;
	var partAYear = req.body['result']['actions']['value'];
	var ivrSession = {'partAEffectivYear': partAYear, 'scriptSessionId': sessionId};
	ivrSessionService.updateIvrSession(ivrSession);
	var tropo = new tropowebapi.TropoWebAPI();
	var say = new Say("Have you been diagnosed with End-Stage Renal Disease or ESRD?");
	var choices = new Choices("yes, no");
	// (choices, attempts, bargein, minConfidence, name, recognizer, required, say, timeout, voice);
	tropo.ask(choices, 3, false, null, "disease", null, true, say, 60, null);
	tropo.on("continue", null, "/ivr-tropo/final_des?sessionId="+sessionId, true);
	res.send(tropowebapi.TropoJSON(tropo));
});

app.post('/ivr-tropo/final_des', function(req, res) {
	var sessionId = req.query.sessionId;
	var disease = req.body['result']['actions']['value'];
	logger.info("disease:" + disease);
	if(disease == 'yes') {
		disease = 'Y';
	}else {
		disease = 'N';
	}
	var ivrSession = {'esrdQuestion': {'endStageRenalDisease': disease}, 'scriptSessionId': sessionId};
	ivrSessionService.updateIvrSession(ivrSession);
	var tropo = new tropowebapi.TropoWebAPI();
	/*tropo.say("Your application will be sent to <HCSC>. You will receive a letter from the plan acknowledging receipt of your enrollment request");
	tropo.say("If you have any questions that we can help you with, please call eHealth Customer Service at 888-407-7044,\
	 	7am to 4pm Pacific Standard Time");
	tropo.say("Please listen carefully to the following instructions for how to leave your voice signature for this enrollment. \
		By stating your full name after the tone you are giving us permission to submit your telephonic signature.");*/

	//Create event objects
	var e1 = {"value":"Sorry, I did not hear anything.","event":"timeout"};    
    var e = new Array(e1);

	var say = new Say('Ok, after the tone please state your first and last name.', null, e, null, null, null);
	var choices = new Choices(null, null, '#');
	var recordUrl = "ftp://ftp.tropo.com/www/audio/signature_"+sessionId+".mp3";
	//function(attempts, bargein, beep, choices, format, maxSilence, maxTime, method, minConfidence, name, required, say, timeout, transcription, url, password, username)
    tropo.record(3, false, true, choices, null, null, 6, "POST", null, "recording", true, say, null, null, recordUrl, 'Auibui10', 'ehtest');
    tropo.on("continue", null, "/ivr-tropo/thank_you?sessionId="+sessionId, true);
    tropo.tropo[0].record.say = {
          "value": "Ok, after the tone please state your first and last name."
        };
	res.send(tropowebapi.TropoJSON(tropo));
});

app.post('/ivr-tropo/thank_you', function(req, res) {
	var sessionId = req.query.sessionId;
	
	var tropo = new tropowebapi.TropoWebAPI();
	tropo.say("Thanks. We’re done now. Goodbye!");
	res.send(tropowebapi.TropoJSON(tropo));
});