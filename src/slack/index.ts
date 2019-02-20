import { Strategy as SlackStrategy } from 'passport-slack';
import passport from 'passport';
import express from 'express';
import { dbMiddleware } from '../db';
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

export default function() {
    const app = express();
    app.use(passport.initialize());
    app.use(require('body-parser').urlencoded({ extended: true }));

    // path to start the OAuth flow
    app.get(
        '/slack/login',
        passport.authorize('slack', {
            successRedirect: callbackURL
        })
    );
    app.use(dbMiddleware);
    // OAuth callback url
    app.get(
        '/slack/callback',
        passport.authorize('slack', { failureRedirect: '/slack/login' }),
        (req, res) => {
            console.log('USER', req.user);
            res.redirect('https://manage.dingdong.buzz');
        }
    );
    return app;
}
