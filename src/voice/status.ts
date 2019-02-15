import express, { Request } from 'express';
import bodyParser from 'body-parser';
import { dbMiddleware, DB } from '../db';
import { twimlMiddlewareFactory } from './middleware';
export type StatusRequest = Request & {
	db: DB;
	body: {
		[k: string]: string;
	};
};

export default function() {
	const app = express();
	app.use(twimlMiddlewareFactory('/status/'), dbMiddleware);
	app.post('/', async function(req: StatusRequest, res) {
		const { body } = req;
		console.log(JSON.stringify(body));
		res.end();
	});

	return app;
}
