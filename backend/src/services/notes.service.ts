import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.middleware.js';

export interface CreateNoteDTO {
  title: string;
  content?: string;
  category?: string;
  isPinned?: boolean;
}

export interface UpdateNoteDTO {
  title?: string;
  content?: string;
  category?: string;
  isPinned?: boolean;
}

export class NotesService {
  async listNotes(userId: string, category?: string, search?: string) {
    const whereClause: any = { userId };
    if (category && category !== 'All') {
      whereClause.category = category;
    }
    if (search && search.trim()) {
      whereClause.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { content: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    return prisma.note.findMany({
      where: whereClause,
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  async getNote(userId: string, noteId: string) {
    const note = await prisma.note.findFirst({
      where: { id: noteId, userId },
    });
    if (!note) throw new AppError('Note not found', 404);
    return note;
  }

  async createNote(userId: string, dto: CreateNoteDTO) {
    return prisma.note.create({
      data: {
        userId,
        title: dto.title.trim() || 'Untitled Note',
        content: dto.content || '',
        category: dto.category || 'General',
        isPinned: dto.isPinned || false,
      },
    });
  }

  async updateNote(userId: string, noteId: string, dto: UpdateNoteDTO) {
    const existing = await prisma.note.findFirst({
      where: { id: noteId, userId },
    });
    if (!existing) throw new AppError('Note not found', 404);

    return prisma.note.update({
      where: { id: noteId },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() || 'Untitled Note' }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
      },
    });
  }

  async deleteNote(userId: string, noteId: string) {
    const existing = await prisma.note.findFirst({
      where: { id: noteId, userId },
    });
    if (!existing) throw new AppError('Note not found', 404);

    return prisma.note.delete({
      where: { id: noteId },
    });
  }
}

export const notesService = new NotesService();
