import * as functions from 'firebase-functions';
import { setupEnv } from './utils';
setupEnv();
import createVoiceApp from './voice';
import createGraphQlApp from './graphql';
import createStatusApp from './voice/status';
import createSlackApp from './slack';

// Voice Express App
exports.voice = functions
    .runWith({ memory: '1GB' })
    .https.onRequest(createVoiceApp());

// GraphQL Express App
exports.graphql = functions
    .runWith({ memory: '1GB' })
    .https.onRequest(createGraphQlApp());

// Twilio status handler
exports.status = functions.https.onRequest(createStatusApp());

// Slack Passport Handler
exports.slack = functions.https.onRequest(createSlackApp());
