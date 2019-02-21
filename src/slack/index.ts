import { Strategy as SlackStrategy } from 'passport-slack';
import passport from 'passport';
import express, { Request } from 'express';
import { dbMiddleware, DB } from '../db';
import session from 'firebase-cookie-session';

const { SLACK_CLIENT_ID, SLACK_CLIENT_SECRET } = process.env;
const callbackURL = `https://manage.dingdong.buzz/slack/callback`;
passport.use(
    new SlackStrategy(
        {
            clientID: SLACK_CLIENT_ID,
            clientSecret: SLACK_CLIENT_SECRET,
            scope: 'bot users:read',
            skipUserProfile: true,
            callbackURL
        },
        (accessToken, refreshToken, params, profile, done) => {
            done(null, { accessToken, bot: params.bot });
        }
    )
);

export type SlackRequest = Request & {
    db: DB;
    session: any;
    account: any;
};

export default function() {
    const app = express();
    app.use(require('body-parser').urlencoded({ extended: true }));
    app.set('trust proxy', 1);
    app.use(
        session({
            keys: ['dingdong is the best'],
            maxAge: 24 * 60 * 60 * 1000
        })
    );
    app.use(passport.initialize());

    // path to start the OAuth flow
    app.get(
        '/slack/login',
        function(req: SlackRequest, res, next) {
            const { query } = req;
            req.session.token = query.token;
            req.session.suite_id = query.suite_id;
            console.log('Session is', req.session);
            next();
        },
        passport.authorize('slack', {
            successRedirect: callbackURL
        })
    );
    app.use(dbMiddleware);
    // OAuth callback url
    app.get(
        '/slack/callback',
        passport.authorize('slack', { failureRedirect: '/slack/login' }),
        (req: SlackRequest, res) => {
            console.log(req.headers);
            console.log(req.cookies);
            console.log('USER', req.account);
            res.redirect('https://manage.dingdong.buzz');
        }
    );
    return app;
}
