function formatNumberLength(num, length) {
	var r = '' + num;
	while (r.length < length) {
		r = '0' + r;
	}
	return r;
}

export const generateActivationCode = () => {
	return formatNumberLength(Math.floor(Math.random() * 99999), 5);
};
