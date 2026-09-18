import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";

export async function createNotification(opts: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        link: opts.link,
      },
    });
  } catch (err) {
    console.error("createNotification failed:", err);
    return null;
  }
}
