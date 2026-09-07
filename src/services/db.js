import Dexie from 'dexie';

// 创建数据库
const db = new Dexie('XiaoShouJiDB');

// v1: 原始结构
db.version(1).stores({
  roles: '++id, name, createdAt, updatedAt',
  conversations: '++id, roleId, updatedAt',
  messages: '++id, conversationId, timestamp'
});

// v2: 新增 apiProfiles 表，conversations 加 isTop/isMuted 索引
db.version(2).stores({
  roles: '++id, name, createdAt, updatedAt',
  conversations: '++id, roleId, updatedAt, isTop, isMuted',
  messages: '++id, conversationId, timestamp',
  apiProfiles: '++id, name, createdAt'
});

// v3: messages 表支持 audioUrl（语音存储）
db.version(3).stores({
  roles: '++id, name, createdAt, updatedAt',
  conversations: '++id, roleId, updatedAt, isTop, isMuted',
  messages: '++id, conversationId, timestamp',
  apiProfiles: '++id, name, createdAt'
});

// v4: 新增 userPersonas（用户人设卡）和 stickers（表情包）
db.version(4).stores({
  roles: '++id, name, createdAt, updatedAt',
  conversations: '++id, roleId, updatedAt, isTop, isMuted',
  messages: '++id, conversationId, timestamp',
  apiProfiles: '++id, name, createdAt',
  userPersonas: '++id, name, createdAt',
  stickers: '++id, name, createdAt'
});

// v5: 新增 stickerLibraries（表情包库），stickers 添加 libraryId 索引
db.version(5).stores({
  roles: '++id, name, createdAt, updatedAt',
  conversations: '++id, roleId, updatedAt, isTop, isMuted',
  messages: '++id, conversationId, timestamp',
  apiProfiles: '++id, name, createdAt',
  userPersonas: '++id, name, createdAt',
  stickers: '++id, name, libraryId, createdAt',
  stickerLibraries: '++id, name, createdAt'
});

// v6: 新增 assets 表，用于存储桌面图片（壁纸、头像、挂件等）
db.version(6).stores({
  roles: '++id, name, createdAt, updatedAt',
  conversations: '++id, roleId, updatedAt, isTop, isMuted',
  messages: '++id, conversationId, timestamp',
  apiProfiles: '++id, name, createdAt',
  userPersonas: '++id, name, createdAt',
  stickers: '++id, name, libraryId, createdAt',
  stickerLibraries: '++id, name, createdAt',
  assets: 'key'
});

db.version(7).stores({
  roles: '++id, name, createdAt, updatedAt',
  conversations: '++id, roleId, updatedAt, isTop, isMuted',
  messages: '++id, conversationId, timestamp',
  apiProfiles: '++id, name, createdAt',
  userPersonas: '++id, name, createdAt',
  stickers: '++id, name, libraryId, createdAt',
  stickerLibraries: '++id, name, createdAt',
  assets: 'key',
  walletAccounts: '++id, &[ownerType+ownerId], ownerType, ownerId, updatedAt',
  walletTransactions: '++id, conversationId, messageId, type, status, createdAt, updatedAt'
});

db.version(8).stores({
  roles: '++id, name, createdAt, updatedAt',
  conversations: '++id, roleId, updatedAt, isTop, isMuted',
  messages: '++id, conversationId, timestamp',
  apiProfiles: '++id, name, createdAt',
  userPersonas: '++id, name, createdAt',
  stickers: '++id, name, libraryId, createdAt',
  stickerLibraries: '++id, name, createdAt',
  assets: 'key',
  walletAccounts: '++id, &[ownerType+ownerId], ownerType, ownerId, updatedAt',
  walletTransactions: '++id, conversationId, messageId, type, status, createdAt, updatedAt',
  worldBookEntries: 'id, enabled, triggerType, priority, updatedAt'
});

db.version(9).stores({
  roles: '++id, name, createdAt, updatedAt',
  conversations: '++id, roleId, updatedAt, isTop, isMuted',
  messages: '++id, conversationId, timestamp',
  apiProfiles: '++id, name, createdAt',
  userPersonas: '++id, name, createdAt',
  stickers: '++id, name, libraryId, createdAt',
  stickerLibraries: '++id, name, createdAt',
  assets: 'key',
  walletAccounts: '++id, &[ownerType+ownerId], ownerType, ownerId, updatedAt',
  walletTransactions: '++id, conversationId, messageId, type, status, createdAt, updatedAt',
  worldBookEntries: 'id, enabled, triggerType, priority, updatedAt',
  diaries: '++id, authorType, roleId, dateKey, startAt, endAt, visibility, includeInContext, createdAt, updatedAt',
  diaryRoleLinks: '++id, diaryId, roleId',
  dailyMoods: 'dateKey, moodId, updatedAt'
});

db.version(10).stores({
  roles: '++id, name, createdAt, updatedAt',
  conversations: '++id, roleId, updatedAt, isTop, isMuted',
  messages: '++id, conversationId, timestamp',
  apiProfiles: '++id, name, createdAt',
  userPersonas: '++id, name, createdAt',
  stickers: '++id, name, libraryId, createdAt',
  stickerLibraries: '++id, name, createdAt',
  assets: 'key',
  walletAccounts: '++id, &[ownerType+ownerId], ownerType, ownerId, updatedAt',
  walletTransactions: '++id, conversationId, messageId, type, status, createdAt, updatedAt',
  worldBookEntries: 'id, enabled, triggerType, priority, updatedAt',
  diaries: '++id, authorType, roleId, dateKey, startAt, endAt, visibility, includeInContext, createdAt, updatedAt',
  diaryRoleLinks: '++id, diaryId, roleId',
  dailyMoods: 'dateKey, moodId, updatedAt'
}).upgrade(tx => tx.table('roles').toCollection().modify(role => {
  if (!role.profile) role.profile = {};
}));

// v11: 结构化记忆与可恢复的上下文任务
export async function migrateHeartVoicesToMemories(tx) {
  const roles = await tx.table('roles').toArray();
  const memories = tx.table('memories');
  const now = Date.now();
  const rows = [];
  for (const role of roles) {
    const items = Array.isArray(role?.profile?.memoryItems) ? role.profile.memoryItems : [];
    for (const item of items) {
      if (item?.type !== 'heart_voice') continue;
      rows.push({
        id: `heart:${role.id}:${item.id}`,
        scopeType: 'role', scopeId: String(role.id), ownerRoleId: role.id,
        type: 'character_state',
        content: String(item.content || item?.data?.currentThought || item?.data?.currentStatus || '').trim(),
        keywords: [], importance: 2, confidence: 1, sourceMessageIds: [], sourceMissing: false,
        status: 'active', supersedesId: null, source: 'heart_voice',
        createdAt: Number(item.createdAt) || now, updatedAt: Number(item.createdAt) || now, lastAccessedAt: null
      });
    }
  }
  if (rows.length) await memories.bulkPut(rows);
}

db.version(11).stores({
  roles: '++id, name, createdAt, updatedAt',
  conversations: '++id, roleId, updatedAt, isTop, isMuted',
  messages: '++id, conversationId, timestamp',
  apiProfiles: '++id, name, createdAt',
  userPersonas: '++id, name, createdAt',
  stickers: '++id, name, libraryId, createdAt',
  stickerLibraries: '++id, name, createdAt',
  assets: 'key',
  walletAccounts: '++id, &[ownerType+ownerId], ownerType, ownerId, updatedAt',
  walletTransactions: '++id, conversationId, messageId, type, status, createdAt, updatedAt',
  worldBookEntries: 'id, enabled, triggerType, priority, updatedAt',
  diaries: '++id, authorType, roleId, dateKey, startAt, endAt, visibility, includeInContext, createdAt, updatedAt',
  diaryRoleLinks: '++id, diaryId, roleId',
  dailyMoods: 'dateKey, moodId, updatedAt',
  memories: 'id, scopeType, scopeId, ownerRoleId, type, status, updatedAt, *keywords',
  contextJobs: 'id, type, roleId, status, nextRetryAt, updatedAt'
}).upgrade(migrateHeartVoicesToMemories);

// 角色管理
const USER_OWNER = { ownerType: 'user', ownerId: 'self' };
const WALLET_TYPES = new Set(['redpacket', 'transfer']);

export const parseAmountToCents = (value) => {
  const text = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error('金额必须大于 0，且最多两位小数');
  }
  const [yuan, cents = ''] = text.split('.');
  const amountCents = Number(yuan) * 100 + Number(cents.padEnd(2, '0'));
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error('金额必须大于 0');
  }
  return amountCents;
};

export const formatCents = (amountCents = 0) => {
  const value = Math.max(0, Number(amountCents) || 0);
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
};

const ownerKey = (ownerType, ownerId) => [ownerType, String(ownerId)];

const makeWalletContent = (tx, overrides = {}) => JSON.stringify({
  transactionId: tx.id,
  type: tx.type,
  amountCents: tx.amountCents,
  note: tx.note || '',
  status: tx.status,
  failReason: tx.failReason || '',
  createdAt: tx.createdAt,
  claimedAt: tx.claimedAt || null,
  refundedAt: tx.refundedAt || null,
  ...overrides
});

const walletLastMessage = (type) => type === 'redpacket' ? '[红包]' : '[转账]';

const systemMessageTypes = new Set(['system', 'diary_notice']);
const contextMessageTypes = new Set(['text', 'image', 'sticker', 'redpacket', 'transfer']);

const messageLastText = (message) => {
  if (!message) return '';
  if (message.type === 'text' || message.type === 'system' || message.type === 'diary_notice') return message.content || '';
  return `[${message.type}]`;
};

const messageContentForContext = async (message) => {
  let content = message.content || '';
  let imageRef = null;
  if (WALLET_TYPES.has(message.type)) {
    content = await walletService.describeMessageForContext(message);
  } else if (message.type === 'image') {
    imageRef = content;
    content = '[图片]';
  } else if (message.type === 'sticker') {
    content = '[表情]';
  } else if (message.audioUrl && content) {
    content = `[语音:${content}]`;
  }

  if (!message.replyTo) return { ...message, content, imageRef };
  const reply = message.replyTo;
  const author = reply.role === 'user' ? '用户' : '角色';
  const quoted = String(reply.content || '').replace(/\s+/g, ' ').slice(0, 80);
  return {
    ...message,
    content: `[回复 ${author}: ${quoted}]\n${content}`,
    imageRef
  };
};

const refreshConversationLastMessage = async (conversationId) => {
  const messages = await db.messages.where('conversationId').equals(conversationId).toArray();
  messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const last = messages[messages.length - 1];
  await conversationService.update(conversationId, {
    lastMessage: messageLastText(last),
    unread: 0
  });
};

const createWalletAccountInTx = async (ownerType, ownerId) => {
  const key = ownerKey(ownerType, ownerId);
  let account = await db.walletAccounts.where('[ownerType+ownerId]').equals(key).first();
  if (!account) {
    const now = Date.now();
    const id = await db.walletAccounts.add({
      ownerType,
      ownerId: String(ownerId),
      balanceCents: 0,
      createdAt: now,
      updatedAt: now
    });
    account = await db.walletAccounts.get(id);
  }
  return account;
};

const updateBalanceInTx = async (account, deltaCents) => {
  const balanceCents = (account.balanceCents || 0) + deltaCents;
  if (balanceCents < 0) throw new Error('余额不足');
  await db.walletAccounts.update(account.id, { balanceCents, updatedAt: Date.now() });
  return { ...account, balanceCents };
};

const addWalletMessageInTx = async (conversationId, role, content, type, timestamp) => {
  const message = { conversationId, role, content, type, audioUrl: null, timestamp };
  const id = await db.messages.add(message);
  await db.conversations.update(conversationId, {
    lastMessage: walletLastMessage(type),
    unread: role === 'assistant' ? 1 : 0,
    updatedAt: Date.now()
  });
  return { id, ...message };
};

export const roleService = {
  // 创建角色
  async create(roleData) {
    const now = Date.now();
    const role = {
      ...roleData,
      createdAt: now,
      updatedAt: now
    };
    const id = await db.roles.add(role);
    return { id, ...role };
  },

  // 获取所有角色
  async getAll() {
    return await db.roles.orderBy('updatedAt').reverse().toArray();
  },

  // 获取单个角色
  async getById(id) {
    return await db.roles.get(id);
  },

  // 更新角色
  async update(id, data) {
    const updates = {
      ...data,
      updatedAt: Date.now()
    };
    await db.roles.update(id, updates);
    return await db.roles.get(id);
  },

  // 删除角色
  async delete(id) {
    // 同时删除相关的会话和消息
    const conversations = await db.conversations.where('roleId').equals(id).toArray();
    for (const conv of conversations) {
      await db.messages.where('conversationId').equals(conv.id).delete();
    }
    await db.conversations.where('roleId').equals(id).delete();
    const roleDiaries = await db.diaries.where('roleId').equals(id).toArray();
    for (const diary of roleDiaries) {
      if (diary.authorType === 'role') {
        await db.diaryRoleLinks.where('diaryId').equals(diary.id).delete();
        await db.diaries.delete(diary.id);
      } else {
        await db.diaries.update(diary.id, { roleId: null, updatedAt: Date.now() });
      }
    }
    await db.diaryRoleLinks.where('roleId').equals(id).delete();
    await memoryService.archiveByRole(id);
    await contextJobService.cancelByRole(id);
    await db.roles.delete(id);
  }
};

// 会话管理
export const conversationService = {
  // 创建或获取会话
  async getOrCreate(roleId) {
    let conversation = await db.conversations.where('roleId').equals(roleId).first();
    if (!conversation) {
      const id = await db.conversations.add({
        roleId,
        lastMessage: '',
        unread: 0,
        updatedAt: Date.now()
      });
      conversation = await db.conversations.get(id);
    }
    return conversation;
  },

  // 获取所有会话（按更新时间排序）
  async getAll() {
    const conversations = await db.conversations.orderBy('updatedAt').reverse().toArray();
    // 关联角色信息
    const withRoles = await Promise.all(
      conversations.map(async (conv) => {
        const role = await db.roles.get(conv.roleId);
        return { ...conv, role };
      })
    );
    return withRoles;
  },

  // 更新会话
  async update(id, data) {
    const updates = {
      ...data,
      updatedAt: Date.now()
    };
    await db.conversations.update(id, updates);
  },

  // 标记为已读
  async markAsRead(id) {
    await db.conversations.update(id, { unread: 0 });
  },

  // 按 ID 获取会话
  async getById(id) {
    return await db.conversations.get(id);
  },

  // 删除会话
  async delete(id) {
    const removed = await db.messages.where('conversationId').equals(id).primaryKeys();
    await db.messages.where('conversationId').equals(id).delete();
    await memoryService.markSourcesMissing(removed);
    await contextJobService.cancelByConversationMessages(removed);
    await db.conversations.delete(id);
  },

  // 获取或创建短信专用会话（source:'sms'）
  async getOrCreateSms(roleId) {
    let conv = await db.conversations.where('roleId').equals(roleId).filter(c => c.source === 'sms').first();
    if (!conv) {
      const id = await db.conversations.add({ roleId, source: 'sms', lastMessage: '', unread: 0, updatedAt: Date.now() });
      conv = await db.conversations.get(id);
    }
    return conv;
  },

  // 获取所有短信会话（按更新时间排序，关联角色）
  async getAllSms() {
    const convs = await db.conversations.filter(c => c.source === 'sms').toArray();
    convs.sort((a, b) => b.updatedAt - a.updatedAt);
    return Promise.all(convs.map(async c => ({ ...c, role: await db.roles.get(c.roleId) })));
  }
};

// 消息管理
export const messageService = {
  async getById(id) {
    return await db.messages.get(Number(id));
  },

  // 创建消息
  async create(conversationId, role, content, type = 'text', audioUrl = null, extra = {}) {
    const message = {
      conversationId,
      role,
      content,
      type,
      audioUrl,
      timestamp: Date.now(),
      ...extra
    };
    const id = await db.messages.add(message);

    // 更新会话最后消息
    await conversationService.update(conversationId, {
      lastMessage: messageLastText(message),
      unread: role === 'assistant' ? 1 : 0
    });

    return { id, ...message };
  },

  // 获取会话的所有消息
  async getByConversation(conversationId) {
    return await db.messages
      .where('conversationId')
      .equals(conversationId)
      .sortBy('timestamp');
  },

  // 获取最近N轮对话（用于上下文）
  async getContext(conversationId, rounds = 15) {
    const messages = await db.messages
      .where('conversationId')
      .equals(conversationId)
      .reverse()
      .limit(rounds * 2)
      .toArray();

    return messages.reverse();
  },

  // 合并微信+短信上下文，按时间排序，取最近N轮
  async getCombinedContext(roleId, rounds = 15) {
    const chatConv = await db.conversations.where('roleId').equals(roleId).filter(c => !c.source).first();
    const smsConv = await db.conversations.where('roleId').equals(roleId).filter(c => c.source === 'sms').first();
    const msgs = [];
    if (chatConv) msgs.push(...await db.messages.where('conversationId').equals(chatConv.id).toArray());
    if (smsConv) msgs.push(...await db.messages.where('conversationId').equals(smsConv.id).toArray());
    msgs.sort((a, b) => a.timestamp - b.timestamp);
    const recent = msgs.filter(msg => contextMessageTypes.has(msg.type) && !systemMessageTypes.has(msg.type)).slice(-rounds * 2);
    return await Promise.all(recent.map(messageContentForContext));
  },

  // 读取角色跨渠道的有效消息。保留 conversationId/source，供完整轮次、任务游标和未来群聊使用。
  async getContextMessagesByRole(roleId, { beforeTimestamp = Infinity, limit = Infinity } = {}) {
    const conversations = await db.conversations.where('roleId').equals(Number(roleId)).toArray();
    const sourceById = new Map(conversations.map(conv => [conv.id, conv.source === 'sms' ? 'sms' : 'wechat']));
    const rows = [];
    for (const conv of conversations) {
      const chunk = await db.messages.where('conversationId').equals(conv.id).toArray();
      rows.push(...chunk
        .filter(msg => msg.timestamp < beforeTimestamp && contextMessageTypes.has(msg.type) && !systemMessageTypes.has(msg.type))
        .map(msg => ({ ...msg, channel: sourceById.get(msg.conversationId) })));
    }
    rows.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0) || Number(a.id) - Number(b.id));
    const selected = Number.isFinite(limit) ? rows.slice(-Math.max(0, limit)) : rows;
    return await Promise.all(selected.map(messageContentForContext));
  },

  async getByRoleTimeRange(roleId, startAt, endAt) {
    const convs = await db.conversations.where('roleId').equals(roleId).toArray();
    const ids = convs.map(conv => conv.id);
    const msgs = [];
    for (const id of ids) {
      const chunk = await db.messages
        .where('conversationId')
        .equals(id)
        .filter(msg => msg.timestamp >= startAt && msg.timestamp <= endAt && contextMessageTypes.has(msg.type) && !systemMessageTypes.has(msg.type))
        .toArray();
      msgs.push(...chunk);
    }
    msgs.sort((a, b) => a.timestamp - b.timestamp);
    return await Promise.all(msgs.map(messageContentForContext));
  },

  // 删除消息
  async delete(id) {
    const message = await db.messages.get(id);
    await db.messages.delete(id);
    if (message) await memoryService.markSourcesMissing([message.id]);
    if (message?.conversationId) await refreshConversationLastMessage(message.conversationId);
  },

  async deleteMany(ids = []) {
    const cleanIds = [...new Set(ids.map(Number).filter(Number.isFinite))];
    if (cleanIds.length === 0) return;
    const messages = await db.messages.bulkGet(cleanIds);
    const conversationIds = [...new Set(messages.filter(Boolean).map(msg => msg.conversationId))];
    await db.messages.bulkDelete(cleanIds);
    await memoryService.markSourcesMissing(cleanIds);
    for (const conversationId of conversationIds) {
      await refreshConversationLastMessage(conversationId);
    }
  },

  async withdraw(id, notice, extra = {}) {
    const original = await db.messages.get(id);
    if (!original) return null;
    const updates = {
      role: 'system',
      type: 'system',
      content: notice,
      audioUrl: null,
      withdrawnAt: Date.now(),
      withdrawnRole: original.role,
      withdrawnType: original.type,
      withdrawnContent: original.content,
      ...extra
    };
    await db.messages.update(id, updates);
    await refreshConversationLastMessage(original.conversationId);
    return await db.messages.get(id);
  },

  // 更新消息
  async update(id, updates) {
    await db.messages.update(id, updates);
  },

  // 清空会话消息
  async clearConversation(conversationId) {
    const removed = await db.messages.where('conversationId').equals(conversationId).primaryKeys();
    await db.messages.where('conversationId').equals(conversationId).delete();
    await memoryService.markSourcesMissing(removed);
    await contextJobService.cancelByConversationMessages(removed);
    await conversationService.update(conversationId, {
      lastMessage: '',
      unread: 0
    });
  }
};

// API 方案管理
// 钱包和红包/转账
export const walletService = {
  async getOrCreateAccount(ownerType, ownerId) {
    return await db.transaction('rw', db.walletAccounts, async () => {
      return await createWalletAccountInTx(ownerType, ownerId);
    });
  },

  async getUserBalance() {
    const account = await this.getOrCreateAccount(USER_OWNER.ownerType, USER_OWNER.ownerId);
    return account.balanceCents || 0;
  },

  async adjustUserBalance(amountCents, note = '本地充值') {
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('充值金额无效');
    return await db.transaction('rw', db.walletAccounts, db.walletTransactions, async () => {
      const account = await createWalletAccountInTx(USER_OWNER.ownerType, USER_OWNER.ownerId);
      const updated = await updateBalanceInTx(account, amountCents);
      const now = Date.now();
      await db.walletTransactions.add({
        type: 'adjustment',
        amountCents,
        note,
        status: 'done',
        senderType: 'system',
        senderId: 'system',
        receiverType: USER_OWNER.ownerType,
        receiverId: USER_OWNER.ownerId,
        createdAt: now,
        updatedAt: now
      });
      return updated.balanceCents;
    });
  },

  async createOutgoing({ conversationId, roleId, type, amountCents, note = '' }) {
    if (!WALLET_TYPES.has(type)) throw new Error('钱包消息类型无效');
    return await db.transaction('rw', db.walletAccounts, db.walletTransactions, db.messages, db.conversations, async () => {
      const now = Date.now();
      const sender = await createWalletAccountInTx(USER_OWNER.ownerType, USER_OWNER.ownerId);
      const receiver = await createWalletAccountInTx('role', roleId);
      await updateBalanceInTx(sender, -amountCents);
      await updateBalanceInTx(receiver, amountCents);

      const txId = await db.walletTransactions.add({
        conversationId,
        messageId: null,
        type,
        amountCents,
        note,
        status: 'claimed',
        senderType: USER_OWNER.ownerType,
        senderId: USER_OWNER.ownerId,
        receiverType: 'role',
        receiverId: String(roleId),
        createdAt: now,
        claimedAt: now,
        refundedAt: null,
        updatedAt: now
      });
      const tx = await db.walletTransactions.get(txId);
      const message = await addWalletMessageInTx(conversationId, 'user', makeWalletContent(tx), type, now);
      await db.walletTransactions.update(txId, { messageId: message.id, updatedAt: Date.now() });
      return message;
    });
  },

  async createIncoming({ conversationId, roleId, type, amountCents, note = '' }) {
    if (!WALLET_TYPES.has(type)) throw new Error('钱包消息类型无效');
    return await db.transaction('rw', db.walletAccounts, db.walletTransactions, db.messages, db.conversations, async () => {
      const now = Date.now();
      let sender = await createWalletAccountInTx('role', roleId);
      await createWalletAccountInTx(USER_OWNER.ownerType, USER_OWNER.ownerId);

      if ((sender.balanceCents || 0) < amountCents) {
        const grantCents = amountCents - (sender.balanceCents || 0);
        await updateBalanceInTx(sender, grantCents);
        await db.walletTransactions.add({
          conversationId,
          messageId: null,
          type: 'system_grant',
          amountCents: grantCents,
          note: '角色生成转账资金',
          status: 'done',
          senderType: 'system',
          senderId: 'system',
          receiverType: 'role',
          receiverId: String(roleId),
          createdAt: now,
          updatedAt: now
        });
        sender = await db.walletAccounts.get(sender.id);
      }

      await updateBalanceInTx(sender, -amountCents);
      const txId = await db.walletTransactions.add({
        conversationId,
        messageId: null,
        type,
        amountCents,
        note,
        status: 'pending',
        senderType: 'role',
        senderId: String(roleId),
        receiverType: USER_OWNER.ownerType,
        receiverId: USER_OWNER.ownerId,
        createdAt: now,
        claimedAt: null,
        refundedAt: null,
        updatedAt: now
      });
      const tx = await db.walletTransactions.get(txId);
      const message = await addWalletMessageInTx(conversationId, 'assistant', makeWalletContent(tx), type, now);
      await db.walletTransactions.update(txId, { messageId: message.id, updatedAt: Date.now() });
      return message;
    });
  },

  parseMessageContent(content) {
    try {
      return JSON.parse(content || '{}');
    } catch {
      return {};
    }
  },

  async getTransactionFromMessage(message) {
    const cached = this.parseMessageContent(message.content);
    if (!cached.transactionId) return null;
    return await db.walletTransactions.get(cached.transactionId);
  },

  async syncMessageContent(messageId) {
    const message = await db.messages.get(messageId);
    if (!message || !WALLET_TYPES.has(message.type)) return null;
    const tx = await this.getTransactionFromMessage(message);
    if (!tx) return message;
    const content = makeWalletContent(tx);
    await db.messages.update(messageId, { content });
    return { ...message, content };
  },

  async claim(messageId) {
    return await db.transaction('rw', db.walletAccounts, db.walletTransactions, db.messages, async () => {
      const message = await db.messages.get(messageId);
      if (!message || !WALLET_TYPES.has(message.type)) throw new Error('钱包消息不存在');
      const tx = await this.getTransactionFromMessage(message);
      if (!tx || tx.status !== 'pending') throw new Error('该消息已处理');

      const receiver = await createWalletAccountInTx(tx.receiverType, tx.receiverId);
      await updateBalanceInTx(receiver, tx.amountCents);
      const now = Date.now();
      const updates = { status: 'claimed', claimedAt: now, updatedAt: now };
      await db.walletTransactions.update(tx.id, updates);
      const updatedTx = { ...tx, ...updates };
      await db.messages.update(messageId, { content: makeWalletContent(updatedTx) });
      return updatedTx;
    });
  },

  async refund(messageId) {
    return await db.transaction('rw', db.walletAccounts, db.walletTransactions, db.messages, async () => {
      const message = await db.messages.get(messageId);
      if (!message || message.type !== 'transfer') throw new Error('只能退回转账');
      const tx = await this.getTransactionFromMessage(message);
      if (!tx || tx.status !== 'pending') throw new Error('该转账已处理');

      const sender = await createWalletAccountInTx(tx.senderType, tx.senderId);
      await updateBalanceInTx(sender, tx.amountCents);
      const now = Date.now();
      const updates = { status: 'refunded', refundedAt: now, updatedAt: now };
      await db.walletTransactions.update(tx.id, updates);
      const updatedTx = { ...tx, ...updates };
      await db.messages.update(messageId, { content: makeWalletContent(updatedTx) });
      return updatedTx;
    });
  },

  async describeMessageForContext(message) {
    const cached = this.parseMessageContent(message.content);
    const tx = cached.transactionId ? await db.walletTransactions.get(cached.transactionId) : cached;
    if (!tx) return message.type === 'redpacket' ? '[红包]' : '[转账]';
    const typeLabel = message.type === 'redpacket' ? '红包' : '转账';
    const sender = message.role === 'user' ? '用户' : '你';
    const receiver = message.role === 'user' ? '你' : '用户';
    const statusMap = { pending: '待领取', claimed: '已领取', refunded: '已退回' };
    const amountText = message.type === 'redpacket' && tx.status === 'pending'
      ? '金额未显示'
      : `${formatCents(tx.amountCents)} 元`;
    const note = tx.note ? `，备注：${tx.note}` : '';
    return `${sender}给${receiver}发了一笔${typeLabel}，${amountText}，状态：${statusMap[tx.status] || tx.status}${note}`;
  }
};

export const apiProfileService = {
  async getAll() {
    return await db.apiProfiles.orderBy('createdAt').toArray();
  },
  async getById(id) {
    return await db.apiProfiles.get(id);
  },
  async create(data) {
    const now = Date.now();
    const id = await db.apiProfiles.add({ ...data, createdAt: now, updatedAt: now });
    return await db.apiProfiles.get(id);
  },
  async update(id, data) {
    await db.apiProfiles.update(id, { ...data, updatedAt: Date.now() });
    return await db.apiProfiles.get(id);
  },
  async delete(id) {
    await db.apiProfiles.delete(id);
  }
};

// 用户人设卡管理
export const personaService = {
  async getAll() {
    return await db.userPersonas.orderBy('createdAt').reverse().toArray();
  },
  async getById(id) {
    return await db.userPersonas.get(id);
  },
  async create(data) {
    const now = Date.now();
    const id = await db.userPersonas.add({ ...data, createdAt: now });
    return await db.userPersonas.get(id);
  },
  async update(id, data) {
    await db.userPersonas.update(id, data);
    return await db.userPersonas.get(id);
  },
  async delete(id) {
    await db.userPersonas.delete(id);
  }
};

// 表情包管理
const normalizeLibraryId = (libraryId) => {
  const numericId = Number(libraryId);
  return Number.isFinite(numericId) ? numericId : libraryId;
};

export const stickerService = {
  async getAll() {
    return await db.stickers.orderBy('createdAt').reverse().toArray();
  },
  async getByLibrary(libraryId) {
    const normalizedId = normalizeLibraryId(libraryId);
    const stickers = await db.stickers.toArray();
    return stickers
      .filter(sticker => normalizeLibraryId(sticker.libraryId) === normalizedId)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
  async getById(id) {
    return await db.stickers.get(id);
  },
  async create(data) {
    const now = Date.now();
    const id = await db.stickers.add({ ...data, libraryId: normalizeLibraryId(data.libraryId), createdAt: now });
    return await db.stickers.get(id);
  },
  async update(id, data) {
    const updates = { ...data };
    if (Object.prototype.hasOwnProperty.call(updates, 'libraryId')) {
      updates.libraryId = normalizeLibraryId(updates.libraryId);
    }
    await db.stickers.update(id, updates);
    return await db.stickers.get(id);
  },
  async delete(id) {
    await db.stickers.delete(id);
  }
};

// 表情包库管理
export const stickerLibraryService = {
  async getAll() {
    return await db.stickerLibraries.orderBy('createdAt').reverse().toArray();
  },
  async getById(id) {
    return await db.stickerLibraries.get(id);
  },
  async create(data) {
    const now = Date.now();
    const id = await db.stickerLibraries.add({ ...data, createdAt: now });
    return await db.stickerLibraries.get(id);
  },
  async update(id, data) {
    await db.stickerLibraries.update(id, data);
    return await db.stickerLibraries.get(id);
  },
  async delete(id) {
    // 删除库时同时删除库中的所有表情包
    const stickers = await stickerService.getByLibrary(id);
    if (stickers.length > 0) await db.stickers.bulkDelete(stickers.map(sticker => sticker.id));
    await db.stickerLibraries.delete(id);
  }
};

// 世界书管理
const normalizeWorldBookEntry = (data = {}, existing = null) => {
  const now = new Date().toISOString();
  const triggerType = data.triggerType === 'keyword' ? 'keyword' : 'always';
  const keywords = Array.isArray(data.keywords)
    ? data.keywords.map(item => String(item).trim()).filter(Boolean)
    : String(data.keywords || '').split(/[,，\n]/).map(item => item.trim()).filter(Boolean);

  return {
    id: existing?.id || data.id || `wb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: String(data.title || '').trim() || '未命名条目',
    enabled: data.enabled ?? true,
    triggerType,
    keywords: triggerType === 'keyword' ? keywords : [],
    content: String(data.content || '').trim(),
    priority: Number.isFinite(Number(data.priority)) ? Number(data.priority) : 50,
    position: ['before_user', 'after_system', 'before_assistant'].includes(data.position) ? data.position : 'after_system',
    createdAt: existing?.createdAt || data.createdAt || now,
    updatedAt: now
  };
};

export const worldBookEntryService = {
  normalize(entry, existing = null) {
    return normalizeWorldBookEntry(entry, existing);
  },

  normalizeImport(rawEntries = []) {
    const skipped = [];
    const entries = [];

    rawEntries.forEach((raw, index) => {
      const entry = normalizeWorldBookEntry(raw);
      if (!entry.content) {
        skipped.push({ index, title: entry.title, reason: 'content 为空' });
        return;
      }
      if (entry.triggerType === 'keyword' && entry.keywords.length === 0) {
        skipped.push({ index, title: entry.title, reason: 'keyword 条目缺少关键词' });
        return;
      }
      entries.push(entry);
    });

    return { entries, skipped };
  },

  async getAll() {
    const entries = await db.worldBookEntries.orderBy('updatedAt').reverse().toArray();
    return entries.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  },

  async create(data) {
    const entry = normalizeWorldBookEntry(data);
    if (!entry.content) throw new Error('内容不能为空');
    if (entry.triggerType === 'keyword' && entry.keywords.length === 0) throw new Error('关键词触发条目需要至少一个关键词');
    await db.worldBookEntries.add(entry);
    return entry;
  },

  async update(id, data) {
    const existing = await db.worldBookEntries.get(id);
    if (!existing) throw new Error('世界书条目不存在');
    const entry = normalizeWorldBookEntry({ ...existing, ...data, id }, existing);
    if (!entry.content) throw new Error('内容不能为空');
    if (entry.triggerType === 'keyword' && entry.keywords.length === 0) throw new Error('关键词触发条目需要至少一个关键词');
    await db.worldBookEntries.put(entry);
    return entry;
  },

  async delete(id) {
    await db.worldBookEntries.delete(id);
  },

  async importEntries(rawEntries = []) {
    const result = this.normalizeImport(rawEntries);
    if (result.entries.length > 0) {
      await db.worldBookEntries.bulkPut(result.entries);
    }
    return result;
  },

  async exportData() {
    return {
      type: 'world_book',
      version: 1,
      exported_at: new Date().toISOString(),
      entries: await this.getAll()
    };
  }
};

// 日记和每日心情管理
const normalizeRoleIds = (roleIds = []) => {
  const ids = Array.isArray(roleIds) ? roleIds : [roleIds];
  return [...new Set(ids.map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0))];
};

const toLocalDateKey = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayDateKey = () => toLocalDateKey();

const normalizeDiary = (data = {}, existing = null) => {
  const now = Date.now();
  const authorType = data.authorType === 'role' ? 'role' : 'user';
  const linkedRoleIds = normalizeRoleIds(data.linkedRoleIds ?? data.visibleRoleIds ?? []);
  const primaryRoleId = Number(data.roleId || linkedRoleIds[0]) || null;
  const visibility = data.visibility === 'role_visible' ? 'role_visible' : 'private';

  return {
    authorType,
    roleId: authorType === 'role' ? primaryRoleId : (visibility === 'role_visible' ? primaryRoleId : null),
    conversationId: data.conversationId ?? existing?.conversationId ?? null,
    title: String(data.title || '').trim() || '未命名日记',
    content: String(data.content || '').trim(),
    moodId: data.moodId || existing?.moodId || '',
    visibility,
    includeInContext: !!data.includeInContext && visibility === 'role_visible',
    aiReview: data.aiReview ?? existing?.aiReview ?? '',
    aiReviewRoleId: data.aiReviewRoleId ?? existing?.aiReviewRoleId ?? null,
    aiReviewedAt: data.aiReviewedAt ?? existing?.aiReviewedAt ?? null,
    dateKey: data.dateKey || existing?.dateKey || todayDateKey(),
    startAt: data.startAt ?? existing?.startAt ?? null,
    endAt: data.endAt ?? existing?.endAt ?? null,
    source: data.source || existing?.source || 'manual',
    summary: data.summary ?? existing?.summary ?? '',
    createdAt: existing?.createdAt || data.createdAt || now,
    updatedAt: now
  };
};

const attachDiaryRoleIds = async (diary) => {
  if (!diary) return diary;
  const links = await db.diaryRoleLinks.where('diaryId').equals(diary.id).toArray();
  return {
    ...diary,
    linkedRoleIds: links.map(link => Number(link.roleId)).filter(Boolean)
  };
};

const syncDiaryRoleLinks = async (diaryId, roleIds = []) => {
  await db.diaryRoleLinks.where('diaryId').equals(diaryId).delete();
  const rows = normalizeRoleIds(roleIds).map(roleId => ({ diaryId, roleId }));
  if (rows.length > 0) await db.diaryRoleLinks.bulkAdd(rows);
};

export const diaryService = {
  async create(data) {
    const linkedRoleIds = normalizeRoleIds(data.linkedRoleIds ?? data.visibleRoleIds ?? []);
    const entry = normalizeDiary(data);
    if (!entry.content) throw new Error('日记正文不能为空');

    return await db.transaction('rw', db.diaries, db.diaryRoleLinks, async () => {
      const id = await db.diaries.add(entry);
      if (entry.authorType === 'role' && entry.roleId) {
        await syncDiaryRoleLinks(id, [entry.roleId]);
      } else if (entry.visibility === 'role_visible') {
        await syncDiaryRoleLinks(id, linkedRoleIds);
      }
      return await attachDiaryRoleIds(await db.diaries.get(id));
    });
  },

  async update(id, data) {
    const existing = await db.diaries.get(id);
    if (!existing) throw new Error('日记不存在');
    const linkedRoleIds = normalizeRoleIds(data.linkedRoleIds ?? data.visibleRoleIds ?? existing.linkedRoleIds ?? []);
    const entry = normalizeDiary({ ...existing, ...data }, existing);
    if (!entry.content) throw new Error('日记正文不能为空');

    return await db.transaction('rw', db.diaries, db.diaryRoleLinks, async () => {
      await db.diaries.update(id, entry);
      if (entry.authorType === 'role' && entry.roleId) {
        await syncDiaryRoleLinks(id, [entry.roleId]);
      } else if (entry.visibility === 'role_visible') {
        await syncDiaryRoleLinks(id, linkedRoleIds);
      } else {
        await syncDiaryRoleLinks(id, []);
      }
      return await attachDiaryRoleIds(await db.diaries.get(id));
    });
  },

  async delete(id) {
    await db.transaction('rw', db.diaries, db.diaryRoleLinks, async () => {
      await db.diaryRoleLinks.where('diaryId').equals(id).delete();
      await db.diaries.delete(id);
    });
  },

  async getById(id) {
    return await attachDiaryRoleIds(await db.diaries.get(id));
  },

  async getAll() {
    const diaries = await db.diaries.orderBy('updatedAt').reverse().toArray();
    return await Promise.all(diaries.map(attachDiaryRoleIds));
  },

  async getByDateKey(dateKey) {
    const diaries = await db.diaries.where('dateKey').equals(dateKey).toArray();
    diaries.sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(diaries.map(attachDiaryRoleIds));
  },

  async getByMonth(monthKey) {
    const start = `${monthKey}-01`;
    const [year, month] = monthKey.split('-').map(Number);
    const end = toLocalDateKey(new Date(year, month, 0));
    const diaries = await db.diaries.where('dateKey').between(start, end, true, true).toArray();
    diaries.sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(diaries.map(attachDiaryRoleIds));
  },

  async getForRole(roleId) {
    const numericRoleId = Number(roleId);
    const direct = await db.diaries.where('roleId').equals(numericRoleId).toArray();
    const links = await db.diaryRoleLinks.where('roleId').equals(numericRoleId).toArray();
    const linked = links.length > 0
      ? await db.diaries.bulkGet(links.map(link => link.diaryId))
      : [];
    const byId = new Map([...direct, ...linked.filter(Boolean)].map(entry => [entry.id, entry]));
    const diaries = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(diaries.map(attachDiaryRoleIds));
  },

  async getVisibleContextForRole(roleId, limit = 3) {
    const diaries = await this.getForRole(roleId);
    return diaries
      .filter(entry => entry.includeInContext && (entry.authorType === 'role' || entry.visibility === 'role_visible'))
      .slice(0, Math.max(0, Number(limit) || 0));
  }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
const memoryId = () => globalThis.crypto?.randomUUID?.() || `memory_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const normalizeMemory = (input = {}) => {
  const now = Date.now();
  return {
    id: input.id || memoryId(),
    scopeType: input.scopeType === 'conversation' ? 'conversation' : 'role',
    scopeId: String(input.scopeId ?? input.ownerRoleId ?? ''),
    ownerRoleId: Number(input.ownerRoleId),
    type: input.type || 'user_fact',
    content: String(input.content || '').trim(),
    keywords: [...new Set((Array.isArray(input.keywords) ? input.keywords : []).map(value => String(value).trim().toLowerCase()).filter(Boolean))].slice(0, 20),
    importance: clamp(input.importance || 3, 1, 5),
    confidence: clamp(input.confidence ?? 0.5, 0, 1),
    sourceMessageIds: [...new Set((input.sourceMessageIds || []).map(Number).filter(Number.isFinite))],
    sourceMissing: Boolean(input.sourceMissing),
    status: ['active', 'pending', 'superseded', 'archived'].includes(input.status) ? input.status : 'pending',
    supersedesId: input.supersedesId || null,
    conflictWithId: input.conflictWithId || null,
    source: input.source || 'auto',
    createdAt: Number(input.createdAt) || now,
    updatedAt: Number(input.updatedAt) || now,
    lastAccessedAt: Number(input.lastAccessedAt) || null
  };
};

const tokenizeMemoryText = (value) => {
  const text = String(value || '').toLowerCase();
  const latin = text.match(/[a-z0-9_]{2,}/g) || [];
  const cjk = (text.match(/[\u3400-\u9fff]+/g) || []).flatMap(block => {
    if (block.length < 2) return [block];
    return Array.from({ length: block.length - 1 }, (_, index) => block.slice(index, index + 2));
  });
  return new Set([...latin, ...cjk]);
};

export const memoryService = {
  normalize: normalizeMemory,

  async create(input) {
    const row = normalizeMemory(input);
    if (!row.content || !Number.isFinite(row.ownerRoleId)) throw new Error('记忆内容或角色无效');
    await db.memories.put(row);
    return row;
  },

  async get(id) {
    return await db.memories.get(id);
  },

  async listByRole(roleId, { status } = {}) {
    let rows = await db.memories.where('ownerRoleId').equals(Number(roleId)).toArray();
    if (status) rows = rows.filter(row => row.status === status);
    return rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  async retrieveForRole(roleId, query, limit = 5) {
    const rows = await this.listByRole(roleId, { status: 'active' });
    const queryTokens = tokenizeMemoryText(query);
    const now = Date.now();
    const scored = rows.map(row => {
      const rowTokens = tokenizeMemoryText(`${row.content} ${(row.keywords || []).join(' ')}`);
      let matches = 0;
      queryTokens.forEach(token => { if (rowTokens.has(token)) matches += 1; });
      const keywordScore = queryTokens.size ? matches / Math.max(1, queryTokens.size) : 0;
      const ageDays = Math.max(0, (now - (row.updatedAt || now)) / 86400000);
      const recency = 1 / (1 + ageDays / 30);
      return { row, score: keywordScore * 6 + (row.importance || 3) * 0.8 + (row.confidence || 0.5) * 1.5 + recency * 0.5 };
    }).sort((a, b) => b.score - a.score).slice(0, Math.min(5, Math.max(0, limit)));
    const selected = scored.map(item => item.row);
    if (selected.length) {
      await db.transaction('rw', db.memories, async () => {
        await Promise.all(selected.map(row => db.memories.update(row.id, { lastAccessedAt: now })));
      });
    }
    return selected;
  },

  async update(id, changes) {
    await db.memories.update(id, { ...changes, updatedAt: Date.now() });
    return await db.memories.get(id);
  },

  async accept(id, { content, replace = false } = {}) {
    return await db.transaction('rw', db.memories, async () => {
      const row = await db.memories.get(id);
      if (!row) throw new Error('记忆不存在');
      if (replace && row.conflictWithId) {
        await db.memories.update(row.conflictWithId, { status: 'superseded', updatedAt: Date.now() });
      }
      await db.memories.update(id, {
        content: String(content ?? row.content).trim(),
        status: 'active',
        supersedesId: replace ? row.conflictWithId || null : null,
        updatedAt: Date.now()
      });
      return await db.memories.get(id);
    });
  },

  async archive(id) {
    return await this.update(id, { status: 'archived' });
  },

  async archiveByRole(roleId) {
    await db.memories.where('ownerRoleId').equals(Number(roleId)).modify({ status: 'archived', updatedAt: Date.now() });
  },

  async markSourcesMissing(messageIds = []) {
    const removed = new Set(messageIds.map(Number));
    if (!removed.size || !db.memories) return;
    await db.memories.toCollection().modify(row => {
      const sources = Array.isArray(row.sourceMessageIds) ? row.sourceMessageIds : [];
      if (!sources.some(id => removed.has(Number(id)))) return;
      const remaining = sources.filter(id => !removed.has(Number(id)));
      row.sourceMessageIds = remaining;
      row.sourceMissing = true;
      row.updatedAt = Date.now();
      if (!remaining.length) row.status = 'pending';
    });
  }
};

export const contextJobService = {
  async put(job) {
    const now = Date.now();
    const row = {
      attempts: 0,
      nextRetryAt: now,
      errorCode: null,
      createdAt: now,
      updatedAt: now,
      ...job
    };
    await db.contextJobs.put(row);
    return row;
  },

  async get(id) {
    return await db.contextJobs.get(id);
  },

  async listRunnable(now = Date.now()) {
    return (await db.contextJobs.toArray())
      .filter(job => ['pending', 'failed'].includes(job.status) && (job.attempts || 0) < 3 && (job.nextRetryAt || 0) <= now)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  },

  async update(id, changes) {
    await db.contextJobs.update(id, { ...changes, updatedAt: Date.now() });
    return await db.contextJobs.get(id);
  },

  async listByRole(roleId) {
    return await db.contextJobs.where('roleId').equals(Number(roleId)).reverse().sortBy('updatedAt');
  },

  async cancelByConversationMessages(messageIds = []) {
    const removed = new Set(messageIds.map(Number));
    if (!removed.size || !db.contextJobs) return;
    await db.contextJobs.toCollection().modify(job => {
      if ((job.sourceMessageIds || []).some(id => removed.has(Number(id))) && !['done', 'cancelled'].includes(job.status)) {
        job.status = 'cancelled';
        job.errorCode = 'SOURCE_REMOVED';
        job.updatedAt = Date.now();
      }
    });
  },

  async cancelByRole(roleId) {
    await db.contextJobs.where('roleId').equals(Number(roleId)).modify({ status: 'cancelled', errorCode: 'ROLE_REMOVED', updatedAt: Date.now() });
  }
};

export const dailyMoodService = {
  async get(dateKey) {
    return await db.dailyMoods.get(dateKey);
  },

  async getByMonth(monthKey) {
    const start = `${monthKey}-01`;
    const [year, month] = monthKey.split('-').map(Number);
    const end = toLocalDateKey(new Date(year, month, 0));
    return await db.dailyMoods.where('dateKey').between(start, end, true, true).toArray();
  },

  async set(dateKey, moodId, note = '') {
    const now = Date.now();
    await db.dailyMoods.put({
      dateKey,
      moodId,
      note: String(note || '').trim(),
      updatedAt: now
    });
    return await db.dailyMoods.get(dateKey);
  },

  async remove(dateKey) {
    await db.dailyMoods.delete(dateKey);
  }
};

// 桌面资源（图片）管理
export const assetService = {
  async get(key) {
    const row = await db.assets.get(key);
    return row ? row.value : null;
  },
  async set(key, value) {
    await db.assets.put({ key, value });
  },
  async remove(key) {
    await db.assets.delete(key);
  }
};

export default db;
