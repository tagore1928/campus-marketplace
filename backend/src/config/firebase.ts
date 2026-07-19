import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

import * as path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

class MockDocumentSnapshot {
  constructor(public id: string, public ref: any, private dataObj: any) {}
  get exists() {
    return !!this.dataObj;
  }
  data() {
    return this.dataObj ? { ...this.dataObj } : null;
  }
}

class MockQuery {
  constructor(private dataList: any[], private collection: any) {}
  where(field: string, op: string, value: any) {
    const filtered = this.dataList.filter(item => {
      const itemVal = item[field];
      if (op === '==') return itemVal === value;
      if (op === '!=') return itemVal !== value;
      if (op === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(value);
      return true;
    });
    return new MockQuery(filtered, this.collection);
  }
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    const sorted = [...this.dataList].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return new MockQuery(sorted, this.collection);
  }
  limit(n: number) {
    return new MockQuery(this.dataList.slice(0, n), this.collection);
  }
  async get() {
    const docs = this.dataList.map(item => {
      const docRef = this.collection.doc(item.id);
      return new MockDocumentSnapshot(item.id, docRef, item);
    });
    return {
      empty: docs.length === 0,
      size: docs.length,
      docs: docs,
      forEach: (callback: (doc: MockDocumentSnapshot) => void) => {
        docs.forEach(callback);
      }
    };
  }
}

class MockDocument {
  constructor(public id: string, private collectionName: string, private store: any) {}
  async get() {
    const item = this.store[this.collectionName]?.[this.id];
    return new MockDocumentSnapshot(this.id, this, item);
  }
  async set(data: any, options?: any) {
    if (!this.store[this.collectionName]) this.store[this.collectionName] = {};
    const existing = this.store[this.collectionName][this.id] || {};
    const merged = options?.merge ? { ...existing, ...data } : { ...data };
    merged.id = this.id;
    if (!merged.createdAt) merged.createdAt = new Date().toISOString();
    this.store[this.collectionName][this.id] = merged;
  }
  async update(data: any) {
    if (!this.store[this.collectionName]?.[this.id]) {
      throw new Error(`Document ${this.id} not found in collection ${this.collectionName}`);
    }
    this.store[this.collectionName][this.id] = {
      ...this.store[this.collectionName][this.id],
      ...data
    };
  }
  async delete() {
    if (this.store[this.collectionName]?.[this.id]) {
      delete this.store[this.collectionName][this.id];
    }
  }
  collection(name: string) {
    const subCollectionPath = `${this.collectionName}/${this.id}/${name}`;
    return new MockCollection(subCollectionPath, this.store);
  }
}

class MockCollection {
  constructor(private collectionName: string, private store: any) {}
  doc(id?: string) {
    const docId = id || Math.random().toString(36).substring(2, 15);
    return new MockDocument(docId, this.collectionName, this.store);
  }
  where(field: string, op: string, value: any) {
    const list = Object.values(this.store[this.collectionName] || {});
    return new MockQuery(list, this).where(field, op, value);
  }
  orderBy(field: string, direction?: 'asc' | 'desc') {
    const list = Object.values(this.store[this.collectionName] || {});
    return new MockQuery(list, this).orderBy(field, direction);
  }
  async add(data: any) {
    const id = Math.random().toString(36).substring(2, 15);
    const docRef = this.doc(id);
    await docRef.set(data);
    return docRef;
  }
  async get() {
    const list = Object.values(this.store[this.collectionName] || {});
    return new MockQuery(list, this).get();
  }
}

class MockFirestore {
  private store: any = {};
  collection(name: string) {
    return new MockCollection(name, this.store);
  }
  batch() {
    const operations: Array<() => Promise<void>> = [];
    return {
      update: (docRef: MockDocument, data: any) => {
        operations.push(async () => {
          await docRef.update(data);
        });
      },
      set: (docRef: MockDocument, data: any, options?: any) => {
        operations.push(async () => {
          await docRef.set(data, options);
        });
      },
      delete: (docRef: MockDocument) => {
        operations.push(async () => {
          await docRef.delete();
        });
      },
      commit: async () => {
        for (const op of operations) {
          await op();
        }
      }
    };
  }
}

try {
  if (serviceAccountJson && serviceAccountJson.trim().startsWith('{')) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized successfully with service account.");
    db = admin.firestore();
    auth = admin.auth();
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT_JSON not found in .env. Falling back to local In-Memory Datastore for offline development.");
    db = new MockFirestore() as any;
    auth = {
      verifyIdToken: async (token: string) => {
        try {
          if (!token || !token.includes('.')) {
            // Testing token fallback
            const isTestingAdmin = token === 'admin-token';
            return {
              uid: isTestingAdmin ? 'admin-uid' : 'student-uid',
              email: isTestingAdmin ? 'campusmarketadmin@gmail.com' : 'student@college.edu.in',
              name: isTestingAdmin ? 'Admin User' : 'Student User',
              role: isTestingAdmin ? 'admin' : 'student',
            };
          }
          const payloadBase64 = token.split('.')[1];
          const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
          const email = decoded.email || '';
          const role = email.toLowerCase() === 'campusmarketadmin@gmail.com' ? 'admin' : 'student';
          return {
            uid: decoded.user_id || decoded.uid || 'mock-user-id',
            email: email,
            name: decoded.name || decoded.display_name || email.split('@')[0],
            role: role,
            ...decoded
          };
        } catch (e) {
          console.error("Mock verifyIdToken error decoding token:", e);
          throw new Error("Invalid or unverified mock authentication token.");
        }
      }
    } as any;
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", error);
  db = new MockFirestore() as any;
  auth = {
    verifyIdToken: async () => {
      throw new Error("Firebase Auth unconfigured");
    }
  } as any;
}

export { db, auth };
export default admin;

