import { auth } from "@/app/(auth)/auth";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getChatById,
  getMessageById,
  getMessagesByChatId,
} from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return Response.json({ error: "chatId required" }, { status: 400 });
  }

  const [session, chat, messages] = await Promise.all([
    auth(),
    getChatById({ id: chatId }),
    getMessagesByChatId({ id: chatId }),
  ]);

  if (!chat) {
    return Response.json({
      isReadonly: false,
      messages: [],
      userId: null,
      visibility: "private",
    });
  }

  // 공유 링크를 쉽게 열 수 있도록 비공개 확인을 단순화했어요.
  const isReadonly = !session?.user || session.user.id !== chat.userId;

  return Response.json({
    isReadonly,
    messages: convertToUIMessages(messages),
    userId: chat.userId,
    visibility: chat.visibility,
  });
}

// 새 기능: 메시지 하나와 그 뒤 메시지를 지우기
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get("messageId");

  if (!messageId) {
    return Response.json({ error: "messageId required" }, { status: 400 });
  }

  const [message] = await getMessageById({ id: messageId });

  if (!message) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });

  return Response.json({ deleted: true });
}
