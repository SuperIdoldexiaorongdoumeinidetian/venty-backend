import { badRequest, conflict, notFound } from "../lib/errors";
import { friendshipRepo } from "../repositories/friendship.repo";
import { userRepo } from "../repositories/user.repo";

export const friendService = {
  /** Direkte Freundschaft ohne Request-Flow (wie AddFriend im alten C#-Modell). */
  async add(userId: string, otherId: string) {
    if (userId === otherId) throw badRequest("Du kannst dich nicht selbst hinzufügen.", "SELF_FRIEND");
    const other = await userRepo.findById(otherId);
    if (!other || !other.isActive) throw notFound("User nicht gefunden.");
    if (await friendshipRepo.find(userId, otherId)) {
      throw conflict("Ihr seid bereits befreundet.", "ALREADY_FRIENDS");
    }
    await friendshipRepo.create(userId, otherId);
  },

  async remove(userId: string, otherId: string) {
    if (userId === otherId) throw badRequest("Ungültige Anfrage.", "SELF_FRIEND");
    const result = await friendshipRepo.delete(userId, otherId);
    if (result.count === 0) throw notFound("Ihr seid nicht befreundet.");
  },

  list: (userId: string) => friendshipRepo.listFriendsOf(userId),
};
