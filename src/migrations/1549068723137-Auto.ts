import {MigrationInterface, QueryRunner} from "typeorm";

export class Auto1549068723137 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "person" ("id" SERIAL NOT NULL, "nodeID" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "auth0ID" character varying, "phoneNumber" character varying, "slackUser" character varying, CONSTRAINT "PK_5fdaf670315c4b7e70cce85daa3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5df72a74c70b3b538495bbc495" ON "person" ("nodeID") `);
        await queryRunner.query(`CREATE TABLE "buzzer" ("id" SERIAL NOT NULL, "placeID" character varying NOT NULL, "phoneNumber" character varying, "address" character varying NOT NULL, "country" character varying NOT NULL, CONSTRAINT "PK_c1657b513a22d0e477f8a08c69e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f89252f124736e498cedd04d2b" ON "buzzer" ("phoneNumber") `);
        await queryRunner.query(`CREATE TABLE "twilio_line" ("id" SERIAL NOT NULL, "phoneNumber" character varying NOT NULL, "country" character varying NOT NULL, CONSTRAINT "PK_0c13399a0fdabbc6dc99e4ce871" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e8fb63ed864ffed9a10f47f5d1" ON "twilio_line" ("phoneNumber") `);
        await queryRunner.query(`CREATE TABLE "suite" ("id" SERIAL NOT NULL, "nodeID" uuid NOT NULL DEFAULT uuid_generate_v4(), "buzzerCode" character varying, "unit" character varying NOT NULL, "activationCode" character varying, "isActivated" boolean NOT NULL DEFAULT false, "buzzerId" integer, "lineId" integer, CONSTRAINT "PK_30dc0252fd337d970ccf23129b2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a73a65e6be1e07db602e70b55f" ON "suite" ("nodeID") `);
        await queryRunner.query(`CREATE TABLE "buzz" ("id" SERIAL NOT NULL, "nodeID" character varying NOT NULL, "callStart" TIMESTAMP NOT NULL, "callEnd" TIMESTAMP NOT NULL, "suiteId" integer, CONSTRAINT "PK_784633eb89a9e6bced172212707" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5bf736cc20ccf3d75ff1c7dbaf" ON "buzz" ("nodeID") `);
        await queryRunner.query(`CREATE TABLE "buzz_event" ("nodeID" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventTime" TIMESTAMP NOT NULL, "kind" character varying NOT NULL, "payload" json NOT NULL, "buzzId" integer, CONSTRAINT "PK_430d431aea542ae9984b6748ae1" PRIMARY KEY ("nodeID"))`);
        await queryRunner.query(`CREATE TABLE "person_suite" ("id" SERIAL NOT NULL, "role" character varying NOT NULL, "suiteId" integer, "personId" integer, CONSTRAINT "PK_acdb4e49480215b980b1aa46198" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "suite" ADD CONSTRAINT "FK_78653d2be5400af72dc6fd23e0a" FOREIGN KEY ("buzzerId") REFERENCES "buzzer"("id")`);
        await queryRunner.query(`ALTER TABLE "suite" ADD CONSTRAINT "FK_2253b3960fbac2ae959e2e890cd" FOREIGN KEY ("lineId") REFERENCES "twilio_line"("id")`);
        await queryRunner.query(`ALTER TABLE "buzz" ADD CONSTRAINT "FK_6388962b23f3826ff96113a6637" FOREIGN KEY ("suiteId") REFERENCES "suite"("id")`);
        await queryRunner.query(`ALTER TABLE "buzz_event" ADD CONSTRAINT "FK_99d58cc5c97f30557d4ce68e6c2" FOREIGN KEY ("buzzId") REFERENCES "buzz"("id")`);
        await queryRunner.query(`ALTER TABLE "person_suite" ADD CONSTRAINT "FK_5d23f081e711da36357cceb2404" FOREIGN KEY ("suiteId") REFERENCES "suite"("id")`);
        await queryRunner.query(`ALTER TABLE "person_suite" ADD CONSTRAINT "FK_696a576961d3098dba67a48bb72" FOREIGN KEY ("personId") REFERENCES "person"("id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "person_suite" DROP CONSTRAINT "FK_696a576961d3098dba67a48bb72"`);
        await queryRunner.query(`ALTER TABLE "person_suite" DROP CONSTRAINT "FK_5d23f081e711da36357cceb2404"`);
        await queryRunner.query(`ALTER TABLE "buzz_event" DROP CONSTRAINT "FK_99d58cc5c97f30557d4ce68e6c2"`);
        await queryRunner.query(`ALTER TABLE "buzz" DROP CONSTRAINT "FK_6388962b23f3826ff96113a6637"`);
        await queryRunner.query(`ALTER TABLE "suite" DROP CONSTRAINT "FK_2253b3960fbac2ae959e2e890cd"`);
        await queryRunner.query(`ALTER TABLE "suite" DROP CONSTRAINT "FK_78653d2be5400af72dc6fd23e0a"`);
        await queryRunner.query(`DROP TABLE "person_suite"`);
        await queryRunner.query(`DROP TABLE "buzz_event"`);
        await queryRunner.query(`DROP INDEX "IDX_5bf736cc20ccf3d75ff1c7dbaf"`);
        await queryRunner.query(`DROP TABLE "buzz"`);
        await queryRunner.query(`DROP INDEX "IDX_a73a65e6be1e07db602e70b55f"`);
        await queryRunner.query(`DROP TABLE "suite"`);
        await queryRunner.query(`DROP INDEX "IDX_e8fb63ed864ffed9a10f47f5d1"`);
        await queryRunner.query(`DROP TABLE "twilio_line"`);
        await queryRunner.query(`DROP INDEX "IDX_f89252f124736e498cedd04d2b"`);
        await queryRunner.query(`DROP TABLE "buzzer"`);
        await queryRunner.query(`DROP INDEX "IDX_5df72a74c70b3b538495bbc495"`);
        await queryRunner.query(`DROP TABLE "person"`);
    }

}
