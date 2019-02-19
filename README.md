# DingDong

## A Multi-Tenant Apartment Buzzer

### Features

-   GraphQL API for all management tasks
-   Route calls from your apartment buzzer to any number of apartment residents via voice
-   Grant time-restricted access codes to house-guests/maids/friends which can be entered on buzzer keypad
-   One Twilio number can be shared between many apartments

### Local Setup

1. `npm i`
2. Create and source a .env file with the following environment variables

```
export MAPS_API_KEY=$YOUR_GOOGLE_MAPS_API_KEY
export TWILIO_SID=$YOUR_TWILIO_ACCOUNT_SID
export TWILIO_AUTH_TOKEN=$YOUR_TWILIO_AUTH_TOKE
export TWILIO_DEFAULT_NUMBER=$A_NUMBER_FROM_YOUR_TWILIO_ACCOUNT
```

3. `npm run up` will start Postgres in the background with Docker and initate a persistent data volume
4. `npm start`
   _You will now have a graphql server at localhost:5000/graphql and a twilio voice handler at localhost:5000/voice. In local development the postgres schema will be synced on first request_

### Continuous Delivery instructions

1. Replace `dingdong-dev` with your own firebase project name in .firebaserc
2. Create a Postgres Cloud SQL instance
3. Create a Firebase CI token by running `npx firebase login:ci` and set it as an environment variable named FIREBASE_TOKEN in CircleCI
4. Force a build in CircleCI by committing your change from step 1
