import { createHash, createHmac } from 'crypto';
import scmp from 'scmp';
import * as url from 'url';

function validateBody(body, expectedValue) {
	var hash = createHash('sha256')
		.update(Buffer.from(body, 'utf-8'))
		.digest('hex');

	return scmp(Buffer.from(expectedValue), Buffer.from(hash));
}

/**
 Utility function to validate an incoming request is indeed from Twilio
 @param {string} authToken - The auth token, as seen in the Twilio portal
 @param {string} twilioHeader - The value of the X-Twilio-Signature header from the request
 @param {string} url - The full URL (with query string) you configured to handle this request
 @param {object} params - the parameters sent with this request
 */
function validateRequest(authToken, twilioHeader, url, params) {
	Object.keys(params)
		.sort()
		.forEach(function(key) {
			url = url + key + params[key];
		});

	var signature = createHmac('sha1', authToken)
		.update(Buffer.from(url, 'utf-8'))
		.digest('base64');

	return scmp(Buffer.from(twilioHeader), Buffer.from(signature));
}

/**
   Utility function to validate an incoming request is indeed from Twilio. This also validates
   the request body against the bodySHA256 post parameter.
   @param {string} authToken - The auth token, as seen in the Twilio portal
   @param {string} twilioHeader - The value of the X-Twilio-Signature header from the request
   @param {string} requestUrl - The full URL (with query string) you configured to handle this request
   @param {string} body - The body of the request
   */
function validateRequestWithBody(authToken, twilioHeader, requestUrl, body) {
	var urlObject = new url.URL(requestUrl);
	return (
		validateRequest(authToken, twilioHeader, requestUrl, {}) &&
		validateBody(body, urlObject.searchParams.get('bodySHA256'))
	);
}

/**
   Utility function to validate an incoming request is indeed from Twilio (for use with express).
   adapted from https://github.com/crabasa/twiliosig
   @param {object} request - An expressjs request object (http://expressjs.com/api.html#req.params)
   @param {string} authToken - The auth token, as seen in the Twilio portal
   @param {object} opts - options for request validation:
      - url: The full URL (with query string) you used to configure the webhook with Twilio - overrides host/protocol options
      - host: manually specify the host name used by Twilio in a number's webhook config
      - protocol: manually specify the protocol used by Twilio in a number's webhook config
   */
function validateExpressRequest(request, authToken, opts) {
	var options = opts || {};
	var webhookUrl;

	if (options.url) {
		// Let the user specify the full URL
		webhookUrl = options.url;
	} else {
		// Use configured host/protocol, or infer based on request
		var protocol = options.protocol || request.protocol;
		var host = options.host || request.headers.host;

		webhookUrl = url.format({
			protocol: protocol,
			host: host,
			pathname: request.originalUrl
		});
		if (request.originalUrl.search(/\?/) >= 0) {
			webhookUrl = webhookUrl.replace('%3F', '?');
		}
	}

	if (webhookUrl.indexOf('bodySHA256') > 0) {
		return validateRequestWithBody(
			authToken,
			request.header('X-Twilio-Signature'),
			webhookUrl,
			request.rawBody || {}
		);
	} else {
		return validateRequest(authToken, request.header('X-Twilio-Signature'), webhookUrl, request.rawBody || {});
	}
}

export function twimlMiddlewareFactory() {
	const { TWILIO_AUTH_TOKEN } = process.env;

	return function(req, res, next) {
		var valid = validateExpressRequest(req, TWILIO_AUTH_TOKEN, {});

		if (valid) {
			console.log('Valid Twilio Request');
			next();
		} else {
			console.log('Validation failed', req);
			return res
				.type('text/plain')
				.status(403)
				.send('Twilio Request Validation Failed.');
		}
	};
}