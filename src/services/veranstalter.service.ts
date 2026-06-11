import { toEventDto, toVeranstalterDto } from "../lib/dto";
import { conflict, forbidden, notFound } from "../lib/errors";
import { eventRepo } from "../repositories/event.repo";
import { veranstalterRepo } from "../repositories/veranstalter.repo";
import type {
  CreateVeranstalterInput,
  UpdateVeranstalterInput,
} from "../schemas/veranstalter.schema";

export const veranstalterService = {
  async create(ownerId: string, input: CreateVeranstalterInput) {
    if (await veranstalterRepo.findByOwnerId(ownerId)) {
      throw conflict("Du hast bereits ein Veranstalter-Profil.", "VERANSTALTER_EXISTS");
    }
    const v = await veranstalterRepo.create(ownerId, input);
    return toVeranstalterDto(v);
  },

  async getById(id: string) {
    const v = await veranstalterRepo.findById(id);
    if (!v || !v.isActive) throw notFound("Veranstalter nicht gefunden.");
    return toVeranstalterDto(v);
  },

  async update(id: string, requesterId: string, input: UpdateVeranstalterInput) {
    const v = await veranstalterRepo.findById(id);
    if (!v) throw notFound("Veranstalter nicht gefunden.");
    if (v.ownerId !== requesterId) throw forbidden("Nur der Inhaber darf das Profil bearbeiten.");
    const updated = await veranstalterRepo.update(id, input);
    return toVeranstalterDto(updated);
  },

  /** Eigene Drafts/Cancelled sieht nur der Inhaber; alle anderen nur PUBLISHED. */
  async listEvents(id: string, requesterId: string | null) {
    const v = await veranstalterRepo.findById(id);
    if (!v) throw notFound("Veranstalter nicht gefunden.");
    const isOwner = requesterId !== null && v.ownerId === requesterId;
    const events = await eventRepo.listByVeranstalter(id, isOwner);
    return events.map(toEventDto);
  },
};
