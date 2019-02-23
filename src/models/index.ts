import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    ManyToOne,
    Generated,
    PrimaryColumn,
    Index
} from 'typeorm';

export enum PersonSuiteRole {
    OWNER = 'owner',
    RESIDENT = 'resident',
    VISITOR = 'visitor'
}

export enum MatchType {
    CODE = 'code',
    SPEECH = 'speech',
    FALLBACK = 'fallback'
}

@Entity()
export class Person {
    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column({ type: 'uuid' })
    @Generated('uuid')
    nodeID: string;

    @Column({ nullable: true })
    firstName?: string;

    @Column({ nullable: true })
    lastName?: string;

    @Column({ nullable: true })
    nickname?: string;

    @Column({ nullable: true })
    @Index({})
    phoneNumber?: string;

    @OneToMany(type => PersonSuite, ps => ps.person)
    suites: PersonSuite[];
}

@Entity()
export class Buzzer {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    placeID: string;

    @Index({ unique: true })
    @Column({ nullable: true })
    phoneNumber?: string;

    @Column()
    address: string;

    @Column()
    country: string;

    @OneToMany(type => Suite, suite => suite.buzzer)
    suites: Suite[];
}

@Entity()
export class TwilioLine {
    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column()
    phoneNumber: string;

    @Column()
    country: string;

    @OneToMany(type => Suite, suite => suite.line)
    suites: Suite[];
}

@Entity()
export class Suite {
    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column()
    @Generated('uuid')
    nodeID: string;

    @Column({ nullable: true })
    buzzerCode?: string;

    @Column()
    unit: string;

    @Column({ nullable: true })
    activationCode?: string;

    @Column({ nullable: true })
    slackApiKey?: string;

    @Column({ nullable: true })
    slackTeamId?: string;

    @Column({ nullable: true })
    slackTeamName?: string;

    @Column({ default: false })
    isActivated: boolean;

    @OneToMany(type => PersonSuite, rel => rel.suite)
    people: PersonSuite[];

    @OneToMany(type => SlackPerson, rel => rel.suite)
    slackPeople: SlackPerson[];

    @ManyToOne(type => Buzzer, buzzer => buzzer.suites)
    buzzer: Buzzer;

    @ManyToOne(type => TwilioLine, line => line.suites)
    line: TwilioLine;

    @OneToMany(type => Buzz, buzz => buzz.suite)
    buzzes: Buzz[];
}

@Entity()
export class SlackPerson {
    @PrimaryColumn()
    suiteId: number;

    @ManyToOne(type => Suite, suite => suite.slackPeople)
    suite: Suite;

    @PrimaryColumn()
    slackUserId: string;

    @Column()
    firstName?: string;

    @Column()
    lastName?: string;

    @Column({ default: false })
    isActive: boolean;
}

@Entity()
@Index(['personId', 'suiteId'], { unique: true })
export class PersonSuite {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'enum',
        enum: PersonSuiteRole,
        default: PersonSuiteRole.OWNER
    })
    role: PersonSuiteRole;

    @ManyToOne(type => Suite, suite => suite.people, { onDelete: 'CASCADE' })
    suite: Suite;

    @Column()
    suiteId?: number;

    @Column()
    personId?: number;

    @Column({ nullable: true })
    hashedUnlockCode?: string;

    @ManyToOne(type => Person, person => person.suites, { onDelete: 'CASCADE' })
    person: Person;

    @OneToMany(type => Buzz, buzz => buzz.match)
    buzzes: Buzz[];
}

@Entity()
export class Buzz {
    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column()
    nodeID: string;

    @ManyToOne(type => Suite, suite => suite.buzzes)
    suite: Suite;

    @Column('timestamp')
    callStart: Date;

    @Column('timestamp', { nullable: true })
    callEnd: Date;

    @ManyToOne(type => PersonSuite, ps => ps.buzzes, { nullable: true })
    match: PersonSuite;

    @Column({
        type: 'enum',
        enum: MatchType,
        nullable: true
    })
    matchType: MatchType;
}
