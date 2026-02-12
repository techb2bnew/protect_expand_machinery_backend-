import admin from 'firebase-admin';

let firebaseApp = null;

// Service Account Configuration
const serviceAccountConfig = {
  type: "service_account",
  project_id: "expand-1ffce",
  private_key_id: "076d0c06dc6e6457c98eef89e4d363fbd5df6a3e",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC1y5GyHf8uGP1I\nqSiTH+wc6r82qriTC72jItbX+jaIiRtrigZknHHK+6RyopVLkhI4mOtNDXUY7GyR\nvD5JKY6UWGbstL0y9iz/3fs4qLRltcSlv98l6ff4p2XFKktCNtkY8DsQ8GcGswTS\nF7inM4zsu4eRSMNUnoPTHH7b9sbLQ4jJBaC32q9rITagOrhYDd9RCcF4r8vW+3zc\nOcsseZpxouxNGrFsAHqX2eJvoZIqaRMA/V0oxrpW04jwzwgH8V15Bu5pnQgzE82y\nbU8ReSJ5lIBWIrk0PDuH3S9NihZ5e+A1iNuIaQbVJDPWjsotVes8F1g9Thh4Y7hH\n5hF3GTplAgMBAAECggEAG4sz0GpWEtxrZ7plcOEZy4nPnc9A9tqFCXYKWh/Jamdn\nlaQMcur3HLuCv3GdsBz6EMQuhnafAr8zdeMxBrG6rgQ01/FMZy/AQqYV3ZBGANEI\n8dn/y8VGslBejYBqdaZMv0gKkvbxjSTLeq9oZUDcvbNuB1egbK41p+M930Lk/L/F\ndS+7c9izhoR6r8V7ZN6sVEPY24qwW9FS+039u7NzNE3YeVoujTHQEUPvB79CaR09\nOPuozrJWjos5VBwB1BBHoZjnHS/VOsAdZ3OeQRqS997NHgt0Q3O5f/TcjQfNnnEi\nwRdBzXdEuAaWHyHcN11rNWlm0g3KCiJeGo8qR63EMwKBgQDwXazQRVmOFrF+42nq\nCOX6qb6CP+LXOSMjcjaOF9NwDK10EFmfFUIH+0WQC1gDycQ5L8KK6RZ13iIbco5L\nomNj6en6Gt2l92zpw0yXG79ZElwMrTzMfYJ1pEig0EaG8UGj7K+dtMEooCdWTmaZ\nUwo9i9Ly4V0Z+WveFmq1L7+kLwKBgQDBnqKFTec6sYV1mdNQuuVlmkG3qgu5SuaF\ngq++TomM38gp+MAykbkkjirXThGhpxNrjk2pBweE8Rl8drqVBrAUPw9Svm+AR43g\nyXkUjKF8TeVYOBNHnBs3ZsLwE3ji6runpZkjTfMexRL7eMQIWAEGhiMN22QEXQDK\n3i/c2zuhqwKBgD2c1XJhhG4ulPrgkkKiW0kgf6vlcmEWzVIFscREiTc8mK2aj05+\n5XkkSJV+wuXdr0W1X1m6G77E3NtKRv1ON8nhqM8qWcx0Gt/k5toJC8hqM1wwf9gv\nB+Td4pwOJzXp25iIUA/NyIGAY/T0jcoZhhN2pvEJIZNJ4wN/nYSqI6aTAoGASKOG\nH3LRnCB7jFowgCoN4+dSXmBKU7K49z/HRSNb0WEnTC/Jk28+QWugwPPGA5qV25Ug\np5g+hu6Y/Cvi5gQDTSU3T3iohjzSCpIrfb0g3Gyw7T7kZMo5H7jKy5zSjnc3/bZP\n1IHrAxE2hOeSy/qQL+1k+07ioAxwPqvK0xXgsk8CgYEA2Cp/zPCWQo4JM8TNtGV5\n9xVdvMspAUPyrQyIB4t6SJMnJAu7C36B9oPwv6kCEvdrkJtaHTYsUeFdm5EYWuTI\np3tgSOYIXu9mPchKBhsQ/on91/Xx9I66zRIKyVaGkDtVCGuAMs/n7ddyC7PMlWSZ\nVLqBjkxNvRF/tRVa6BHpLbY=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@expand-1ffce.iam.gserviceaccount.com",
  client_id: "100717454706256559125",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40expand-1ffce.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

export const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountConfig),
    });
    console.log('🔥 Firebase initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error.message);
    throw error;
  }

  return firebaseApp;
};

export const getFirebaseMessaging = () => {
  const app = initializeFirebase();
  return app.messaging();
};
