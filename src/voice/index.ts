import express, { Request } from 'express';
import bodyParser from 'body-parser';
import VoiceResponse = require('twilio/lib/twiml/VoiceResponse');
import * as qs from 'querystring';

import { DB, dbMiddleware, lookupLine, lookupBuzzer, findSuiteByLineAndBuzzer } from '../db';
import { ACTIVATE_SUITE, ACTIVATE_SUITE_CALLBACK, LANDING } from './routes';

export type VoiceRequest = Request & {
	twiml: VoiceResponse;
	body: any;
	db: DB;
};

function twimlMiddleware(req: VoiceRequest, res, next) {
	req.twiml = new VoiceResponse();
	res.setHeader('Content-Type', 'text/xml');
	console.log(JSON.stringify(req.body));
	next();
}

export default function() {
	const app = express();
	app.use(dbMiddleware);
	// TWIML middleware
	app.use(bodyParser.urlencoded({ extended: true }), twimlMiddleware);

	// Root Handler
	app.post('/', async function(req: VoiceRequest, res) {
		const { db, twiml, body } = req;
		try {
			const buzzer = await lookupBuzzer(db, body.From);
			if (!buzzer) {
				return res.redirect(ACTIVATE_SUITE);
			}
			const line = await lookupLine(db, body.To);

			console.log(`LINE: ${line}\nBUZZER: ${buzzer}`);
			const suite = findSuiteByLineAndBuzzer(db, line.id, buzzer.id);
			if (!suite) {
				return res.redirect(ACTIVATE_SUITE);
			}

			const gather = twiml.gather({
				numDigits: 4,
				action: './unlock',
				input: 'dtmf speech',
				speechTimeout: 'auto',
				timeout: 10,
				partialResultCallback: '/voice/speach'
			});

			gather.say('Say the name of the person you are trying to see or enter an unlock code');

			res.end(twiml.toString());
		} catch (e) {
			res.status(500);
			return res.end(`Error: ${e}`);
		}
	});

	// Unlock Route
	app.post('/unlock', function(req: VoiceRequest, res) {
		const { twiml, body } = req;
		const { Digits } = body;
		twiml.say(`You entered code ${Digits.split().join(' ')}`);
		res.end(twiml.toString());
	});

	// Activate Route
	app.post('/activate-suite', async function(req: VoiceRequest, res) {
		const { twiml } = req;
		try {
			const gather = twiml.gather({
				numDigits: 5,
				action: ACTIVATE_SUITE_CALLBACK,
				input: 'dtmf',
				timeout: 10
			});
			gather.say('This number is not yet activated. Enter your activation code to complete setup.');
		} catch (e) {
			console.error(e);
			return res.sendStatus(500);
		}

		// twiml.hangup();
		res.end(twiml.toString());
	});

	// Collect activation code
	app.post('/activate-suite/callback', async function(req: VoiceRequest, res) {
		const { twiml, body, db } = req;
		const { Digits: activationCode, From } = body;
		twiml.say(`You entered ${activationCode}`);
		const suite = await db.Suites.findOne({ where: { activationCode }, relations: ['buzzer'] });
		if (!suite) {
			twiml.say('Could not find match');
			twiml.redirect(ACTIVATE_SUITE);
		} else {
			suite.buzzer.phoneNumber = From;
			db.Buzzers.save(suite.buzzer);
			twiml.say(`Activated suite`);
		}
		res.end(twiml.toString());
	});

	return app;
}
