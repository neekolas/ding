import express, { Request } from 'express';
import * as functions from 'firebase-functions';
setupEnv();
import createVoiceApp from './voice';
import createGraphQlApp from './graphql';

exports.voice = functions.https.onRequest(createVoiceApp());
exports.graphql = functions.https.onRequest(createGraphQlApp());

function setupEnv() {
	let cfg: { [k: string]: any } = functions.config();
	var { maps, db } = cfg;
	if (maps) {
		process.env.MAPS_API_KEY = maps.api_key;
	}
	if (db) {
		Object.keys(db).forEach(k => {
			process.env[`TYPEORM_${k.toUpperCase()}`] = db[k];
		});
		console.log('Initialized env');
	}
}
