import express, { Request } from 'express';
import createVoiceApp from './voice';
import createGraphQlApp from './graphql';
const app = express();
const PORT = 3000;

app.use('/voice', createVoiceApp());
app.use('/graphql', createGraphQlApp());

app.listen(PORT, function() {
	console.log('DingDong is listening on port ' + PORT);
});
