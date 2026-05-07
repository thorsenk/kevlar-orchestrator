import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';
import { handleFirestoreError, OperationType } from './error';

export async function createChat(name: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    const docRef = await addDoc(collection(db, 'chats'), {
      ownerId: user.uid,
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'chats');
  }
}

export async function updateChatProject(chatId: string, projectId: string | null) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    await updateDoc(doc(db, 'chats', chatId), {
      projectId: projectId || null,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'chats');
  }
}

export async function updateChatName(chatId: string, name: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    await updateDoc(doc(db, 'chats', chatId), {
      name,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'chats');
  }
}

export async function sendMessage(chatId: string, content: string, role: 'user' | 'assistant' = 'user') {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    await addDoc(collection(db, `chats/${chatId}/messages`), {
      role,
      content,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages`);
  }
}

export async function createProject(name: string, isSub: boolean = false) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    const docRef = await addDoc(collection(db, 'projects'), {
      ownerId: user.uid,
      name,
      isSub,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'projects');
  }
}

export async function updateProjectName(projectId: string, name: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    await updateDoc(doc(db, 'projects', projectId), {
      name,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'projects');
  }
}

export async function createTeam(name: string, description: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    const docRef = await addDoc(collection(db, 'teams'), {
      ownerId: user.uid,
      name,
      description,
      members: [],
      roles: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'teams');
  }
}

export async function createTask(title: string, projectTag: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    const docRef = await addDoc(collection(db, 'tasks'), {
      ownerId: user.uid,
      title,
      projectTag,
      status: 'Idle',
      creatorType: 'User',
      payloadType: 'none',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'tasks');
  }
}

export async function updateTaskStatus(taskId: string, status: 'Idle' | 'Processing' | 'Awaiting User' | 'Completed') {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    await updateDoc(doc(db, 'tasks', taskId), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'tasks');
  }
}

export async function updateTaskAssignedAgent(taskId: string, assignedAgent: string | null) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    await updateDoc(doc(db, 'tasks', taskId), {
      assignedAgent,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'tasks');
  }
}

export async function deleteTask(taskId: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'tasks');
  }
}

export async function deleteChat(chatId: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    await deleteDoc(doc(db, 'chats', chatId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'chats');
  }
}

export async function deleteProject(projectId: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'projects');
  }
}

export async function deleteTeam(teamId: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    await deleteDoc(doc(db, 'teams', teamId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'teams');
  }
}

export async function updateTeamProfile(teamId: string, name: string, description: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    await updateDoc(doc(db, 'teams', teamId), {
      name,
      description,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'teams');
  }
}

export async function updateTaskTitle(taskId: string, title: string) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    await updateDoc(doc(db, 'tasks', taskId), {
      title,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'tasks');
  }
}

// Just setting up some initials if none exist
export async function seedInitialData() {
  const user = auth.currentUser;
  if (!user) return;
  // Use generic queries to seed data if wanted, skipped for now to just let users click and drive it.
}
