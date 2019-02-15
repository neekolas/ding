import express, { Request } from 'express';
import bodyParser from 'body-parser';
import VoiceResponse = require('twilio/lib/twiml/VoiceResponse');
import {
	DB,
	dbMiddleware,
	lookupLine,
	lookupBuzzer,
	findSuiteByLineAndBuzzer,
	createBuzz,
	findBuzzOwners
} from '../db';
import { ACTIVATE_SUITE, ACTIVATE_SUITE_CALLBACK } from './routes';
import { PersonSuiteRole, PersonSuite, Buzz, Person, MatchType } from '../models';
import { escapeRegExp } from 'lodash';
import twilioClient from '../twilio';
import { buzzLogger, BuzzLogger } from './logger';
import { INTRO_MP3, HOLD_MUSIC } from './sounds';
import twilio = require('twilio');

export type VoiceRequest = Request & {
	twiml: VoiceResponse;
	body: any;
	db: DB;
};

export type BuzzRequest = VoiceRequest & {
	buzz: Buzz;
	logger: BuzzLogger;
};

function twimlMiddleware(req: VoiceRequest, res, next) {
	req.twiml = new VoiceResponse();
	res.setHeader('Content-Type', 'text/xml');
	console.log(req.url, '\n', JSON.stringify(req.body));
	next();
}

function buildHints(owners: PersonSuite[]): string {
	return owners
		.map(owner => {
			return [owner.person.firstName, owner.person.lastName].filter(p => p).join(' ');
		})
		.join(' ');
}

async function buzzMiddleware(req: BuzzRequest, res, next) {
	const { params, db } = req;
	const { buzzId } = params;
	try {
		req.buzz = await db.Buzzes.findOneOrFail(buzzId, { relations: ['suite', 'match', 'match.person'] });
		req.logger = buzzLogger(req.buzz);
		next();
	} catch (e) {
		console.error(e);
		return res.sendStatus(401);
	}
}

function joinFirstAndLastName(person: Person) {
	return [person.firstName, person.lastName, person.nickname].filter(p => p).join(' ');
}

function testRegex(text: string | undefined, cmp: string): boolean {
	if (!text) {
		return false;
	}
	return RegExp(escapeRegExp(text), 'ig').test(cmp);
}

async function addMatch(db: DB, buzz: Buzz, ps: PersonSuite, matchType = MatchType.SPEECH): Promise<Buzz> {
	buzz.match = ps;
	buzz.matchType = matchType;
	await db.Buzzes.save(buzz);
	return buzz;
}

function findOwnerByName(text: string, owners: Person[]): Person | null {
	owners = owners.filter(owner => owner.firstName || owner.lastName || owner.nickname);
	const fullHit = owners.find(p => testRegex(joinFirstAndLastName(p), text));
	if (fullHit) {
		return fullHit;
	}
	const firstNameHit = owners.filter(p => testRegex(p.firstName, text));
	if (firstNameHit.length === 1) {
		return firstNameHit[0];
	}
	const lastNameHit = owners.filter(p => testRegex(p.lastName, text));
	if (lastNameHit.length === 1) {
		return lastNameHit[0];
	}
	const nicknameHit = owners.filter(p => testRegex(p.nickname, text));
	if (nicknameHit.length === 1) {
		return nicknameHit[0];
	}
	return null;
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
			const suite = await findSuiteByLineAndBuzzer(db, line.id, buzzer.id);
			if (!suite) {
				return res.redirect(ACTIVATE_SUITE);
			}

			const [owners, buzz] = await Promise.all([
				db.PersonSuites.find({
					where: { suite, role: PersonSuiteRole.OWNER },
					relations: ['person']
				}),
				createBuzz(db, body.CallSid, suite)
			]);
			const logger = buzzLogger(buzz);
			logger.log('Created buzz', buzz);
			const gather = twiml.gather({
				numDigits: 4,
				action: `/voice/buzz/${buzz.id}/unlock`,
				hints: buildHints(owners),
				input: 'dtmf speech',
				speechTimeout: 'auto',
				timeout: 10,
				partialResultCallback: `/voice/buzz/${buzz.id}/speach`
			});

			gather.play({}, INTRO_MP3);
			res.end(twiml.toString());
		} catch (e) {
			console.error(e);
			res.status(500);
			return res.end(`Error: ${e}`);
		}
	});

	// Unlock Route
	app.post('/buzz/:buzzId/unlock', buzzMiddleware, async function(req: BuzzRequest, res) {
		const { twiml, body, buzz, db, logger } = req;

		const { Digits, SpeechResult } = body;

		if (Digits) {
			twiml.say(`You entered code ${Digits.split().join(' ')}`);
		} else if (SpeechResult) {
			logger.log('Speech Result', SpeechResult);
			try {
				const personSuites = await findBuzzOwners(db, buzz);
				const owners = personSuites.map(ps => ps.person);
				const match = findOwnerByName(SpeechResult, owners);
				if (match) {
					const ps = personSuites.find(ps => ps.personId === match.id);
					if (ps) {
						await addMatch(db, buzz, ps);
						twiml.redirect(`/voice/buzz/${buzz.id}/dial`);
					}
				}
			} catch (e) {
				logger.error(e);
			}
		}
		res.end(twiml.toString());
	});

	app.post('/buzz/:buzzId/speach', buzzMiddleware, async function(req: BuzzRequest, res) {
		const { buzz, db, body, hostname, logger } = req;
		const { UnstableSpeechResult } = body;
		logger.log('Unstable speech result', UnstableSpeechResult);
		if (buzz.match) {
			logger.log('Already has a match');
			return res.end();
		}
		try {
			const personSuites = await findBuzzOwners(db, buzz);
			const owners = personSuites.map(ps => ps.person);
			const match = findOwnerByName(UnstableSpeechResult, owners);
			if (match) {
				const ps = personSuites.find(ps => ps.personId === match.id);
				if (ps) {
					await addMatch(db, buzz, ps);
				} else {
					logger.error('Could not find ps');
				}
				logger.log(`Match for ${UnstableSpeechResult}: ${match}`);
				await twilioClient.redirectCall(buzz.nodeID, `https://${hostname}/voice/buzz/${buzz.id}/dial`);
			}
		} catch (e) {
			logger.error(e);
		}
		res.end();
	});

	app.post('/buzz/:buzzId/dial', buzzMiddleware, async function(req: BuzzRequest, res) {
		const { twiml, logger, buzz, hostname, body } = req;
		const { From } = body;
		const { phoneNumber } = buzz.match.person;
		try {
			if (!phoneNumber) {
				throw new Error('No phone number on person');
			}
			logger.log('Connecting to ', buzz.match.person.phoneNumber);
			twiml.say('Connecting');
			twiml.enqueue({ waitUrl: HOLD_MUSIC }, buzz.id.toString());
			await twilioClient.dial(`https://${hostname}/voice/buzz/${buzz.id}/join`, From, phoneNumber);
			res.end(twiml.toString());
		} catch (e) {
			logger.error(e);
			res.sendStatus(500);
		}
	});

	app.post('/buzz/:buzzId/join', buzzMiddleware, async function(req: BuzzRequest, res) {
		const { twiml, logger, buzz, hostname, body } = req;
		twiml.say('Connecting');
		logger.log('Connecting', buzz.id);
		twiml.queue(buzz.id.toString());
		res.end(twiml.toString());
	});

	// Activate Route
	app.get('/activate-suite', async function(req: VoiceRequest, res) {
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
		try {
			const suite = await db.Suites.findOne({ where: { activationCode }, relations: ['buzzer'] });
			if (!suite) {
				twiml.say('Could not find match');
				twiml.redirect(ACTIVATE_SUITE);
			} else {
				suite.activationCode = undefined;
				suite.buzzer.phoneNumber = From;
				await Promise.all([
					db.Buzzers.save(suite.buzzer),
					db.Suites.update(suite.id, { activationCode: undefined })
				]);
				twiml.say(`Activated suite`);
			}
			res.end(twiml.toString());
		} catch (e) {
			console.error(e);
			res.sendStatus(500);
		}
	});

	return app;
}
