import { useEffect, useState } from 'react';
import { guestApi, roomApi } from '../services/apiClient';

const roomMembersCache = new Map();

function mapMembers(members, guests) {
  const approvedUsers = members
    .filter((member) => member.status === 'approved')
    .map((member) => ({
      id: member.user.id,
      name: member.user.name,
      type: 'user',
      status: member.status,
    }));

  const activeGuests = guests
    .filter((guest) => guest.status === 'active' || guest.status === 'claimed')
    .map((guest) => ({
      id: guest.id,
      name: guest.displayName,
      type: 'guest',
      status: guest.status,
      claimedByUserId: guest.claimedByUserId,
    }));

  return [...approvedUsers, ...activeGuests];
}

export function useRoomMembers(roomId) {
  const [members, setMembers] = useState(() => roomMembersCache.get(roomId) ?? []);
  const [loading, setLoading] = useState(Boolean(roomId && !roomMembersCache.has(roomId)));
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!roomId) {
      setMembers([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    const cached = roomMembersCache.get(roomId);
    if (cached) {
      setMembers(cached);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);

    Promise.all([roomApi.getMembers(roomId), guestApi.getGuests(roomId)])
      .then(([membersRes, guestsRes]) => {
        if (cancelled) return;
        const nextMembers = mapMembers(membersRes.members ?? [], guestsRes.guests ?? []);
        roomMembersCache.set(roomId, nextMembers);
        setMembers(nextMembers);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  return { members, loading, error };
}
