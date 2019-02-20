import express from 'express';
import { ApolloServer } from 'apollo-server-express';

import typeDefs from './schema';
import resolvers from './resolvers';
import { dbMiddleware } from '../db';
import { userMiddleware } from '../auth';

export default function(path = '/') {
    const app = express();
    app.use(dbMiddleware);
    app.use(userMiddleware);

    const server = new ApolloServer({
        // These will be defined for both new or existing servers
        typeDefs,
        resolvers,
        introspection: true,
        playground: true,
        debug: true,
        context: ({ req }) => ({
            db: req.db,
            user: req.user,
            headers: req.headers
        })
    });

    server.applyMiddleware({ app, path });
    return app;
}
