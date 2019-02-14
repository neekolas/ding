import 'reflect-metadata';
import { createConnection, getConnectionOptions, getConnection, Connection, Repository, Not, In } from 'typeorm';
import { Person, Suite, Buzzer, Buzz, TwilioLine, PersonSuite, PersonSuiteRole } from './models';

export interface DB {
	connection: Connection;
	People: Repository<Person>;
	Suites: Repository<Suite>;
	Buzzers: Repository<Buzzer>;
	Buzzes: Repository<Buzz>;
	Lines: Repository<TwilioLine>;
	PersonSuites: Repository<PersonSuite>;
}

export async function initDB(overrides = {}): Promise<DB> {
	const connectionOptions = await getConnectionOptions();
	var conn = await createConnection(connectionOptions);

	return {
		connection: conn,
		People: conn.getRepository(Person),
		Suites: conn.getRepository(Suite),
		Buzzers: conn.getRepository(Buzzer),
		Buzzes: conn.getRepository(Buzz),
		Lines: conn.getRepository(TwilioLine),
		PersonSuites: conn.getRepository(PersonSuite)
	};
}

function withDB() {
	let db: DB;
	return async function(req, res, next) {
		if (!db) {
			try {
				db = await initDB();
			} catch (e) {
				console.error(`DB ERROR`, e);
				return res.sendStatus(500);
			}
		}
		req.db = db;
		next();
	};
}

export const dbMiddleware = withDB();

export async function lookupLine(db: DB, phoneNumber: string): Promise<TwilioLine> {
	const line = await db.Lines.findOne({ where: { phoneNumber } });
	if (!line) {
		return Promise.reject(new Error('No line found'));
	}
	return line;
}

export async function lookupBuzzer(db: DB, phoneNumber: string): Promise<Buzzer | null> {
	const buzzer = await db.Buzzers.findOne({ where: { phoneNumber } });
	if (!buzzer) {
		return null;
	}
	return buzzer;
}

export async function lookupPerson(db: DB, phoneNumber: string): Promise<Person | undefined> {
	return db.People.findOne({ where: { phoneNumber } });
}

export async function findAvailableLine(db: DB, buzzerId: number) {
	const suites = await db.Suites.find({ where: { buzzer: { id: buzzerId } }, relations: ['line'] });
	if (suites.length) {
		const lineIDs = suites.map(suite => suite.line.id);
		return db.Lines.findOne({ id: Not(In(lineIDs)) });
	} else {
		return db.Lines.findOneOrFail();
	}
}

export async function upsertPerson(db: DB, phoneNumber: string): Promise<Person> {
	let person: Person | undefined;
	await db.connection.transaction(async entityManager => {
		person = await entityManager.findOne(Person, { where: { phoneNumber } });
		if (!person) {
			person = entityManager.create(Person, { phoneNumber });
			person = await entityManager.save(Person, person);
		}
	});
	if (!person) {
		throw new Error('Create failed');
	}
	return person;
}

export async function findBuzzOwners(db: DB, buzz: Buzz): Promise<Person[]> {
	const ps = await db.PersonSuites.find({
		where: { suite: buzz.suite, role: PersonSuiteRole.OWNER },
		relations: ['person']
	});
	return ps.map(p => p.person);
}

export function createBuzz(db: DB, nodeID: string, suite: Suite): Promise<Buzz> {
	return db.Buzzes.save({ suite, callStart: new Date(), nodeID });
}

export function findSuiteByLineAndBuzzer(db: DB, lineID: number, buzzerID: number): Promise<Suite | undefined> {
	return db.Suites.findOne({ where: { line: { id: lineID }, buzzer: { id: buzzerID } } });
}
