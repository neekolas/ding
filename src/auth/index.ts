import * as admin from 'firebase-admin';

admin.initializeApp({
	databaseURL: 'https://dingdong-dev.firebaseio.com'
});

export default class {
	admin = admin;
}
