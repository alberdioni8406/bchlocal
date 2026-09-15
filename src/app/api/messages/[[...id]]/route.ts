import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Ctx = { params: Promise<{ id?: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;

    if (id?.[0]) {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: id[0],
          OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
        },
        include: {
          listing: { select: { id: true, title: true, priceMzn: true } },
          buyer: { select: { id: true, username: true, profile: { select: { displayName: true } } } },
          seller: { select: { id: true, username: true, profile: { select: { displayName: true } } } },
          messages: {
            orderBy: { createdAt: "asc" },
            include: { sender: { select: { id: true, username: true } } },
          },
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      await prisma.message.updateMany({
        where: {
          conversationId: id[0],
          senderId: { not: session.user.id },
          isRead: false,
        },
        data: { isRead: true },
      });

      return NextResponse.json({
        id: conversation.id,
        listing: conversation.listing,
        buyer: conversation.buyer,
        seller: conversation.seller,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          content: m.content,
          senderId: m.senderId,
          senderUsername: m.sender.username,
          createdAt: m.createdAt,
          isMine: m.senderId === session.user.id,
        })),
      });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
      },
      orderBy: { lastMessageAt: "desc" },
      include: {
        listing: { select: { id: true, title: true, priceMzn: true } },
        buyer: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        seller: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({
      conversations: conversations.map((c) => {
        const other = c.buyerId === session.user.id ? c.seller : c.buyer;
        return {
          id: c.id,
          listing: c.listing,
          otherUser: {
            username: other.username,
            displayName: other.profile?.displayName,
            avatarUrl: other.profile?.avatarUrl,
          },
          lastMessage: c.messages[0]
            ? {
                content: c.messages[0].content,
                createdAt: c.messages[0].createdAt,
                isRead: c.messages[0].isRead,
              }
            : null,
          lastMessageAt: c.lastMessageAt,
        };
      }),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ conversations: [] });
  }
}

const startSchema = z.object({
  listingId: z.string().optional(),
  sellerId: z.string().optional(),
  content: z.string().min(1).max(2000),
});

const replySchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const body = await req.json();

    // Reply to existing conversation
    if (id?.[0]) {
      const { content } = replySchema.parse(body);
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: id[0],
          OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
        },
      });
      if (!conversation) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const message = await prisma.message.create({
        data: {
          conversationId: id[0],
          senderId: session.user.id,
          content,
        },
      });

      await prisma.conversation.update({
        where: { id: id[0] },
        data: { lastMessageAt: new Date() },
      });

      const recipientId =
        conversation.buyerId === session.user.id
          ? conversation.sellerId
          : conversation.buyerId;

      await prisma.notification
        .create({
          data: {
            userId: recipientId,
            type: "NEW_MESSAGE",
            title: "New message",
            body: content.slice(0, 100),
            link: `/messages/${id[0]}`,
          },
        })
        .catch(() => {});

      return NextResponse.json({
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        isMine: true,
      });
    }

    // Start new conversation
    const data = startSchema.parse(body);
    let sellerId = data.sellerId;
    let listingId = data.listingId;

    if (listingId) {
      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      sellerId = listing.sellerId;
      if (sellerId === session.user.id) {
        return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
      }
    }

    if (!sellerId) {
      return NextResponse.json({ error: "sellerId or listingId required" }, { status: 400 });
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        buyerId: session.user.id,
        sellerId,
        listingId: listingId || null,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          buyerId: session.user.id,
          sellerId,
          listingId: listingId || null,
        },
      });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: session.user.id,
        content: data.content,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    await prisma.notification
      .create({
        data: {
          userId: sellerId,
          type: "NEW_MESSAGE",
          title: "New message",
          body: data.content.slice(0, 100),
          link: `/messages/${conversation.id}`,
        },
      })
      .catch(() => {});

    return NextResponse.json({ conversationId: conversation.id, messageId: message.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
