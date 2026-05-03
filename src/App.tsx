import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Auth from './Auth';
import Layout from './Layout';
import Dashboard from './Dashboard';
import Requests from './Requests';
import Documents from './Documents';
import Messages from './Messages';
import Profile from './Profile';
import Search from './Search';
import { User, UserType, ConnectionRequest, Chat, Document } from './types';
import { MOCK_USER, MOCK_CONNECTIONS as INITIAL_CONNECTIONS, MOCK_DOCUMENTS as INITIAL_DOCUMENTS, MOCK_CHATS as INITIAL_CHATS } from './mockData';

import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { firebaseService } from './services/firebaseService';
import { apiService } from './services/apiService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [sqlUser, setSqlUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [actionsNeededRead, setActionsNeededRead] = useState(false);
  const [connections, setConnections] = useState<ConnectionRequest[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<{ text: string; isSuggestedTime?: boolean; suggestedTimes?: string[]; meetingNote?: string } | null>(null);
  const [lastActionTime, setLastActionTime] = useState<string>('');

  const updateLastAction = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    setLastActionTime(`Today at ${displayHours}:${displayMinutes} ${ampm}`);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await firebaseService.getUser(firebaseUser.uid);
          if (userData) {
            setUser(userData);

            // Sync with SQL Backend
            try {
              const orgs = await apiService.getOrganizations();
              let targetOrgId;
              if (orgs.length === 0) {
                const newOrg = await apiService.createOrganization({
                  name: userData.type === 'school' ? 'Midland School District' : 'Hope Helping Hand',
                  org_type: userData.type === 'school' ? 'school' : 'nonprofit',
                  city: 'Columbus',
                  state: 'OH'
                });
                targetOrgId = newOrg.id;
              } else {
                targetOrgId = orgs[0].id;
              }

              const loginRes = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userData.email, password: 'password' })
              });

              if (loginRes.ok) {
                setSqlUser(await loginRes.json());
              } else {
                // Auto-seed SQL user
                const names = userData.name.split(' ');
                const res = await fetch('/api/signup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    organization_id: targetOrgId,
                    email: userData.email,
                    password_hash: 'password',
                    first_name: names[0],
                    last_name: names.length > 1 ? names[names.length - 1] : '',
                    role: userData.type
                  })
                });
                if (res.ok) {
                  const newUser = await res.json();
                  const loginAgain = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userData.email, password: 'password' })
                  });
                  if (loginAgain.ok) setSqlUser(await loginAgain.json());
                }
              }
            } catch (err) {
              console.error("SQL Sync Error:", err);
            }
          } else {
            // This should ideally not happen if Auth.tsx handled it, but as a fallback:
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Anonymous User',
              email: firebaseUser.email || '',
              type: 'community-partner', // Default if unknown
              avatar: firebaseUser.photoURL || undefined
            };
            await firebaseService.createUser(newUser);
            setUser(newUser);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribeConnections = firebaseService.subscribeToConnections(user.id, (data) => {
      setConnections(data);
    });

    const unsubscribeChats = firebaseService.subscribeToChats(user.id, (data) => {
      setChats(data);
    });

    // Fetch documents (not reactive for now to simplify, or add subscribe)
    firebaseService.getDocuments(user.id).then(setDocuments);

    return () => {
      unsubscribeConnections();
      unsubscribeChats();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setActiveTab('dashboard');
      setSelectedChatId(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navigateToChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setActiveTab('messages');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.1,
              }}
              className="w-4 h-4 rounded-full bg-brand-primary"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Layout 
      user={user} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
      actionsNeededRead={actionsNeededRead}
      setActionsNeededRead={setActionsNeededRead}
    >
      {activeTab === 'dashboard' && (
        <Dashboard 
          user={user} 
          sqlUser={sqlUser}
          onNavigate={setActiveTab} 
          onNavigateToChat={navigateToChat}
          actionsNeededRead={actionsNeededRead}
          setActionsNeededRead={setActionsNeededRead}
          connections={connections}
          setConnections={setConnections}
          documents={documents}
          setDocuments={setDocuments}
          lastActionTime={lastActionTime}
          updateLastAction={updateLastAction}
          setChats={setChats}
        />
      )}
      {activeTab === 'requests' && (
        <Requests 
          connections={connections} 
          setConnections={setConnections} 
          user={user}
        />
      )}
      {activeTab === 'messages' && (
        <Messages 
          selectedChatId={selectedChatId} 
          setSelectedChatId={setSelectedChatId} 
          draftMessage={draftMessage}
          setDraftMessage={setDraftMessage}
          connections={connections}
          setConnections={setConnections}
          user={user}
          setDocuments={setDocuments}
          chats={chats}
          setChats={setChats}
        />
      )}
      {activeTab === 'documents' && (
        <Documents 
          documents={documents}
          setDocuments={setDocuments}
          updateLastAction={updateLastAction}
        />
      )}
      {activeTab === 'search' && (
        <Search 
          connections={connections}
          setConnections={setConnections}
          user={user}
        />
      )}
      {activeTab === 'profile' && (
        <Profile 
          user={user} 
          onLogout={handleLogout} 
          connections={connections}
          onUpdateUser={handleUpdateUser}
        />
      )}
    </Layout>
  );
}
