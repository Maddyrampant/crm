import { config } from "dotenv";

config({ path: ".env.local" });

const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "مدیر سیستم";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@crm.dev";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";
const WORKSPACE_NAME = process.env.SEED_WORKSPACE_NAME ?? "ورک‌اسپیس پیش‌فرض";

async function seed() {
  const { eq } = await import("drizzle-orm");
  const { auth } = await import("../src/lib/auth");
  const { db } = await import("../src/db");
  const {
    companies,
    contacts,
    deals,
    pipelines,
    stages,
    user,
    workspaces,
    workspaceMembers,
  } = await import("../src/db/schema");

  console.log("→ بررسی کاربر مدیر…");
  let admin = (
    await db.select().from(user).where(eq(user.email, ADMIN_EMAIL)).limit(1)
  )[0];

  if (!admin) {
    const res = await auth.api.signUpEmail({
      body: { name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    admin = res.user as (typeof user.$inferSelect) & { id: string };
    console.log(`✓ کاربر مدیر ساخته شد: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    console.log("✓ کاربر مدیر از قبل وجود داشت");
  }

  let workspace = (
    await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, admin.id))
      .limit(1)
  )[0];

  if (!workspace) {
    [workspace] = await db
      .insert(workspaces)
      .values({
        name: WORKSPACE_NAME,
        slug: `default-${admin.id.slice(0, 6)}`,
        ownerId: admin.id,
      })
      .returning();

    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: admin.id,
      role: "owner",
    });
    console.log(`✓ ورک‌اسپیس ساخته شد: ${workspace.name}`);
  } else {
    console.log("✓ ورک‌اسپیس از قبل وجود داشت");
  }

  let pipeline = (
    await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.workspaceId, workspace.id))
      .limit(1)
  )[0];

  const stageDefs = [
    { name: "مشتری جدید", color: "#64748b", probability: "10" },
    { name: "در حال مذاکره", color: "#f59e0b", probability: "35" },
    { name: "پیشنهاد ارائه شد", color: "#3b82f6", probability: "60" },
    { name: "قرارداد نهایی", color: "#8b5cf6", probability: "85" },
    { name: "بسته شده", color: "#22c55e", probability: "100" },
  ];

  const stageIds: Record<string, string> = {};
  if (!pipeline) {
    const [newPipeline] = await db
      .insert(pipelines)
      .values({ name: "فانل فروش", workspaceId: workspace.id, isDefault: true })
      .returning();
    pipeline = newPipeline;
    const inserted = await db
      .insert(stages)
      .values(
        stageDefs.map((s, i) => ({
          pipelineId: newPipeline.id,
          name: s.name,
          orderIndex: String(i),
          color: s.color,
          winProbability: s.probability,
        }))
      )
      .returning();
    inserted.forEach((s, i) => {
      stageIds[String(i)] = s.id;
    });
    console.log("✓ فانل فروش و ۵ مرحله ساخته شد");
  } else {
    const existingStages = await db
      .select()
      .from(stages)
      .where(eq(stages.pipelineId, pipeline.id));
    existingStages.forEach((s, i) => {
      stageIds[String(i)] = s.id;
    });
    console.log("✓ فانل فروش از قبل وجود داشت");
  }

  const existingContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.workspaceId, workspace.id))
    .limit(1);
  if (existingContacts[0]) {
    console.log("✓ داده‌های نمونه از قبل وجود داشتند — اتمام");
    return;
  }

  const [company] = await db
    .insert(companies)
    .values({
      workspaceId: workspace.id,
      name: "شرکت فناوری پارس",
      domain: "pars-tech.com",
      industry: "فناوری اطلاعات",
      website: "https://pars-tech.com",
    })
    .returning();

  const sampleContacts = [
    {
      firstName: "علی",
      lastName: "محمدی",
      email: "ali@pars-tech.com",
      phone: "09121234567",
      source: "website" as const,
      lifecycleStage: "customer" as const,
      companyId: company.id,
    },
    {
      firstName: "سارا",
      lastName: "احمدی",
      email: "sara@example.com",
      phone: "09351112233",
      source: "referral" as const,
      lifecycleStage: "lead" as const,
    },
    {
      firstName: "رضا",
      lastName: "کریمی",
      email: "reza@example.com",
      phone: "09227778899",
      source: "social" as const,
      lifecycleStage: "prospect" as const,
    },
  ];

  const insertedContacts = await db
    .insert(contacts)
    .values(
      sampleContacts.map((c) => ({ ...c, workspaceId: workspace.id }))
    )
    .returning();

  const dealDefs = [
    {
      title: "قرارداد نگهداری وب‌سایت",
      amount: "25000000",
      contactIndex: 0,
      stageIndex: 3,
      status: "open" as const,
    },
    {
      title: "طراحی اپلیکیشن موبایل",
      amount: "48000000",
      contactIndex: 2,
      stageIndex: 1,
      status: "open" as const,
    },
    {
      title: "مشاوره دیجیتال مارکتینگ",
      amount: "12000000",
      contactIndex: 1,
      stageIndex: 2,
      status: "open" as const,
    },
    {
      title: "برندینگ و هویت بصری",
      amount: "30000000",
      contactIndex: 0,
      stageIndex: 4,
      status: "won" as const,
    },
  ];

  await db.insert(deals).values(
    dealDefs.map((d) => ({
      title: d.title,
      amount: d.amount,
      status: d.status,
      workspaceId: workspace.id,
      pipelineId: pipeline!.id,
      stageId: stageIds[String(d.stageIndex)] ?? "",
      contactId: insertedContacts[d.contactIndex]?.id,
      ownerId: admin.id,
      wonAt: d.status === "won" ? new Date() : null,
    }))
  );

  console.log("✓ ۱ شرکت، ۳ مخاطب و ۴ فرصت فروش نمونه ساخته شد");
  console.log("—— اتمام seed ——");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ خطا در seed:", err);
    process.exit(1);
  });
