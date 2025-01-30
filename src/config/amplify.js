// src/config/amplify.js
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    identityPoolId: 'us-west-1:your-identity-pool-id',
    region: 'us-west-1',
    mandatorySignIn: false
  },
  Storage: {
    AWSS3: {
      bucket: 'wbryansmith.org',
      region: 'us-west-1',
      customPrefix: {
        public: ''
      }
    }
  },
  API: {
    endpoints: [
      {
        name: 'S3',
        endpoint: `https://s3.us-west-1.amazonaws.com`,
        region: 'us-west-1'
      }
    ]
  }
});