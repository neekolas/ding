import { Strategy as SlackStrategy } from 'passport-slack';
import passport from 'passport';
import express, { Request } from 'express';
import { dbMiddleware, DB } from '../db';
import session from 'cookie-session';

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
            console.log(accessToken);
            console.log(params.bot);
            done(null, { accessToken, bot: params.bot });
        }
    )
);

export type SlackRequest = Request & {
    db: DB;
    session: any;
};

export default function() {
    const app = express();
    app.use(passport.initialize());
    app.use(require('body-parser').urlencoded({ extended: true }));
    app.set('trust proxy', 1);
    app.use(
        session({
            name: 'dd-session',
            keys: ['dingdong is the best'],
            maxAge: 24 * 60 * 60 * 1000
        })
    );
    // path to start the OAuth flow
    app.get(
        '/slack/login',
        function(req: SlackRequest, res, next) {
            const { query } = req;
            req.session = query;
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
            console.log(req.cookies);
            console.log(Object.keys(req));
            console.log('USER', req.user);
            res.redirect('https://manage.dingdong.buzz');
        }
    );
    return app;
}
