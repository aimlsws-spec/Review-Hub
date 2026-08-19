import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Roles ──────────────────────────────────────────────────
  const roles = await Promise.all([
    prisma.role.upsert({ where: { slug: 'super-admin' }, update: {}, create: { name: 'Super Admin', slug: 'super-admin', description: 'Full platform access', isSystem: true } }),
    prisma.role.upsert({ where: { slug: 'admin' }, update: {}, create: { name: 'Admin', slug: 'admin', description: 'Platform administrator', isSystem: true } }),
    prisma.role.upsert({ where: { slug: 'merchant' }, update: {}, create: { name: 'Merchant', slug: 'merchant', description: 'Merchant account', isSystem: true } }),
    prisma.role.upsert({ where: { slug: 'user' }, update: {}, create: { name: 'User', slug: 'user', description: 'Regular platform user', isSystem: true } }),
  ]);
  const [superAdminRole, adminRole, merchantRole, userRole] = roles;
  console.log('✅ Roles seeded');

  // ── Permissions ────────────────────────────────────────────
  const permissionDefs = [
    { module: 'users', action: 'read' }, { module: 'users', action: 'write' }, { module: 'users', action: 'delete' },
    { module: 'merchants', action: 'read' }, { module: 'merchants', action: 'write' }, { module: 'merchants', action: 'approve' },
    { module: 'campaigns', action: 'read' }, { module: 'campaigns', action: 'write' }, { module: 'campaigns', action: 'approve' },
    { module: 'submissions', action: 'read' }, { module: 'submissions', action: 'review' },
    { module: 'withdrawals', action: 'read' }, { module: 'withdrawals', action: 'approve' },
    { module: 'reports', action: 'read' }, { module: 'reports', action: 'generate' },
    { module: 'settings', action: 'read' }, { module: 'settings', action: 'write' },
    { module: 'analytics', action: 'read' },
    { module: 'support', action: 'read' }, { module: 'support', action: 'write' },
  ];

  const permissions = await Promise.all(
    permissionDefs.map((p) =>
      prisma.permission.upsert({
        where: { slug: `${p.module}:${p.action}` },
        update: {},
        create: { module: p.module, action: p.action, name: `${p.module} ${p.action}`, slug: `${p.module}:${p.action}` },
      }),
    ),
  );
  console.log('✅ Permissions seeded');

  // ── Role Permissions ───────────────────────────────────────
  // Super Admin gets all permissions
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: perm.id },
    });
  }

  // Admin gets all except settings:write
  const adminPerms = permissions.filter((p) => p.slug !== 'settings:write');
  for (const perm of adminPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Merchant gets campaign + submission read/write
  const merchantPerms = permissions.filter((p) => ['campaigns:read', 'campaigns:write', 'submissions:read', 'analytics:read'].includes(p.slug));
  for (const perm of merchantPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: merchantRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: merchantRole.id, permissionId: perm.id },
    });
  }

  // User gets campaigns:read only
  const userPerms = permissions.filter((p) => p.slug === 'campaigns:read');
  for (const perm of userPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: userRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: userRole.id, permissionId: perm.id },
    });
  }
  console.log('✅ Role permissions seeded');

  // ── Super Admin User ───────────────────────────────────────
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@reviewhub.com' },
    update: {},
    create: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@reviewhub.com',
      passwordHash: await bcrypt.hash('SuperAdmin@123', 12),
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superAdminUser.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: superAdminUser.id, roleId: superAdminRole.id },
  });

  // ── Default Admin User ─────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@reviewhub.com' },
    update: {},
    create: {
      firstName: 'Platform',
      lastName: 'Admin',
      email: 'admin@reviewhub.com',
      passwordHash: await bcrypt.hash('Admin@123456', 12),
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
  console.log('✅ Admin users seeded');

  // ── Countries ──────────────────────────────────────────────
  const india = await prisma.country.upsert({ where: { code: 'IN' }, update: {}, create: { name: 'India', code: 'IN', dialCode: '+91' } });
  const usa = await prisma.country.upsert({ where: { code: 'US' }, update: {}, create: { name: 'United States', code: 'US', dialCode: '+1' } });
  await prisma.country.upsert({ where: { code: 'GB' }, update: {}, create: { name: 'United Kingdom', code: 'GB', dialCode: '+44' } });
  console.log('✅ Countries seeded');

  // ── States ─────────────────────────────────────────────────
  const maharashtra = await prisma.state.upsert({ where: { countryId_name: { countryId: india.id, name: 'Maharashtra' } }, update: {}, create: { countryId: india.id, name: 'Maharashtra', code: 'MH' } });
  const karnataka = await prisma.state.upsert({ where: { countryId_name: { countryId: india.id, name: 'Karnataka' } }, update: {}, create: { countryId: india.id, name: 'Karnataka', code: 'KA' } });
  const delhi = await prisma.state.upsert({ where: { countryId_name: { countryId: india.id, name: 'Delhi' } }, update: {}, create: { countryId: india.id, name: 'Delhi', code: 'DL' } });
  const california = await prisma.state.upsert({ where: { countryId_name: { countryId: usa.id, name: 'California' } }, update: {}, create: { countryId: usa.id, name: 'California', code: 'CA' } });
  console.log('✅ States seeded');

  // ── Cities ─────────────────────────────────────────────────
  await Promise.all([
    prisma.city.upsert({ where: { stateId_name: { stateId: maharashtra.id, name: 'Mumbai' } }, update: {}, create: { stateId: maharashtra.id, name: 'Mumbai' } }),
    prisma.city.upsert({ where: { stateId_name: { stateId: maharashtra.id, name: 'Pune' } }, update: {}, create: { stateId: maharashtra.id, name: 'Pune' } }),
    prisma.city.upsert({ where: { stateId_name: { stateId: karnataka.id, name: 'Bengaluru' } }, update: {}, create: { stateId: karnataka.id, name: 'Bengaluru' } }),
    prisma.city.upsert({ where: { stateId_name: { stateId: delhi.id, name: 'New Delhi' } }, update: {}, create: { stateId: delhi.id, name: 'New Delhi' } }),
    prisma.city.upsert({ where: { stateId_name: { stateId: california.id, name: 'San Francisco' } }, update: {}, create: { stateId: california.id, name: 'San Francisco' } }),
  ]);
  console.log('✅ Cities seeded');

  // ── Notification Templates ─────────────────────────────────
  const notifTemplates = [
    { name: 'Welcome Email', slug: 'welcome-email', subject: 'Welcome to ReviewHub!', title: 'Welcome, {{firstName}}!', body: 'Hi {{firstName}}, your account has been created successfully.', channel: 'EMAIL' as const },
    { name: 'OTP Verification', slug: 'otp-verification', subject: 'Your OTP Code', title: 'Verification Code', body: 'Your OTP is {{otp}}. Valid for {{expiryMinutes}} minutes.', channel: 'SMS' as const },
    { name: 'Campaign Approved', slug: 'campaign-approved', subject: 'Campaign Approved', title: 'Your campaign is live!', body: 'Campaign "{{campaignTitle}}" has been approved and is now live.', channel: 'EMAIL' as const },
    { name: 'Reward Credited', slug: 'reward-credited', subject: 'Reward Credited', title: '₹{{amount}} credited to your wallet', body: 'You earned ₹{{amount}} for completing "{{campaignTitle}}".', channel: 'PUSH' as const },
    { name: 'Withdrawal Processed', slug: 'withdrawal-processed', subject: 'Withdrawal Processed', title: 'Withdrawal of ₹{{amount}} processed', body: 'Your withdrawal request of ₹{{amount}} has been processed.', channel: 'EMAIL' as const },
  ];
  for (const t of notifTemplates) {
    await prisma.notificationTemplate.upsert({ where: { slug: t.slug }, update: {}, create: { ...t, variables: [] } });
  }
  console.log('✅ Notification templates seeded');

  // ── System Settings ────────────────────────────────────────
  const settings = [
    { key: 'platform.name', value: 'ReviewHub', dataType: 'STRING' as const, category: 'general', description: 'Platform display name', editable: false },
    { key: 'platform.commission_rate', value: '0.10', dataType: 'NUMBER' as const, category: 'finance', description: 'Default platform commission (10%)', editable: true },
    { key: 'withdrawal.minimum', value: '100', dataType: 'NUMBER' as const, category: 'finance', description: 'Minimum withdrawal amount in INR', editable: true },
    { key: 'withdrawal.maximum', value: '50000', dataType: 'NUMBER' as const, category: 'finance', description: 'Maximum withdrawal amount in INR', editable: true },
    { key: 'otp.expiry_minutes', value: '5', dataType: 'NUMBER' as const, category: 'auth', description: 'OTP expiry in minutes', editable: true },
    { key: 'otp.max_attempts', value: '3', dataType: 'NUMBER' as const, category: 'auth', description: 'Max OTP verification attempts', editable: true },
    { key: 'ai.confidence_threshold', value: '0.80', dataType: 'NUMBER' as const, category: 'ai', description: 'Minimum AI confidence to auto-approve', editable: true },
    { key: 'maintenance.mode', value: 'false', dataType: 'BOOLEAN' as const, category: 'system', description: 'Enable maintenance mode', editable: true },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({ where: { key: s.key }, update: {}, create: { key: s.key, value: s.value, dataType: s.dataType, category: s.category, description: s.description, editable: s.editable } });
  }
  console.log('✅ System settings seeded');

  // ── Feature Flags ──────────────────────────────────────────
  const flags = [
    { key: 'feature.referral_program', description: 'Enable referral program', enabled: true, rolloutPercentage: 100 },
    { key: 'feature.ai_verification', description: 'Enable AI-based submission verification', enabled: true, rolloutPercentage: 100 },
    { key: 'feature.two_factor_auth', description: 'Enable 2FA for users', enabled: true, rolloutPercentage: 100 },
    { key: 'feature.merchant_kyc', description: 'Require KYC for merchants', enabled: true, rolloutPercentage: 100 },
    { key: 'feature.auto_withdrawal', description: 'Enable automatic withdrawal processing', enabled: false, rolloutPercentage: 0 },
    { key: 'feature.social_login', description: 'Enable Google/Apple social login', enabled: true, rolloutPercentage: 100 },
  ];
  for (const f of flags) {
    await prisma.featureFlag.upsert({ where: { key: f.key }, update: {}, create: f });
  }
  console.log('✅ Feature flags seeded');

  // ── AI Providers ───────────────────────────────────────────
  const aiProviders = [
    { name: 'Ollama Local', provider: 'ollama', apiEndpoint: 'http://localhost:11434', model: 'llava', enabled: true, priority: 1, timeout: 30000 },
    { name: 'Amazon Bedrock', provider: 'bedrock', apiEndpoint: 'https://bedrock-runtime.us-east-1.amazonaws.com', model: 'anthropic.claude-3-sonnet-20240229-v1:0', enabled: false, priority: 2, timeout: 60000 },
    { name: 'OpenAI Compatible', provider: 'openai', apiEndpoint: 'https://api.openai.com/v1', model: 'gpt-4o', enabled: false, priority: 3, timeout: 30000 },
  ];
  for (const p of aiProviders) {
    await prisma.aIProvider.upsert({ where: { name: p.name }, update: {}, create: p });
  }
  console.log('✅ AI providers seeded');

  // ── Campaign Categories ────────────────────────────────────
  const categories = [
    { name: 'Social Media', slug: 'social-media', icon: '📱', color: '#3B82F6', sortOrder: 1 },
    { name: 'App Install', slug: 'app-install', icon: '📲', color: '#10B981', sortOrder: 2 },
    { name: 'Review & Rating', slug: 'review-rating', icon: '⭐', color: '#F59E0B', sortOrder: 3 },
    { name: 'Video Watch', slug: 'video-watch', icon: '🎬', color: '#EF4444', sortOrder: 4 },
    { name: 'Survey', slug: 'survey', icon: '📋', color: '#8B5CF6', sortOrder: 5 },
    { name: 'Referral', slug: 'referral', icon: '🤝', color: '#EC4899', sortOrder: 6 },
    { name: 'Website Visit', slug: 'website-visit', icon: '🌐', color: '#6366F1', sortOrder: 7 },
  ];
  for (const c of categories) {
    await prisma.campaignCategory.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  console.log('✅ Campaign categories seeded');

  // ── FAQ Categories (via FAQ records) ───────────────────────
  const faqs = [
    { category: 'Getting Started', question: 'How do I create an account?', answer: 'Download the app and sign up with your mobile number or email.', sortOrder: 1 },
    { category: 'Getting Started', question: 'Is ReviewHub free to use?', answer: 'Yes, ReviewHub is completely free for users.', sortOrder: 2 },
    { category: 'Campaigns', question: 'How do I join a campaign?', answer: 'Browse available campaigns and tap "Join" to participate.', sortOrder: 1 },
    { category: 'Campaigns', question: 'How long does campaign approval take?', answer: 'Campaigns are typically reviewed within 24-48 hours.', sortOrder: 2 },
    { category: 'Payments', question: 'How do I withdraw my earnings?', answer: 'Go to Wallet > Withdraw and add your bank account details.', sortOrder: 1 },
    { category: 'Payments', question: 'What is the minimum withdrawal amount?', answer: 'The minimum withdrawal amount is ₹100.', sortOrder: 2 },
  ];
  for (const f of faqs) {
    const existing = await prisma.fAQ.findFirst({ where: { category: f.category, question: f.question } });
    if (!existing) await prisma.fAQ.create({ data: f });
  }
  console.log('✅ FAQs seeded');

  // ── Platform Configuration ─────────────────────────────────
  const existingConfig = await prisma.platformConfiguration.findFirst();
  if (!existingConfig) {
    await prisma.platformConfiguration.create({
      data: {
        platformName: 'ReviewHub',
        supportEmail: 'support@reviewhub.com',
        supportPhone: '+91-9999999999',
        commissionPercentage: 0.10,
        minimumWithdrawal: 100,
        maximumWithdrawal: 50000,
        maintenanceMode: false,
        appVersion: '1.0.0',
        apiVersion: 'v1',
      },
    });
  }
  console.log('✅ Platform configuration seeded');

  console.log('\n🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
