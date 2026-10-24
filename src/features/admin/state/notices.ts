import { db } from './db';
import { hasRight, me } from './access';
import type { Notice } from '../data/types';

/** A notice is for everyone, for one named person, or ('*perm') for everyone who can manage permissions. */
export const visibleTo = (n: Notice) => !n.to || (n.to === '*perm' ? hasRight('Manage permissions') : n.to === me().n);
export const isUnread = (n: Notice) => n.f.includes('unread') && !n.read;
export const myNotices = () => db.NS.filter(visibleTo);
export const unreadCount = () => myNotices().filter(isUnread).length;
export const markRead = (n: Notice) => { n.read = 1; };
export const markAllRead = () => myNotices().forEach(markRead);
