import { getDb } from '@/lib/firestore';
import { EventMetadata } from '@/lib/types';

export async function upsertStreamEvent(
  streamId: string,
  eventId: string,
  type: string,
  message: string,
  metadata: EventMetadata | null = null,
  createdAt = new Date(),
) {
  await getDb()
    .collection('streams')
    .doc(streamId)
    .collection('events')
    .doc(eventId)
    .set({
      type,
      message,
      metadata,
      createdAt,
    });
}
