import { gql } from 'apollo-server-express';

export default gql`
	type Person {
		id: ID!
		firstName: String
		lastName: String
		nickname: String
		phoneNumber: String
	}

	type PersonSuite {
		person: Person!
		startDate: String!
		endDate: String!
		role: String!
	}

	type Suite {
		id: ID!
		address: String
		unit: String!
		activationCode: String
		placeID: String!
		buzzerPhoneNumber: String
		twilioPhoneNumber: String!
		country: String!
		owners: [PersonSuite]
		visitors: [PersonSuite]
	}

	type PlaceResult {
		id: ID!
		address: String!
		name: String!
	}

	type Query {
		me: Person!
		suites: [Suite]
		suite(id: ID!): Suite!
		addressSearch(query: String!): [PlaceResult]
	}

	type Mutation {
		updateUser(firstName: String, lastName: String, nickname: String): Person!
		unlinkPerson(suiteID: ID!, personID: ID!): Boolean!
		inviteOwner(suiteID: ID!, phoneNumber: String!): Boolean!
		createSuite(placeID: String!, unit: String!): Suite!
		createLine(phoneNumber: String!, country: String!): Boolean!
		deleteSuite(suiteID: ID!): Boolean!
	}
`;
