import express, { Request } from 'express';
import bodyParser from 'body-parser';
import { webhook } from 'twilio';
import { dbMiddleware, DB } from '../db';

export type StatusRequest = Request & {
	db: DB;
	body: {
		[k: string]: string;
	};
};

export default function() {
	const app = express();
	app.use(webhook(), dbMiddleware);
	app.post('/', async function(req: StatusRequest, res) {
		const { body } = req;
		console.log(JSON.stringify(body));
		res.end();
	});

	return app;
}
