import type { Pool } from "pg";
import type {
  ConversationDetail,
  ConversationSummary,
} from "@/lib/adapters/types";

/**
 * Shared query layer for brands whose source DB uses the Contact /
 * Conversation / Message shape (Prisma-generated, mixed-case identifiers).
 * Appnality and Booknality both use this shape today.
 */

/**
 * `agentColumns` opts in to the human-takeover columns (Conversation.aiEnabled,
 * Conversation.aiDisabledReason, Message.sender). Only brands whose schema has
 * them may pass it; Appnality's schema doesn't, so it keeps the original queries.
 */
type QueryOptions = { agentColumns?: boolean };

export async function listWhatsappConversations(
  pool: Pool,
  options: QueryOptions = {},
): Promise<ConversationSummary[]> {
  const { rows } = await pool.query(`
    select
      c."id" as id,
      ct."name" as customer_name,
      ct."phoneNumber" as phone_number,
      c."status" as status,
      ${options.agentColumns ? `c."aiEnabled" as ai_enabled,` : ""}
      lm."createdAt" as last_message_at,
      lm."body" as last_message_body,
      lm."direction" as last_message_direction
    from "Conversation" c
    join "Contact" ct on ct."id" = c."contactId"
    left join lateral (
      select "createdAt", "body", "direction"
      from "Message" m
      where m."conversationId" = c."id"
      order by m."createdAt" desc
      limit 1
    ) lm on true
    order by coalesce(lm."createdAt", c."updatedAt") desc
  `);

  return rows.map((row) => ({
    id: row.id,
    customerName: row.customer_name,
    phoneNumber: row.phone_number,
    status: row.status,
    lastMessageAt: (row.last_message_at ?? new Date(0)).toISOString(),
    lastMessagePreview: row.last_message_body,
    lastMessageDirection: row.last_message_direction,
    ...(options.agentColumns ? { aiEnabled: row.ai_enabled } : {}),
  }));
}

export async function getWhatsappConversation(
  pool: Pool,
  conversationId: string,
  options: QueryOptions = {},
): Promise<ConversationDetail | null> {
  const { rows: convRows } = await pool.query(
    `
    select
      c."id" as id,
      c."status" as status,
      ${options.agentColumns ? `c."aiEnabled" as ai_enabled, c."aiDisabledReason" as ai_disabled_reason,` : ""}
      ct."name" as customer_name,
      ct."phoneNumber" as phone_number
    from "Conversation" c
    join "Contact" ct on ct."id" = c."contactId"
    where c."id" = $1
    limit 1
  `,
    [conversationId],
  );

  const conv = convRows[0];
  if (!conv) return null;

  const { rows: messageRows } = await pool.query(
    `
    select "id", "direction", ${options.agentColumns ? `"sender",` : ""} "body", "createdAt"
    from "Message"
    where "conversationId" = $1
    order by "createdAt" asc
    limit 500
  `,
    [conversationId],
  );

  return {
    id: conv.id,
    customerName: conv.customer_name,
    phoneNumber: conv.phone_number,
    status: conv.status,
    messages: messageRows.map((m) => ({
      id: m.id,
      direction: m.direction,
      ...(options.agentColumns ? { sender: m.sender ?? null } : {}),
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
    ...(options.agentColumns
      ? { aiEnabled: conv.ai_enabled, aiDisabledReason: conv.ai_disabled_reason }
      : {}),
  };
}

/**
 * Permanently deletes a conversation and its messages. Runs in a
 * transaction and deletes Message rows explicitly before the Conversation
 * row — belt-and-suspenders alongside the schema's ON DELETE CASCADE, so
 * this stays correct even if that constraint is ever changed. The Contact
 * (customer) record is left intact; only this conversation thread and its
 * message history are removed.
 */
export async function deleteWhatsappConversation(
  pool: Pool,
  conversationId: string,
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("begin");

    await client.query(`delete from "Message" where "conversationId" = $1`, [
      conversationId,
    ]);

    const { rowCount } = await client.query(
      `delete from "Conversation" where "id" = $1`,
      [conversationId],
    );

    await client.query("commit");
    return (rowCount ?? 0) > 0;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
