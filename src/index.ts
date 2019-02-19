import express, { Request } from 'express';
import * as functions from 'firebase-functions';
setupEnv();
import createVoiceApp from './voice';
import createGraphQlApp from './graphql';
import createStatusApp from './voice/status';

// Voice Express App
exports.voice = functions
    .runWith({ memory: '1GB' })
    .https.onRequest(createVoiceApp());

// GraphQL Express App
exports.graphql = functions
    .runWith({ memory: '1GB' })
    .https.onRequest(createGraphQlApp());

exports.status = functions.https.onRequest(createStatusApp());

// Sets some environment variables based on Twilio function runtime config.
function setupEnv() {
    let cfg: { [k: string]: any } = functions.config();
    var { maps, db, twilio } = cfg;
    if (maps) {
        process.env.MAPS_API_KEY = maps.api_key;
    }
    if (db) {
        Object.keys(db).forEach(k => {
            process.env[`TYPEORM_${k.toUpperCase()}`] = db[k];
        });
    }
    if (twilio) {
        Object.keys(twilio).forEach(k => {
            process.env[`TWILIO_${k.toUpperCase()}`] = twilio[k];
        });
    }
}
