import 'reflect-metadata';
import {
    createConnection,
    getConnectionOptions,
    getConnection,
    Connection,
    Repository,
    Not,
    In
} from 'typeorm';
import {
    Person,
    Suite,
    Buzzer,
    Buzz,
    TwilioLine,
    PersonSuite,
    PersonSuiteRole
} from './models';
import twilioClient from './twilio';
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
    const dbStartTime = +new Date();
    var conn = await createConnection(connectionOptions);
    console.log(`Database initialized in ${+new Date() - dbStartTime}ms`);
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

// Looks up TwilioLine by phone number. Throws error on no result
export async function lookupLine(
    db: DB,
    phoneNumber: string
): Promise<TwilioLine> {
    const line = await db.Lines.findOne({ where: { phoneNumber } });
    if (!line) {
        return Promise.reject(new Error('No line found'));
    }
    return line;
}

// Looks up buzzer by phone number. Returns null on no result
export async function lookupBuzzer(
    db: DB,
    phoneNumber: string
): Promise<Buzzer | null> {
    const buzzer = await db.Buzzers.findOne({ where: { phoneNumber } });
    if (!buzzer) {
        return null;
    }
    return buzzer;
}

// Looks up person by phone number
export async function lookupPerson(
    db: DB,
    phoneNumber: string
): Promise<Person | undefined> {
    return db.People.findOne({ where: { phoneNumber } });
}

// Finds a TwilioLine that is not already linked with a given BuzzerID (to ensure unique From/To combination on inbound calls from buzzer)
export async function findAvailableLine(db: DB, buzzerId: number) {
    const suites = await db.Suites.find({
        where: { buzzer: { id: buzzerId } },
        relations: ['line']
    });
    if (suites.length) {
        const lineIDs = suites.map(suite => suite.line.id);
        return db.Lines.findOne({ id: Not(In(lineIDs)) });
    } else {
        return db.Lines.findOneOrFail();
    }
}

// Finds a Person by phone number, inserting a new Person if no result. Also looks up caller-id data for new Person to pre-fill first/last name
export async function upsertPerson(
    db: DB,
    phoneNumber: string
): Promise<Person> {
    let person: Person | undefined;
    await db.connection.transaction(async entityManager => {
        person = await entityManager.findOne(Person, {
            where: { phoneNumber }
        });
        if (!person) {
            const { firstName, lastName } = await twilioClient.lookupNumber(
                phoneNumber
            );
            person = entityManager.create(Person, {
                phoneNumber,
                firstName,
                lastName
            });
            person = await entityManager.save(Person, person);
        }
    });
    if (!person) {
        throw new Error('Create failed');
    }
    return person;
}

// Finds all PersonSuites for a Buzz entity with the role OWNER
export async function findBuzzOwners(
    db: DB,
    buzz: Buzz
): Promise<PersonSuite[]> {
    const ps = await db.PersonSuites.find({
        where: { suite: buzz.suite, role: PersonSuiteRole.OWNER },
        relations: ['person']
    });
    return ps;
}

// Creates a new Buzz with a given NodeID and Suite
export function createBuzz(
    db: DB,
    nodeID: string,
    suite: Suite
): Promise<Buzz> {
    return db.Buzzes.save({ suite, callStart: new Date(), nodeID });
}

// Finds the suite connected to a given lineID and buzzerId
export function findSuiteByLineAndBuzzer(
    db: DB,
    lineID: number,
    buzzerID: number
): Promise<Suite | undefined> {
    return db.Suites.findOne({
        where: { line: { id: lineID }, buzzer: { id: buzzerID } }
    });
}
