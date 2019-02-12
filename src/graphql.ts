import express, { Request } from 'express';
import { ApolloServer } from 'apollo-server-express';

import typeDefs from './schema';
import resolvers from './resolvers';
import { dbMiddleware } from './db';

export default function(path = '/') {
	const app = express();
	app.use(dbMiddleware);

	const server = new ApolloServer({
		// These will be defined for both new or existing servers
		typeDefs,
		resolvers,
		introspection: true,
		playground: true,
		debug: true,
		context: ({ req }) => ({
			db: req.db,
			headers: req.headers
		})
	});

	server.applyMiddleware({ app, path });
	return app;
}
