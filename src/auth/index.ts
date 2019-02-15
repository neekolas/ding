import * as admin from 'firebase-admin';
import { Request } from 'express';
import { DB, upsertPerson } from '../db';
import { Person } from '../models';

admin.initializeApp({
	databaseURL: 'https://dingdong-dev.firebaseio.com'
});

export type RequestWithUser = Request & {
	db: DB;
	user?: Person;
};

export async function userMiddleware(req: RequestWithUser, res, next) {
	const { headers, db, method } = req;

	if (method === 'OPTIONS') {
		return next();
	}
	if (headers.authorization !== undefined) {
		try {
			const token = headers['authorization'].replace('Bearer ', '');
			const decoded = await admin.auth().verifyIdToken(token);
			const user = await upsertPerson(db, decoded.phone_number);
			req.user = user;
			return next();
		} catch (e) {
			console.log(e);
		}
	}
	return res.sendStatus(401);
}
