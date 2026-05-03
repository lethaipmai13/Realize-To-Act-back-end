# Security Specification - Realize To Act

## Data Invariants
- `Users`: Users can only edit their own profile. Public profile information is readable by all authenticated users.
- `Connections`: Only the sender or the recipient (school or partner) can view, update, or delete a connection request.
- `Documents`: Documents are private to the involved parties. Only the specified 'fromId' or 'toId' can access them.
- `Chats`: Chat metadata and messages are strictly limited to the participants listed in the `participants` array.

## The "Dirty Dozen" Payloads (Attack Vectors)

1. **Identity Theft (User Profile)**: Attempt to update another user's email or name.
   - Payload: `{ "id": "other-user-id", "name": "Hacker" }` targeting `/users/other-user-id`.
2. **Connection Hijack**: Attempt to approve a connection request where the user is not the recipient.
   - Payload: `{ "status": "approved" }` targeting `/connections/request-id` where `toId != auth.uid`.
3. **Message Forgery**: Attempt to send a message as another user.
   - Payload: `{ "senderId": "other-user-id", "text": "Fake message" }` targeting `/chats/chat-id/messages/msg-id`.
4. **Chat Eavesdropping**: Attempt to read messages in a chat where the user is not a participant.
   - Targeting `/chats/chat-id/messages`.
5. **Document Spoofing**: Attempt to sign a document as the other party.
   - Payload: `{ "status": "signed", "signedDate": "2026-05-03" }` targeting `/documents/doc-id` where `toId != auth.uid`.
6. **Orphaned Connection**: Attempt to create a connection request referencing a non-existent item or user.
   - Payload: `{ "fromId": "auth.uid", "toId": "non-existent", ... }`
7. **Privilege Escalation**: Attempt to set `isAdmin` on a user profile. (Note: App doesn't have admin yet, but we guard against shadow fields).
8. **Resource Exhaustion**: Sending a 1MB string as a message text.
9. **Timestamp Manipulation**: Sending a `postedAt` date in the future.
10. **ID Poisoning**: Creating a document with a 2KB long ID.
11. **Shadow Update**: Adding a `verified: true` field to a user profile that doesn't exist in the schema.
12. **Blind Deletion**: Attempt to delete a connection request owned by someone else.

## Test Runner (firestore.rules.test.ts)

```typescript
// This file would contain tests using the @firebase/rules-unit-testing library.
// It verifies that all unauthorized operations return PERMISSION_DENIED.
```
