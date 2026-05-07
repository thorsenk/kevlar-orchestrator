import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';
import { handleFirestoreError, OperationType } from './error';

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'projects');
    });
    return unsub;
  }, [user]);

  return projects;
}

export function useChats() {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'chats');
    });
    return unsub;
  }, [user]);

  return chats;
}

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'tasks'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'tasks');
    });
    return unsub;
  }, [user]);

  return tasks;
}

export function useTeams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'teams'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'teams');
    });
    return unsub;
  }, [user]);

  return teams;
}

export function useMessages(chatId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !chatId) {
      setMessages([]);
      return;
    }
    // we normally want to order by createdAt, but requires an index.
    const q = query(collection(db, `chats/${chatId}/messages`));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a: any, b: any) => {
        const t1 = a.createdAt?.toMillis() || 0;
        const t2 = b.createdAt?.toMillis() || 0;
        return t1 - t2;
      });
      setMessages(msgs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `chats/${chatId}/messages`);
    });
    return unsub;
  }, [user, chatId]);

  return messages;
}
