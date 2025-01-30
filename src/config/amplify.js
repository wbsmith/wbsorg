// src/config/amplify.js
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    identityPoolId: 'us-west-1:9e08878d-ca32-436e-b383-1af42a66a80d',
    region: 'us-west-1',
  },
  Storage: {
    AWSS3: {
      bucket: 'wbryansmith.org',
      region: 'us-west-1',
      customPrefix: {
        public: ''
      }
    }
  }
});