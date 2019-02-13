import { gql } from 'apollo-server-express';

export default gql`
	type Person {
		id: ID!
		firstName: String
		lastName: String
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
		addressSearch(query: String!): [PlaceResult]
	}

	type Mutation {
		createPerson(phoneNumber: String!, firstName: String, lastName: String): Person!
		createSuite(placeID: String!, unit: String!): Suite!
		createLine(phoneNumber: String!, country: String!): Boolean!
	}
`;
