import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  serverTimestamp,
  limit,
  orderBy,
  addDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, ConnectionRequest, Document, Chat, Message } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firebaseService = {
  // Users
  async getUser(userId: string): Promise<User | null> {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as User : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async createUser(user: User): Promise<void> {
    const path = `users/${user.id}`;
    try {
      await setDoc(doc(db, 'users', user.id), user);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Connections
  async getConnections(userId: string): Promise<ConnectionRequest[]> {
    const path = 'connections';
    try {
      const q = query(
        collection(db, 'connections'),
        where('participants', 'array-contains', userId),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConnectionRequest));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  subscribeToConnections(userId: string, callback: (connections: ConnectionRequest[]) => void) {
    const path = 'connections';
    const q = query(
      collection(db, 'connections'),
      where('participants', 'array-contains', userId),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const connections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConnectionRequest));
      callback(connections);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async createConnection(connection: Omit<ConnectionRequest, 'id'>): Promise<string> {
    const path = 'connections';
    try {
      const docRef = await addDoc(collection(db, 'connections'), {
        ...connection,
        timestamp: Date.now(),
        participants: [connection.fromId, (connection as any).toId]
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  // Documents
  async getDocuments(userId: string): Promise<Document[]> {
    const path = 'documents';
    try {
      const q = query(
        collection(db, 'documents'),
        where('participants', 'array-contains', userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Chats
  async getChats(userId: string): Promise<Chat[]> {
    const path = 'chats';
    try {
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', userId),
        orderBy('lastMessageTimestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  subscribeToChats(userId: string, callback: (chats: Chat[]) => void) {
    const path = 'chats';
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTimestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      callback(chats);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async getMessages(chatId: string): Promise<Message[]> {
    const path = `chats/${chatId}/messages`;
    try {
      const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('serverTimestamp', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
    const path = `chats/${chatId}/messages`;
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('serverTimestamp', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      callback(messages);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async sendMessage(chatId: string, message: Omit<Message, 'id'>): Promise<void> {
    const path = `chats/${chatId}/messages`;
    try {
      const msgRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(msgRef, {
        ...message,
        serverTimestamp: serverTimestamp()
      });
      // Update chat metadata
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: message.text,
        lastMessageTimestamp: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateConnection(connId: string, data: Partial<ConnectionRequest>): Promise<void> {
    const path = `connections/${connId}`;
    try {
      await updateDoc(doc(db, 'connections', connId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteConnection(connId: string): Promise<void> {
    const path = `connections/${connId}`;
    try {
      await deleteDoc(doc(db, 'connections', connId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async createDocument(document: Omit<Document, 'id'>): Promise<string> {
    const path = 'documents';
    try {
      const docRef = await addDoc(collection(db, 'documents'), {
        ...document,
        timestamp: Date.now(),
        participants: [(document as any).fromId, (document as any).toId]
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  }
};
