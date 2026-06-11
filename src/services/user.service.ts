import { toEventDto, toPublicUserDto, toUserMeDto } from "../lib/dto";
import { notFound, unauthorized } from "../lib/errors";
import { favoritRepo } from "../repositories/favorit.repo";
import { teilnahmeRepo } from "../repositories/teilnahme.repo";
import { userRepo } from "../repositories/user.repo";
import type { UpdateMeInput } from "../schemas/user.schema";

export const userService = {
  async getMe(userId: string) {
    const user = await userRepo.findById(userId);
    if (!user) throw unauthorized();
    return toUserMeDto(user);
  },

  async updateMe(userId: string, input: UpdateMeInput) {
    const user = await userRepo.update(userId, input);
    return toUserMeDto(user);
  },

  async getPublicProfile(id: string) {
    const user = await userRepo.findById(id);
    if (!user || !user.isActive) throw notFound("User nicht gefunden.");
    return toPublicUserDto(user);
  },

  async getMyEvents(userId: string) {
    const rows = await teilnahmeRepo.listEventsOfUser(userId);
    return rows.map((r) => toEventDto(r.event));
  },

  async getMyFavorites(userId: string) {
    const rows = await favoritRepo.listEventsOfUser(userId);
    return rows.map((r) => toEventDto(r.event));
  },
};
