// src/config/amplify.js
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Storage: {
    AWSS3: {
      bucket: 'wbryansmith.org',
      region: 'us-west-1',
      customPrefix: {
        public: ''  // Ensures no extra prefix in our paths
      }
    }
  }
});