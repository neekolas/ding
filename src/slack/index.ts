import { Strategy as SlackStrategy } from 'passport-slack';
import passport from 'passport';
import express, { Request } from 'express';
import { dbMiddleware, DB } from '../db';
import session from 'firebase-cookie-session';
import { userFromToken } from '../auth';

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
            done(null, params);
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
        '/slack/link',
        function(req: SlackRequest, res, next) {
            const { query } = req;
            const { token, suite_id } = query;
            req.session = { token, suite_id };
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
        passport.authorize('slack', { failureRedirect: '/slack/link' }),
        async (req: SlackRequest, res) => {
            const { db } = req;
            const { suite_id, token } = req.session;
            if (!token) {
                return res.sendStatus(401);
            }
            try {
                const user = await userFromToken(db, token);
                const { bot, team_id, team_name } = req.account;
                if (bot) {
                    console.log(req.account);
                    const { bot_access_token, bot_user_id } = bot;
                    const suite = await db.Suites.findOneOrFail({
                        nodeID: suite_id
                    });
                    suite.slackApiKey = bot_access_token;
                    suite.slackTeamId = team_id;
                    suite.slackTeamName = team_name;
                    await db.Suites.save(suite);
                }

                console.log('USER', req.account);
                res.redirect(`https://manage.dingdong.buzz/suites/${suite_id}`);
            } catch (e) {
                console.error(e);
                res.sendStatus(500);
            }
        }
    );
    return app;
}
