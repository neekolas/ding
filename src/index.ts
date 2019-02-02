import express, { Request } from 'express';
import bodyParser from 'body-parser';
import VoiceResponse = require('twilio/lib/twiml/VoiceResponse');
import { initDB, DB, lookupLine, lookupBuzzer } from './db';
import typeDefs from './schema';
import resolvers from './resolvers';
import { ApolloServer } from 'apollo-server-express';

const app = express();
const PORT = 3000;

export type VoiceRequest = Request & {
	twiml: VoiceResponse;
	body: any;
	db: DB;
};

initDB().then(db => {
	// Add DB
	app.use(function(req: VoiceRequest, res, next) {
		req.db = db;
		next();
	});

	// TWIML middleware
	app.use('/voice', bodyParser.urlencoded({ extended: true }), function(req: VoiceRequest, res, next) {
		req.twiml = new VoiceResponse();
		res.setHeader('Content-Type', 'text/xml');
		console.log(req.body);
		next();
	});

	// Root Handler
	app.post('/voice', async function(req: VoiceRequest, res) {
		try {
			const buzzer = await lookupBuzzer(req.db, req.body.From);
			if (!buzzer) {
				return res.redirect('/voice/activate-suite');
			}
			const line = await lookupLine(req.db, req.body.To);

			console.log(`LINE: ${line}\nBUZZER: ${buzzer}`);
		} catch (e) {
			res.status(500);
			return res.end(`Error: ${e}`);
		}
		const { twiml } = req;
		const gather = twiml.gather({
			numDigits: 4,
			action: '/voice/unlock',
			input: 'dtmf speech',
			speechTimeout: 'auto',
			timeout: 10,
			partialResultCallback: '/voice/speach'
		});

		gather.say('Say the name of the person you are trying to see or enter an unlock code');

		res.end(twiml.toString());
	});

	// Unlock Route
	app.post('/voice/unlock', function(req: VoiceRequest, res) {
		const { twiml, body } = req;
		const { Digits } = body;
		twiml.say(`You entered code ${Digits.split().join(' ')}`);
		res.end(twiml.toString());
	});

	// Activate Route
	app.post('/voice/activate-suite', async function(req: VoiceRequest, res) {
		const { twiml } = req;
		try {
			const line = await lookupLine(req.db, req.body.To);
			const gather = twiml.gather({
				numDigits: 4,
				action: `/voice/activate-suite/collect/${line.id}`,
				input: 'dtmf',
				timeout: 10
			});
			gather.say('Enter your activation code');
		} catch (e) {
			console.error(e);
			return res.sendStatus(500);
		}

		// twiml.hangup();
		res.end(twiml.toString());
	});

	// Collect activation code
	app.post('/voice/activate-suite/collect/:lineId', async function(req: VoiceRequest, res) {
		const { twiml, body, params } = req;
		const { lineId } = params;
		const { Digits } = body;
		twiml.say(`Collected ${Digits} from line ID ${lineId}`);
		res.end(twiml.toString());
	});

	const server = new ApolloServer({
		// These will be defined for both new or existing servers
		typeDefs,
		resolvers,
		playground: true,
		context: ({ req }) => ({
			db: req.db,
			headers: req.headers
		})
	});

	server.applyMiddleware({ app });

	app.listen(PORT, function() {
		console.log('DingDong is listening on port ' + PORT);
	});
});
