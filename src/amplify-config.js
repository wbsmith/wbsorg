import { Amplify } from 'aws-amplify';

Amplify.configure({
  Storage: {
    AWSS3: {
      bucket: 'wbryansmith.org',
      region: 'us-west-1',
      customPrefix: {
        public: ''  // This ensures we don't get an extra prefix in our paths
      }
    }
  }
});