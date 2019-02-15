import { DB, findAvailableLine, upsertPerson } from '../../db';
import { lookupAddress, findCountry, lookupPlace } from '../../maps';
import { Person, PersonSuiteRole, Suite, Buzzer } from '../../models';
import Mutation from './mutations';
import { ResolverContext } from './ctx';
import { formatPerson, mergeSuiteAndBuzzer } from './helpers';

export default {
	Suite: {
		async owners({ _id: id }, args, { db }: ResolverContext) {
			const personSuites = await db.PersonSuites.find({
				where: { suite: { id }, role: PersonSuiteRole.OWNER },
				relations: ['person']
			});
			return personSuites.map(ps => {
				return {
					person: formatPerson(ps.person),
					role: ps.role
				};
			});
		}
	},
	Query: {
		me(parent, args, context: ResolverContext) {
			const { user } = context;
			if (!user) {
				return null;
			}
			return formatPerson(user);
		},
		async suites(parent, args, context: ResolverContext, info) {
			const results = await context.db.Suites.find({
				relations: ['buzzer', 'line']
			});
			console.log(`Got ${results.length} results`, results);
			return results.map(result => mergeSuiteAndBuzzer(result, result.buzzer));
		},
		async suite(parent, { id }, { db, user }: ResolverContext) {
			const suite = await db.Suites.findOneOrFail({ where: { nodeID: id }, relations: ['buzzer', 'line'] });
			return mergeSuiteAndBuzzer(suite, suite.buzzer);
		},
		async addressSearch(parent, args: { query: string }, context: ResolverContext, info) {
			const results = await lookupAddress(args.query);

			return results.map(result => {
				return {
					id: result.place_id,
					name: result.name,
					address: result.formatted_address
				};
			});
		}
	},
	Mutation
};
