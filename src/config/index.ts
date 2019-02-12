export default function() {
	const { MAPS_API_KEY, TYPEORM_HOST, TYPEORM_PASSWORD } = process.env;
	return {
		maps: {
			apiKey: MAPS_API_KEY
		},
		db: {}
	};
}
